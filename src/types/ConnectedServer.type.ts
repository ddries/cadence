import { Message, TextBasedChannel } from "discord.js";
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
    public nowPlayingMessage: Message;

    public loop: LoopType = LoopType.NONE;
    public loopedTrack: CadenceTrack = null;
    public shuffle: boolean = false;

    public isNightcore: boolean = false;

    private _queue: CadenceTrack[] = [];
    private _queueIdx: number = -1;
    private _queueCount: number = 0;

    private _dcTimer: NodeJS.Timeout = null;
    private _aloneInterval: NodeJS.Timer = null;

    constructor(player: ShoukakuPlayer, voiceChannelId: string, channel: TextBasedChannel, guildId: string) {
        this.player = player;
        this.voiceChannelId = voiceChannelId;
        this.guildId = guildId;
        this.textChannel = channel;
        this.nowPlayingMessage = null;
    }

    // private _onAloneTimer(): void {
    //     const guild = CadenceDiscord.getInstance().Client.guilds.cache.get(this.guildId);

    //     if (!guild) {
    //         return;
    //     }

    //     const voiceChannel = guild.channels.cache.get(this.voiceChannelId) as GuildChannel;

    //     if (!voiceChannel) {
    //         return;
    //     }

    //     const memberCount: number = [...voiceChannel.members.keys()].length;
        
    //     if (memberCount <= 0 || (memberCount == 1 && voiceChannel.members.first()?.id == CadenceDiscord.getInstance().Client.user.id)) {
    //         CadenceLavalink.getInstance().leaveChannel(this.guildId);

    //         this.textChannel.send({ embeds: [ EmbedHelper.Info("I left the voice channel, I was playing music alone :(") ]});

    //         clearInterval(this._aloneInterval);
    //         this._aloneInterval = null;
    //     }
    // }

    // public stopDisconnectTimer(): void {
    //     if (!this._dcTimer) return;
    //     clearTimeout(this._dcTimer);
    //     this._dcTimer = null;
    // }

    // public resetDisconnectTimer(): void {
    //     if (this._dcTimer) this.stopDisconnectTimer();
    //     this._dcTimer = setTimeout(this._onDisconnectTimer.bind(this), 10*60*1000);
    // }

    // private _onDisconnectTimer(): void {
    //     const t = this.textChannel;
    //     CadenceLavalink.getInstance().leaveChannel(this.guildId).then(b => {
    //         if (b) {
    //             t.send({ embeds: [ EmbedHelper.Info("I left due to inactivity. Enable loop (`" + CadenceDiscord.getInstance().getServerPrefix(this.guildId) + "loop queue`) for 24/7 features.") ]});
    //         }
    //     });
    // }

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

            // setTimeout(() => {
            //     if (this._queueCount <= 0)
            //         this._aloneInterval = setInterval(this._onAloneTimer, 5e3);
            // }, 5e3);

            // if (this.loop == LoopType.NONE)
            //     this.resetDisconnectTimer();
        }
    }

    public async handleTrackStart(): Promise<void> {
        // this.stopDisconnectTimer();
        // if (this._aloneInterval) {
        //     clearInterval(this._aloneInterval);
        //     this._aloneInterval = null;
        // }
    }

    public async handleDisconnect(): Promise<void> {
        // if (this._aloneInterval) {
        //     clearInterval(this._aloneInterval);
        //     this._aloneInterval = null;
        // }

        // if (this._dcTimer) {
        //     clearTimeout(this._dcTimer);
        //     this._dcTimer = null;
        // }
    }

    public loopQueue(status: boolean): void {
        if (status) {
            this.loop = LoopType.QUEUE;
            // this.stopDisconnectTimer();
        } else {
            this.loop = LoopType.NONE;
        }
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
                this._queueCount = this._queue.length - idx;
                return this._queue[this._queueIdx];
        }
    }

    public moveSong(idxFrom: number, idxTo: number = -1): void {
        if (idxTo == -1) {
            idxTo = this._queueIdx + 1;
        }

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

    public shuffleQueue(): void {
        this.shuffle = !this.shuffle;
    }

    public clearQueue(): void {
        this._queueIdx = -1;
        this._queue.length = 0;
        this._queueCount = this._queue.length;
    }

    public checkIndex(idx: number): boolean {
        return idx > 0 && idx < this._queue.length;
    }
}