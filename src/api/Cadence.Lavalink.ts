import { Client } from 'discord.js';
import * as lavacord from 'lavacord';
import { LavalinkNode, Player } from 'lavacord';
import Config from './Cadence.Config';
import CadenceDiscord from './Cadence.Discord';
import Logger from './Cadence.Logger';
import CadenceMemory from './Cadence.Memory';

export default class CadenceLavalink {

    private static _instance: CadenceLavalink = null;
    private logger: Logger = null;

    private _manager: lavacord.Manager = null;
    private _client: Client = null;

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
            CadenceMemory.getInstance().setConnectedServer(guildId, channelId, p);
            return p;
        }

        return null;
    }

    private _getIdealNode(): LavalinkNode {
        return this._manager.idealNodes[0];
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