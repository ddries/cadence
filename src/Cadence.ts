import Config from './api/Cadence.Config';
import CadenceDiscord from './api/Cadence.Discord';
import Logger from './api/Cadence.Logger';

export default class Cadence {

    private static _instance: Cadence = null;
    private logger: Logger = null;

    public static Debug: boolean = true;
    public static Version: string = "0.0.0";
    public static BotName: string = "";

    public static BaseDir: string = __dirname;
    public static BaseScript: string = __filename;

    private constructor() {
        this.logger = new Logger('cadence-core');
    }

    public async init(): Promise<void> {
        this.logger.log('started cadence preload')
        
        await Config.getInstance().init();

        Cadence.Debug = Config.getInstance().getKeyOrDefault('Debug', true);
        Cadence.Version = Config.getInstance().getKeyOrDefault('Version', '0.0.0');
        Cadence.BotName = Config.getInstance().getKeyOrDefault('BotName', 'Default Name');

        this.logger.log('starting cadence ' + Cadence.Version + ", debug " + Cadence.Debug.toString());

        await CadenceDiscord.getInstance().init();

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