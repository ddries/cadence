import { TextBasedChannels } from "discord.js";
import { Player } from "lavaclient";
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
    public player: Player;
    public guildId: string;
    public voiceChannelId: string;
    public textChannelId: string;
    public textChannel: TextBasedChannels;

    public loop: LoopType = LoopType.NONE;
    public loopedTrack: CadenceTrack = null;
    public shuffle: boolean = false;

    private _queue: CadenceTrack[] = [];
    private _queueIdx: number = -1;
    private _queueCount: number = 0;

    private _dcTimer: number = null;

    constructor(player: Player, voiceChannelId: string, channel: TextBasedChannels, guildId: string) {
        this.player = player;
        this.voiceChannelId = voiceChannelId;
        this.guildId = guildId;
        this.textChannel = channel;
    }

    public getCurrentTrack(): CadenceTrack {
        if (this._queue.length <= 0) return null;
        return this._queueIdx < 0 ? this._queue[0] : this._queue[this._queueIdx];
    }

    public getCurrentQueueIndex(): number {
        return this._queueIdx < 0 ? 0 : this._queueIdx;
    }

    public async handleTrackEnded(): Promise<void> {
        const t = this.getCurrentTrack();
        if (!t) return;

        // if (this.loop == LoopType.NONE)
        //     this.removeFromQueue(t);

        t.beingPlayed = false;

        if (this.loop == LoopType.NONE)
            this._queueCount--;

        if (this.loop == LoopType.QUEUE)
            this._queueCount = this._queue.length;

        console.log("C: " + this._queueCount);

        if (this.loop == LoopType.NONE && this._queueCount <= 0) {
            if (this._queue.length > 1)
                this.textChannel.send({ embeds: [ EmbedHelper.Info('The queue has ended!\nTo enable auto-restart and 24/7, use `' + CadenceDiscord.getInstance().getServerPrefix(this.guildId) + 'loop queue`.') ]});

            this.clearQueue();
        }

        // if (this.loop == LoopType.NONE && this._queueIdx == this._queue.length - 1) {
        //     this.clearQueue();
        //     if (this._queue.length > 1)
        //         this.textChannel.send({ embeds: [ EmbedHelper.Info('The queue has ended!\nTo enable auto-restart and 24/7, use `' + CadenceDiscord.getInstance().getServerPrefix(this.guildId) + 'loop queue`.') ]});
        // }
    }

    public loopQueue(status: boolean): void {
        if (status) {
            this.loop = LoopType.QUEUE;
            // this._queueIdx = 0;
        } else {
            this.loop = LoopType.NONE;
            // this._queueIdx = -1;
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
            // case LoopType.QUEUE:
            //     this._queueIdx = idx;
            //     return this._queue[this._queueIdx];
            case LoopType.TRACK:
                this.loop = LoopType.NONE;
                this.getCurrentTrack().looped = false;
            case LoopType.QUEUE:
            default:
                this._queueIdx = idx;
                return this._queue[this._queueIdx];
                // const s = this._queue.at(idx);
                // if (s) this._queue.splice(0, idx);
                // return s;
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
        // var currentIndex = this._queue.length,  randomIndex;
      
        // while (currentIndex != 0) {
        //     randomIndex = Math.floor(Math.random() * currentIndex);
        //     currentIndex--;
        

        //     [this._queue[currentIndex], this._queue[randomIndex]] = [this._queue[randomIndex], this._queue[currentIndex]];
        // }
    }

    public clearQueue(): void {
        this._queueIdx = -1;
        this._queue.length = 0;
        this._queueCount = 0;
    }
}