import { Client, Intents } from "discord.js";
import Cadence from "../Cadence";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";

export default class CadenceDiscord {

    private static _instance: CadenceDiscord = null;
    private logger: Logger = null;

    public Client: Client = null;

    private async OnReady(): Promise<void> {
        this.logger.log('successfully connected to discord as ' + this.Client.user.tag);
        this.Client.user.setActivity({
            type: "LISTENING",
            name: Config.getInstance().getKeyOrDefault('BotDefaultPrefix', '')
        });
        
        if (this.Client.user.username != Cadence.BotName) {
            const _old = this.Client.user.username;
            this.Client.user.setUsername(Cadence.BotName);
            this.logger.log('changed bot name to predefined ' + Cadence.BotName + ' (old ' + _old + ')')
        }
    }

    private constructor() {
        this.logger = new Logger('cadence-discord');
    }

    public async init(): Promise<void> {
        this.Client = new Client({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES
            ]
        });

        this.Client.once('ready', this.OnReady.bind(this));

        this.logger.log('logging to discord network');
        await this.Client.login(Config.getInstance().getKeyOrDefault('BotToken', '')).catch(e => {
            this.logger.log('could not connect to discord network ' + e);
            process.exit(1);
        });
    }

    public static getInstance(): CadenceDiscord {
        if (!this._instance) {
            this._instance = new CadenceDiscord();
        }

        return this._instance;
    }

}