import { ButtonInteraction, GuildChannel, GuildMember, Message, MessageActionRow, MessageButton, TextBasedChannel } from "discord.js";
import { ShoukakuPlayer } from "shoukaku";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceRedis from "../api/Cadence.Redis";
import CadenceWebsockets from "../api/Cadence.Websockets";
import Cadence from "../Cadence";
import CadenceTrack from "./CadenceTrack.type";
import { RedisPlayer, RedisQueue } from "./RedisPlayer";
import { AddTrackPayload, PlayerStopPayload, TrackStartPayload } from "./WsPayloads";

export enum LoopType {
    NONE = 0,
    TRACK = 1,
    QUEUE = 2
};

export default class ConnectedServer {
    public player: ShoukakuPlayer;

    public guildId: string;
    public voiceChannelId: string;
    public textChannelId: string;
    public textChannel: TextBasedChannel;
    
    public nowPlayingMessage: { message: Message, collector: any };
    public musicPlayer: { message: Message, collector: any };

    public loop: LoopType = LoopType.NONE;
    public loopedTrack: CadenceTrack = null;
    public shuffle: boolean = false;

    public isNightcore: boolean = false;

    private _queue: CadenceTrack[] = [];
    private _queueIdx: number = -1;
    private _queueCount: number = 0;

    private _aloneInterval: NodeJS.Timer = null;

    constructor(player: ShoukakuPlayer, voiceChannelId: string, channel: TextBasedChannel, guildId: string) {
        this.player = player;
        this.voiceChannelId = voiceChannelId;
        this.guildId = guildId;
        this.textChannel = channel;
        this.musicPlayer = { message: null, collector: null };

        this._aloneInterval = setInterval(this._onAloneTimer.bind(this), 600_000); // 10 min

        let redisState: RedisPlayer = {
            pause: 0,
            shuffle: 0,
            loop: 0,
        };

        let redisQueue: RedisQueue = {
            count: 0,
            index: -1,
            items: []
        };
        
        CadenceRedis.getInstance().hSet('player_state:' + guildId, redisState);
        CadenceRedis.getInstance().hSet('player_state:queue:' + guildId, { ...redisQueue, items: JSON.stringify(redisQueue.items) });
    }

    public async setMessageAsMusicPlayer(message: Message, removeLastMessage: boolean = true, updateComponents: boolean = false): Promise<void> {
        const track = this.getCurrentTrack();
        if (!track) return;

        if (removeLastMessage) {
            this.musicPlayer.message?.delete();
            this.musicPlayer.collector?.stop('timeout');
        }

        if (updateComponents)
            await message.edit({ components: this._buildButtonComponents() });

        this.musicPlayer.message = message;

        const col = this.musicPlayer.message.createMessageComponentCollector({ });
        this.musicPlayer.collector = col;

        col.on('collect', async (interaction: ButtonInteraction) => {
            if ((interaction.member as GuildMember).voice?.channelId != this.voiceChannelId) {
                interaction.reply({ embeds: [ EmbedHelper.NOK("You have to be connected in the same voice channel as " + Cadence.BotName + "!") ], ephemeral: true });
                return;
            }

            // since we defer the update
            // we can do nothing at all
            await interaction.deferUpdate();

            switch (interaction.customId) {
                case 'resume-pause':
                    this.player.setPaused(!this.player.paused);
                    this.updatePlayerControllerButtonsIfAny();
                    
                    CadenceRedis.getInstance().hSet('player_state:' + this.guildId, { pause: this.player.paused });
                    break;
                case 'loop':
                    // no loop > loop track > loop queue > no loop ...
                    if (this.loop == LoopType.NONE) {
                        this.loop = LoopType.TRACK;
                        this.getCurrentTrack().looped = true;
                    } else if (this.loop == LoopType.TRACK) {
                        this.loop = LoopType.QUEUE;
                        this.getCurrentTrack().looped = false;
                        this.loopQueue(true);
                    } else {
                        this.loop = LoopType.NONE;
                        this.getCurrentTrack().looped = false;
                        this.loopQueue(false);
                    }
                    this.updatePlayerControllerButtonsIfAny();

                    CadenceRedis.getInstance().hSet('player_state:' + this.guildId, { loop: this.loop });
                    break;
                case 'next':
                    // if queue loop is enabled
                    // they can do whatever they want
                    if (this.getQueueLength() > 1 && this.loop != LoopType.TRACK) {
                        this.handleTrackEnded();

                        if (await CadenceLavalink.getInstance().playNextSongInQueue(this.player)) {
                            // const m = await interaction.editReply({ embeds: [ EmbedHelper.np(this.getCurrentTrack(), this.player.position) ]}) as Message;
                            const m = await (this.musicPlayer.message.channel as TextBasedChannel).send({ embeds: [ EmbedHelper.np(this.getCurrentTrack(), this.player.position) ], components: this._buildButtonComponents() });
                            this.setMessageAsMusicPlayer(m);
                        }
                    }
                    break;
                case 'back':
                    // if queue loop is enabled
                    // they can do whatever they want
                    if ((this.loop == LoopType.QUEUE && this.getQueueLength() > 1) || (this.getCurrentQueueIndex() > 0  && this.loop != LoopType.TRACK)) {
                        this.handleTrackEnded(false);

                        const song = this.jumpToSong(this.getCurrentQueueIndex() - 1);

                        if (await CadenceLavalink.getInstance().playTrack(song, this.player.connection.guildId)) {
                            const m = await (this.musicPlayer.message.channel as TextBasedChannel).send({ embeds: [ EmbedHelper.np(this.getCurrentTrack(), this.player.position) ], components: this._buildButtonComponents() });
                            this.setMessageAsMusicPlayer(m);
                        }
                    }
                    break;
                case 'stop':
                    CadenceLavalink.getInstance().leaveChannel(this.guildId);
                    break;
            }
        });

        col.on('end', (_interaction, reason: string) => {
            if (reason == 'timeout') {
                return;
            }

            this.musicPlayer.message?.edit({ components: [] });
        });
    }

