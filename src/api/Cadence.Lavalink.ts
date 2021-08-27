import { Client } from 'discord.js';
import * as lavacord from 'lavacord';
import Config from './Cadence.Config';
import CadenceDiscord from './Cadence.Discord';
import Logger from './Cadence.Logger';

export default class CadenceLavalink {

    private static _instance: CadenceLavalink = null;
    private logger: Logger = null;

    private _manager: lavacord.Manager = null;
    private _client: Client = null;

    private constructor() {
        this.logger = new Logger('cadence-lavalink');
    }

    public async init(): Promise<void> {
        this._client = CadenceDiscord.getInstance().Client;

        this._manager = new lavacord.Manager(
            Config.getInstance().getKeyOrDefault("LavalinkNodes", []),
            {
                user: this._client.user.id,
                // send: (packet: any): void => {

                // }
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