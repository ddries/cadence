import { Client } from 'discord.js';
import * as lavacord from 'lavacord';
import { LavalinkNode, Player, TrackData } from 'lavacord';
import Config from './Cadence.Config';
import CadenceDiscord from './Cadence.Discord';
import Logger from './Cadence.Logger';
import CadenceMemory from './Cadence.Memory';
import fetch from 'node-fetch';
import { URL } from 'url';
import * as TrackResult from '../types/TrackResult.type';
import { LavalinkResultTrackInfo } from '../types/TrackResult.type';

export default class CadenceLavalink {

    private static _instance: CadenceLavalink = null;
    private logger: Logger = null;

    private _manager: lavacord.Manager = null;
    private _client: Client = null;

    public async playTrack(trackId: string, guildId: string): Promise<boolean> {
        if (!CadenceMemory.getInstance().isServerConnected(guildId)) return false;

        const player: Player = CadenceMemory.getInstance().getConnectedServer(guildId)?.player;
        if (!player) return false;

        const result = player.play(trackId);
        return result;
    }

    public async resolveLinkIntoTracks(search: string): Promise<TrackResult.LavalinkResult> {
        const node: LavalinkNode = this._getIdealNode();

        const params = new URLSearchParams();
        params.append("identifier", search);

        const tracks: TrackResult.LavalinkResult = await this._lavalinkRequest("/loadtracks?" + params, node);
        return tracks;
    }

    public async resolveYoutubeIntoTracks(search: string): Promise<TrackResult.LavalinkResult> {
        const node: LavalinkNode = this._getIdealNode();

        const params = new URLSearchParams();
        params.append("identifier", "ytsearch:" + search);

        const tracks: TrackResult.LavalinkResult = await this._lavalinkRequest("/loadtracks?" + params, node);
        return tracks;
    }

    public async resolveTrackInfo(track: string): Promise<LavalinkResultTrackInfo> {
        const node = this._getIdealNode();
        return (lavacord.Rest.decode(node, track) as unknown) as LavalinkResultTrackInfo;
    }

    public async joinChannel(channelId: string, guildId: string, selfDeaf: boolean = true, selfMute: boolean = false): Promise<Player> {
        if (!this._manager) return null;
        const p = await this._manager.join({
            channel: channelId,
            guild: guildId,
            node: this._getIdealNode().id
        }, {
            selfdeaf: selfDeaf,
            selfmute: selfMute
        });

        if (p) {
            if (!CadenceMemory.getInstance().isServerConnected(guildId))
                CadenceMemory.getInstance().setConnectedServer(guildId, channelId, p);
            return p;
        }

        return null;
    }

    public async leaveChannel(guildId: string): Promise<boolean> {
        if (!this._manager) return false;

        const r = await this._manager.leave(guildId);
        if (r) CadenceMemory.getInstance().disconnectServer(guildId);

        return r;
    }

    public isValidUrl(url: string, restrictHttp: boolean = true): boolean {
        try {
            const u = new URL(url);
            if (restrictHttp && !(['http:', 'https:']).includes(u.protocol)) return false;
            return true;
        } catch (e) { return false; };
        
    }

    private _buildLavalinkUrl(node: LavalinkNode): string {
        return `http://${node.host}:${node.port}`;
    }

    private _getIdealNode(): LavalinkNode {
        return this._manager.idealNodes[0];
    }

    private async _lavalinkRequest(query: string, node: LavalinkNode): Promise<any> {
        return await (await fetch(
            this._buildLavalinkUrl(node) + query, 
            {
                headers: {
                    "Authorization": node.password
                }
            }
        )).json();
    }

    private constructor() {
        this.logger = new Logger('cadence-lavalink');
    }

    public async init(): Promise<void> {
        this._client = CadenceDiscord.getInstance().Client;

        this._manager = new lavacord.Manager(
            Config.getInstance().getKeyOrDefault("LavalinkNodes", []),
            {
                user: this._client.user.id,
                shards: this._client.options.shardCount || 1,
                send: async (packet: any): Promise<void> => {
                    if (this._client.guilds.cache) {
                        const guild = this._client.guilds.cache.get(packet.d.guild_id);
                        if (guild) return guild.shard.send(packet);
                    } else {
                        const guild = await this._client.guilds.fetch(packet.d.guild_id).catch(e => {
                            this.logger.log('could not fetch guild ' + packet.d.guild_id + ' in raw send function');
                        });
                        if (guild) {
                            //@ts-ignore
                            typeof this._client.ws.send === 'function' ? this._client.ws.send(packet) : guild.shard.send(packet);
                        }
                    }
                }
            }
        );

        this._manager.on('error', (error, node) => {
            this.logger.log('error on node ' + node.id + ' (' + node.host + ':' + node.port + '): ' + error);
        });

        this._manager.on('ready', node => {
            this.logger.log('connected successfully to node ' + node.id + ' (' + node.host + ':' + node.port + ')');
        });

        if (this._client.guilds.cache && typeof (this._client.ws as any).send === "undefined") {
            this._client.ws
                .on("VOICE_SERVER_UPDATE",this._manager.voiceServerUpdate.bind(this._manager))
                .on("VOICE_STATE_UPDATE", this._manager.voiceStateUpdate.bind(this._manager))
                .on("GUILD_CREATE", async data => {
                    for (const state of data.voice_states) await this._manager.voiceStateUpdate({ ...state, guild_id: data.id });
                });
        } else {
            // @ts-ignore
            this._client.client.on("raw", async (packet: DiscordPacket) => {
                switch (packet.t) {
                    case "VOICE_SERVER_UPDATE":
                        await this._manager.voiceServerUpdate(packet.d);
                        break;
                    case "VOICE_STATE_UPDATE":
                        await this._manager.voiceStateUpdate(packet.d);
                        break;
                    case "GUILD_CREATE":
                        for (const state of packet.d.voice_states) await this._manager.voiceStateUpdate({ ...state, guild_id: packet.d.id });
                        break;
                }
            });
        }

        this.logger.log('trying to connect to all lavalink nodes (' + this._manager.nodes.size + ')');
        await this._manager.connect().catch(e => {
            this.logger.log('could not connect to all nodes: ' + e);
        });
    }

    public static getInstance(): CadenceLavalink {
        if (!this._instance) {
            this._instance = new CadenceLavalink();
        }

        return this._instance;
    }

}