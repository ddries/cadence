import { TextBasedChannels } from "discord.js";
import { Player } from "lavaclient";
import Cadence from "../Cadence";
import CadenceTrack from "./CadenceTrack.type";

export default class ConnectedServer {
    public player: Player;
    public guildId: string;
    public voiceChannelId: string;
    public textChannelId: string;
    public textChannel: TextBasedChannels;

    private _queue: CadenceTrack[];

    constructor(player: Player, voiceChannelId: string, channel: TextBasedChannels, guildId: string) {
        this.player = player;
        this.voiceChannelId = voiceChannelId;
        this.guildId = guildId;
        this.textChannel = channel;

        this._queue = [];
    }

    public getCurrentTrack(): CadenceTrack {
        return this._queue[0];
    }

    public addToQueue(track: CadenceTrack): void {
        this._queue.push(track);
    }

    public removeFromQueue(track: CadenceTrack): void {
        const i = this._queue.indexOf(track);
        if (i >= 0) this._queue.splice(i, 1);
    }

    public removeFromQueueIdx(idx: number): void {
        this._queue.splice(idx, 1);
    }

    public jumpNextSong(): CadenceTrack {
        return this._queue.shift();
    }

    public jumpToSong(idx: number): CadenceTrack {
        const s = this._queue.at(idx);
        if (s) this._queue.splice(0, idx+1);
        return s;
    }

    public getQueue(): CadenceTrack[] {
        return this._queue;
    }

    public isQueueEmpty(): boolean {
        return this._queue.length <= 0;
    }

    public shuffleQueue(): void {
        var currentIndex = this._queue.length,  randomIndex;
      
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
        

            [this._queue[currentIndex], this._queue[randomIndex]] = [this._queue[randomIndex], this._queue[currentIndex]];
        }
    }

    public clearQueue(): void {
        this._queue.length = 0;
    }
}