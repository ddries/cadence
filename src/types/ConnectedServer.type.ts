import { ButtonInteraction, GuildChannel, GuildMember, Message, MessageActionRow, MessageButton, TextBasedChannel } from "discord.js";
import { ShoukakuPlayer } from "shoukaku";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import Cadence from "../Cadence";
import CadenceTrack from "./CadenceTrack.type";

export enum LoopType {
    NONE,
    TRACK,
    QUEUE
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
                            // const m = await interaction.editReply({ embeds: [ EmbedHelper.np(song, this.player.position) ]}) as Message;
                            const m = await (this.musicPlayer.message.channel as TextBasedChannel).send({ embeds: [ EmbedHelper.np(this.getCurrentTrack(), this.player.position) ], components: this._buildButtonComponents() });
                            this.setMessageAsMusicPlayer(m);
                        }
                        // new song, send again
                        // this.sendPlayerController();
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

    // public async sendPlayerController(removeLastMessage: boolean = true): Promise<void> {
    //     const song = this.getCurrentTrack();
    //     let reply;

    //     // if the previous message is the last one
    //     // we can simply edit the embed
    //     // otherwise we (delete?) the previous message and send the new one
    //     if (this.nowPlayingMessage.message && this.textChannel.lastMessageId == this.nowPlayingMessage.message.id) {
    //         this.nowPlayingMessage.message.edit({ embeds: [ EmbedHelper.np(song, this.player.position) ], components: this._buildButtonComponents() });
    //         this.nowPlayingMessage.collector?.stop('timeout');

    //         reply = this.nowPlayingMessage.message;
    //     } else if (this.nowPlayingMessage.message && this.textChannel.lastMessageId != this.nowPlayingMessage.message.id) {
    //         if (!removeLastMessage) {
    //             this.nowPlayingMessage.message.edit({ components: [] });
    //         } else {
    //             this.nowPlayingMessage.message?.delete();
    //         }
    //         this.nowPlayingMessage.collector?.stop('timeout');
    //     }

    //     if (!reply) {
    //         reply = await this.textChannel.send({ embeds: [ EmbedHelper.np(song, this.player.position) ], components: this._buildButtonComponents() });
    //     }

    //     const col = reply.createMessageComponentCollector({
    //         // time: song.trackInfo.length - this.player.position + 250
    //     });
        
    //     this.nowPlayingMessage.message = reply;
    //     this.nowPlayingMessage.collector = col;

    //     col.on('collect', async (interaction: ButtonInteraction) => {
    //         if ((interaction.member as GuildMember).voice?.channelId != this.voiceChannelId) {
    //             interaction.reply({ embeds: [ EmbedHelper.NOK("You have to be connected in the same voice channel as " + Cadence.BotName + "!") ], ephemeral: true });
    //             return;
    //         }

    //         // since we defer the update
    //         // we can do nothing at all
    //         await interaction.deferUpdate();

    //         switch (interaction.customId) {
    //             case 'resume-pause':
    //                 this.player.setPaused(!this.player.paused);
    //                 this.updatePlayerControllerButtonsIfAny();
    //                 break;
    //             case 'loop':
    //                 // no loop > loop track > loop queue > no loop ...
    //                 if (this.loop == LoopType.NONE) {
    //                     this.loop = LoopType.TRACK;
    //                     this.getCurrentTrack().looped = true;
    //                 } else if (this.loop == LoopType.TRACK) {
    //                     this.loop = LoopType.QUEUE;
    //                     this.getCurrentTrack().looped = false;
    //                     this.loopQueue(true);
    //                 } else {
    //                     this.loop = LoopType.NONE;
    //                     this.getCurrentTrack().looped = false;
    //                     this.loopQueue(false);
    //                 }
    //                 this.updatePlayerControllerButtonsIfAny();
    //                 break;
    //             case 'next':
    //                 // if queue loop is enabled
    //                 // they can do whatever they want
    //                 if (this.loop == LoopType.QUEUE || (this.getQueueLength() > 1 && this.loop != LoopType.TRACK)) {
    //                     this.handleTrackEnded();
    //                     CadenceLavalink.getInstance().playNextSongInQueue(this.player);
    //                 }
    //                 break;
    //             case 'back':
    //                 // if queue loop is enabled
    //                 // they can do whatever they want
    //                 if (this.loop == LoopType.QUEUE || (this.getCurrentQueueIndex() > 0  && this.loop != LoopType.TRACK)) {
    //                     this.handleTrackEnded(false);

    //                     const song = this.jumpToSong(this.getCurrentQueueIndex() - 1);

    //                     CadenceLavalink.getInstance().playTrack(song, this.player.connection.guildId);
    //                     // new song, send again
    //                     this.sendPlayerController();
    //                 }
    //                 break;
    //             case 'stop':
    //                 CadenceLavalink.getInstance().leaveChannel(this.guildId);
    //                 break;
    //         }
    //     });

    //     col.on('end', (interaction, reason: string) => {
    //         if (reason == 'timeout') {
    //             return;
    //         }

    //         if (reply) {
    //             reply.edit({ components: [] });
    //         }
    //     });
    // }

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

            this.textChannel.send({ embeds: [ EmbedHelper.Info("I left the voice channel, I was playing music alone :(") ]});

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

    public async handleTrackEnded(shouldCheckLeaveCondition: boolean = true): Promise<void> {
        const t = this.getCurrentTrack();
        if (!t) return;

        t.beingPlayed = false;

        if (this.loop == LoopType.NONE)
            this._queueCount--;

        if (this.loop == LoopType.QUEUE)
            this._queueCount = this._queue.length;

        if (shouldCheckLeaveCondition && this.loop == LoopType.NONE && this._queueCount <= 0) {
            if (this._queue.length > 1)
                this.textChannel.send({ embeds: [ EmbedHelper.Info('The queue has ended!\nTo enable auto-restart and 24/7, use `' + CadenceDiscord.getInstance().getServerPrefix(this.guildId) + 'loop queue`.') ]});

            this.clearQueue();
            CadenceLavalink.getInstance().leaveChannel(this.guildId);
        }
    }

    public async handleTrackStart(): Promise<void> {

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
    }

    public loopQueue(status: boolean): void {
        if (status) {
            this.loop = LoopType.QUEUE;
        } else {
            this.loop = LoopType.NONE;
        }
    }

    public getSongAtIndex(index: number): CadenceTrack {
        if (index < 0) return null;
        if (index >= this._queue.length) return null;
        return this._queue[index];
    }

    public addToQueue(track: CadenceTrack): void {
        this._queue.push(track);
        this._queueCount++;
    }

    public removeFromQueue(track: CadenceTrack): void {
        const i = this._queue.indexOf(track);
        if (i >= 0) this.removeFromQueueIdx(i);
    }

    public removeFromQueueIdx(idx: number): void {
        this._queue.splice(idx, 1);
        this._queueCount--;

        // if the removed idx is before current index we should update current
        if (idx < this._queueIdx)
            this._queueIdx--;
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

        return this._queue[this._queueIdx];
    }

    public jumpToSong(idx: number): CadenceTrack {
        switch (this.loop) {
            case LoopType.TRACK:
                this.loop = LoopType.NONE;
                this.getCurrentTrack().looped = false;
            case LoopType.QUEUE:
            default:
                this._queueIdx = idx;

                // if we dont have shuffle enabled
                // we move forward in the queue
                if (!this.shuffle)
                    this._queueCount = this._queue.length - idx;

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

        if (idxFrom == this._queueIdx) {
            this._queueIdx = idxTo;
        } else if (idxTo == this._queueIdx) {
            this._queueIdx = idxFrom;
        }

        this._queue[idxTo] = temp;
    }

    public swapSong(idxFrom: number, idxTo: number): void {
        const temp = this._queue[idxFrom];
        this._queue[idxFrom] = this._queue[idxTo];
        this._queue[idxTo] = temp;
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
    }

    public clearQueue(): void {
        this._queueIdx = -1;
        this._queue.length = 0;
        this._queueCount = this._queue.length;
    }

    // end-user index (it's real queue index + 1)
    public checkIndex(idx: number): boolean {
        return idx > 0 && idx <= this._queue.length;
    }
}