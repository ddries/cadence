import { TextBasedChannels } from "discord.js";
import { Player } from "lavaclient";
import ConnectedServer from "../types/ConnectedServer.type";
import Logger from "./Cadence.Logger";

export default class CadenceMemory {

    private static _instance: CadenceMemory = null;
    private logger: Logger = null;

    private _connectedServers: Map<string, ConnectedServer> = null;

    public setConnectedServer(guildId: string, channelId: string, channel: TextBasedChannels, player: Player): void {
        if (this._connectedServers.has(guildId))
            this._connectedServers.delete(guildId);

        this._connectedServers.set(guildId, new ConnectedServer(player, channelId, channel, guildId));
    }

    public getConnectedServer(guildId: string): ConnectedServer {
        if (!this._connectedServers.has(guildId)) return null;

        return this._connectedServers.get(guildId);
    }

    public isServerConnected(guildId: string): boolean {
        return this._connectedServers.has(guildId);
    }

    public disconnectServer(guildId: string): void {
        if (this._connectedServers.has(guildId))
            this._connectedServers.delete(guildId);
    }

    private constructor() {
        this.logger = new Logger('cadence-memory');
    }

    public async init(): Promise<void> {
        this._connectedServers = new Map<string, ConnectedServer>();
    }

    public static getInstance(): CadenceMemory {
        if (!this._instance) {
            this._instance = new CadenceMemory();
        }

        return this._instance;
    }

}