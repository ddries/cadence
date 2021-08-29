import Config from './api/Cadence.Config';
import Db from './api/Cadence.Db';
import CadenceDiscord from './api/Cadence.Discord';
import CadenceLavalink from './api/Cadence.Lavalink';
import Logger from './api/Cadence.Logger';
import CadenceMemory from './api/Cadence.Memory';

export default class Cadence {

    private static _instance: Cadence = null;
    private logger: Logger = null;

    public static Debug: boolean = true;
    public static Version: string = "0.0.0";

    public static BotName: string = "";
    public static DefaultPrefix: string = "";

    public static BaseDir: string = __dirname;
    public static BaseScript: string = __filename;

    public static SongsPerEmbed: number = 0;

    private constructor() {
        this.logger = new Logger('cadence-core');
    }

    public async init(): Promise<void> {
        this.logger.log('started cadence preload')
        
        await Config.getInstance().init();

        Cadence.Debug = Config.getInstance().getKeyOrDefault('Debug', true);
        Cadence.Version = Config.getInstance().getKeyOrDefault('Version', '0.0.0');

        Cadence.BotName = Config.getInstance().getKeyOrDefault('BotName', '');
        Cadence.DefaultPrefix = Config.getInstance().getKeyOrDefault('BotDefaultPrefix', '');
        
        Cadence.SongsPerEmbed = Config.getInstance().getKeyOrDefault('SongsPerEmbed', 10);

        await Db.getInstance().init();
        await CadenceMemory.getInstance().init();

        this.logger.log('starting discord module cadence ' + Cadence.Version + ", debug " + Cadence.Debug.toString());
        await CadenceDiscord.getInstance().init();

        await CadenceLavalink.getInstance().init();

    }

    public static getInstance(): Cadence {
        if (!this._instance) {
            this._instance = new Cadence();
        }

        return this._instance;
    }

}


;(async () => {
    await Cadence.getInstance().init();
})();