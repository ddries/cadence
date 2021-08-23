import { Client, Intents } from "discord.js";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";

export default class CadenceDiscord {

    private static _instance: CadenceDiscord = null;
    private logger: Logger = null;

    public Client: Client = null;

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

        this.logger.log('logging to discord network');
        await this.Client.login(Config.getInstance().getKeyOrDefault('Token', ''));
    }

    public static getInstance(): CadenceDiscord {
        if (!this._instance) {
            this._instance = new CadenceDiscord();
        }

        return this._instance;
    }

}