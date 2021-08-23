import Config from './api/Cadence.Config';
import Logger from './api/Cadence.Logger';

export default class Cadence {

    private static _instance: Cadence = null;
    private logger: Logger = null;

    public static Debug: boolean = true;
    public static Version: string = "0.0.0";

    public static BaseDir: string = __dirname;
    public static BaseScript: string = __filename;

    private constructor() {
        this.logger = new Logger('cadence-core');
    }

    public async init(): Promise<void> {
        this.logger.log('started cadence bot')
        
        await Config.getInstance().init();

        Cadence.Debug = Config.getInstance().getKeyOrDefault('debug', true);
        Cadence.Version = Config.getInstance().getKeyOrDefault('version', '0.0.0');


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