    public updatePlayerControllerButtonsIfAny(): void {
        if (this.musicPlayer?.message) {
            this.musicPlayer.message?.edit({ components: this._buildButtonComponents() });
        }
    }

    public _buildButtonComponents(): MessageActionRow[] {
        const rowOptions = new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setStyle('PRIMARY')
                    .setEmoji(this.player.paused ? '▶️' : '⏸')
                    .setLabel(this.player.paused ? 'Resume' : 'Pause')
                    .setCustomId('resume-pause'),
                new MessageButton()
                    .setStyle('PRIMARY')
                    .setEmoji('🔁')
                    // no loop > loop track > loop queue > no loop ...
                    .setLabel(this.loop == LoopType.NONE ? 'Loop' : (this.loop == LoopType.TRACK ? 'Loop queue' : 'Disable loop'))
                    .setCustomId('loop')
        ]);

        // if queue loop is enabled
        // they can do whatever they want
        if ((this.loop == LoopType.QUEUE && this.getQueueLength() > 1) || (this.getCurrentQueueIndex() > 0  && this.loop != LoopType.TRACK)) {
            rowOptions.addComponents([
                new MessageButton()
                    .setStyle('SECONDARY')
                    .setEmoji('⏪')
                    .setLabel('Back')
                    .setCustomId('back')
            ]);
        } else {
            rowOptions.addComponents([
                new MessageButton()
                    .setStyle('SECONDARY')
                    .setEmoji('⏪')
                    .setLabel('Back')
                    .setCustomId('back')
                    .setDisabled(true)
            ]);
        }

        // if queue loop is enabled
        // they can do whatever they want
        if ((this.loop == LoopType.QUEUE && this.getQueueLength() > 1) || (this.getQueueLength() > 1 && this.loop != LoopType.TRACK)) {
            rowOptions.addComponents([
                new MessageButton()
                    .setStyle('SECONDARY')
                    .setEmoji('⏩')
                    .setLabel('Next')
                    .setCustomId('next')
            ]);
        } else {
            rowOptions.addComponents([
                new MessageButton()
                    .setStyle('SECONDARY')
                    .setEmoji('⏩')
                    .setLabel('Next')
                    .setCustomId('next')
                    .setDisabled(true)
            ]);
        }

        rowOptions.addComponents([
            new MessageButton()
                .setStyle('DANGER')
                .setEmoji('⏹')
                .setLabel('Stop')
                .setCustomId('stop'),
        ]);

        const rowOptions2 = new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setStyle('LINK')
                    .setURL('https://cadence.bot')
                    .setDisabled(true)
                    .setLabel('🌐 Web player')
            ])

        return [ rowOptions/*, rowOptions2*/ ];
    };

    public getClone(): ConnectedServer {
        const c = new ConnectedServer(null, this.voiceChannelId, this.textChannel, this.guildId);

        c.textChannelId = this.textChannelId;
        c.nowPlayingMessage = this.nowPlayingMessage;

        c.loop = Object.assign({}, this.loop);
        c.loopedTrack = Object.assign({}, this.loopedTrack);
        c.shuffle = this.shuffle;

        c._queue = Object.assign({}, this._queue);
        c._queueIdx = this._queueIdx;
        c._queueCount = this._queueCount;
        
        c._aloneInterval = Object.assign({}, this._aloneInterval);        

        return c;
    }

    private _onAloneTimer(): void {
        const guild = CadenceDiscord.getInstance().Client.guilds.cache.get(this.guildId);

        if (!guild) {
            return;
        }

        const voiceChannel = guild.channels.cache.get(this.voiceChannelId) as GuildChannel;

        if (!voiceChannel) {
            return;
        }

        const memberCount: number = [...voiceChannel.members.keys()].length;
        
        if (memberCount <= 0 || (memberCount == 1 && voiceChannel.members.first()?.id == CadenceDiscord.getInstance().Client.user.id)) {
            CadenceLavalink.getInstance().leaveChannel(this.guildId);

            this.textChannel?.send({ embeds: [ EmbedHelper.Info("I left the voice channel, I was playing music alone :(") ]});

            clearInterval(this._aloneInterval);
            this._aloneInterval = null;
        }
    }

    public getCurrentTrack(): CadenceTrack {
        if (this._queue.length <= 0) return null;
        return this._queueIdx < 0 ? this._queue[0] : this._queue[this._queueIdx];
    }

    public getCurrentQueueIndex(): number {
        return this._queueIdx < 0 ? 0 : this._queueIdx;
    }

    public handleTrackEnded(shouldCheckLeaveCondition: boolean = true): void {
        const t = this.getCurrentTrack();
        if (!t) return;

        t.beingPlayed = false;

        if (this.loop == LoopType.NONE)
            this._queueCount--;

        if (this.loop == LoopType.QUEUE)
            this._queueCount = this._queue.length;

        if (shouldCheckLeaveCondition && this.loop == LoopType.NONE && this._queueCount <= 0) {
            if (this._queue.length > 1)
                this.textChannel?.send({ embeds: [ EmbedHelper.Info('The queue has ended!\nTo enable auto-restart and 24/7, use `/loop queue or player buttons.') ]});

            this.clearQueue();
            CadenceLavalink.getInstance().leaveChannel(this.guildId);
        }
    }

    public async handleTrackStart(): Promise<void> {
        CadenceWebsockets.getInstance().send<TrackStartPayload>({
            i: 'track_start',
            x: 'channel:' + this.voiceChannelId,
            p: {
                trackIndex: this._queueIdx
            }
        });
    }

    public async handleDisconnect(): Promise<void> {
        if (this._aloneInterval) {
            clearInterval(this._aloneInterval);
            this._aloneInterval = null;
        }

        if (this.musicPlayer) {
            this.musicPlayer.message?.edit({ components: [] });
            this.musicPlayer.collector?.stop();
        }

        CadenceWebsockets.getInstance().send<PlayerStopPayload>({
            i: 'player_stop',
            x: 'channel:' + this.voiceChannelId,
            p: {}
        });
        
        CadenceRedis.getInstance().del('player_state:' + this.guildId);
        CadenceRedis.getInstance().del('player_state:queue:' + this.guildId);
    }

    public loopQueue(status: boolean): void {
        if (status) {
            this.loop = LoopType.QUEUE;
        } else {
            this.loop = LoopType.NONE;
        }

        CadenceRedis.getInstance().hSet('player_state:' + this.guildId, { loop: this.loop });
    }

    public getSongAtIndex(index: number): CadenceTrack {
        if (index < 0) return null;
        if (index >= this._queue.length) return null;
        return this._queue[index];
    }

    public addToQueue(track: CadenceTrack): void {
        this._queue.push(track);
        this._queueCount++;

        CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { count: this._queueCount, items: JSON.stringify(this._queue) });
        CadenceWebsockets.getInstance().send<AddTrackPayload>({
            i: 'track_add',
            x: 'channel:' + this.voiceChannelId,
            p: {
                track
            }
        });
    }

    public removeFromQueue(track: CadenceTrack): void {
        const i = this._queue.indexOf(track);
        if (i >= 0) this.removeFromQueueIdx(i);
    }

    public removeFromQueueIdx(idx: number): void {
        this._queue.splice(idx, 1);
        this._queueCount--;

        // if the removed idx is before current index we should update current
        if (idx < this._queueIdx) {
            this._queueIdx--;
            CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { index: this._queueIdx });
        }

        CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { count: this._queueCount });
    }

    public getNextSong(): CadenceTrack {
        if (this.loop == LoopType.TRACK) {
            return this._queue[this._queueIdx];
        }

        if (this.shuffle) {
            let n = Math.floor(Math.random() * this._queue.length);
            while (n == this._queueIdx) n = Math.floor(Math.random() * this._queue.length);

            this._queueIdx = n;
        } else {
            ++this._queueIdx;
            if (this._queueIdx >= this._queue.length) this._queueIdx = 0;
        }

        CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { index: this._queueIdx });
        return this._queue[this._queueIdx];
    }

    public jumpToSong(idx: number): CadenceTrack {
        switch (this.loop) {
            case LoopType.TRACK:
                this.loop = LoopType.NONE;
                this.getCurrentTrack().looped = false;

                CadenceRedis.getInstance().hSet('player_state:' + this.guildId, { loop: this.loop });
            case LoopType.QUEUE:
            default:
                this._queueIdx = idx;

                // if we dont have shuffle enabled
                // we move forward in the queue
                if (!this.shuffle) {
                    this._queueCount = this._queue.length - idx;
                    CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { count: this._queueCount });
                }

                CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { index: this._queueIdx });
                return this._queue[this._queueIdx];
        }
    }

    public moveSong(idxFrom: number, idxTo: number): void {
        const temp = this._queue[idxFrom];

        if (idxFrom < idxTo) {
            for (let i = idxFrom; i < idxTo; i++) {
                this._queue[i] = this._queue[i + 1];
            }
        } else {
            for (let i = idxFrom; i > idxTo; i--) {
                this._queue[i] = this._queue[i - 1];
            }
        }

        this._queue[idxTo] = temp;

        CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { index: this._queueIdx , items: JSON.stringify(this._queue) });
    }

    public swapSong(idxFrom: number, idxTo: number): void {
        const temp = this._queue[idxFrom];
        this._queue[idxFrom] = this._queue[idxTo];
        this._queue[idxTo] = temp;

        CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { items: JSON.stringify(this._queue) });
    }

    public toggleNightcore(): void {
        this.isNightcore = !this.isNightcore;

        if (this.isNightcore) {
            this.player.setTimescale({
                speed: 1.18,
                pitch: 1.3,
                rate: 1
            });
        } else {
            this.player.setTimescale({
                speed: 1,
                pitch: 1,
                rate: 1
            });
        }
    }

    public getQueue(): CadenceTrack[] {
        return this._queue;
    }

    public isQueueEmpty(): boolean {
        return this._queue.length <= 0;
    }

    public getQueueLength(): number {
        return this._queueCount;
    }

    public shuffleQueue(): void {
        this.shuffle = !this.shuffle;
        CadenceRedis.getInstance().hSet('player_state:' + this.guildId, { shuffle: this.shuffle });
    }

    public clearQueue(): void {
        this._queueIdx = -1;
        this._queue.length = 0;
        this._queueCount = this._queue.length;

        CadenceRedis.getInstance().hSet('player_state:queue:' + this.guildId, { index: -1, count: 0, items: JSON.stringify([]) });
    }

    // end-user index (it's real queue index + 1)
    public checkIndex(idx: number): boolean {
        return idx > 0 && idx <= this._queue.length;
    }
}