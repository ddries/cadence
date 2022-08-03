import Config from './api/Cadence.Config';
import CadenceDiscord from './api/Cadence.Discord';
import CadenceLavalink from './api/Cadence.Lavalink';
import Logger from './api/Cadence.Logger';
import CadenceMemory from './api/Cadence.Memory';
import CadenceSpotify from './api/Cadence.Spotify';
import path from 'path';
import fs from 'fs';
import CadenceWebsockets from './api/Cadence.Websockets';

export default class Cadence {

    private static _instance: Cadence = null;
    private logger: Logger = null;

    public static Debug: boolean = true;
    public static Version: string = "0.0.0";
    public static IsMainInstance: boolean = true;

    public static BotName: string = "";
    public static DefaultPrefix: string = "";

    public static BaseDir: string = __dirname;
    public static BaseScript: string = __filename;
    public static BaseLogDir: string = path.join(this.BaseDir, 'logs');

    public static NowPlayingEnabled: boolean = true;
    public static SongsPerEmbed: number = 0;

    private constructor() {
        this.logger = new Logger('cadence-core', 'core.log');
    }

    public async init(): Promise<void> {
        this.logger.log('started cadence preload', true)
        
        await Config.getInstance().init();

        fs.access(Cadence.BaseLogDir, e => {
            if (e) {
                fs.mkdir(Cadence.BaseLogDir, { recursive: true }, () => { });
                this.logger.log('created log directory: ' + Cadence.BaseLogDir);
            }
        });

        Cadence.Debug = Config.getInstance().getKeyOrDefault('Debug', true);
        Cadence.Version = Config.getInstance().getKeyOrDefault('Version', '0.0.0');
        Cadence.IsMainInstance = Config.getInstance().getKeyOrDefault('IsMainInstance', true);

        Cadence.BotName = Config.getInstance().getKeyOrDefault('BotName', '');
        Cadence.DefaultPrefix = Config.getInstance().getKeyOrDefault('BotDefaultPrefix', '');
        
        Cadence.SongsPerEmbed = Config.getInstance().getKeyOrDefault('SongsPerEmbed', 10);
        Cadence.NowPlayingEnabled = Config.getInstance().getKeyOrDefault('NowPlayingEnabled', true);
        
        console.log();
        console.log();
        const _sing = `\u001b[33m
                 _                         
  ___  __ _   __| |  ___  _ __    ___  ___ 
 / __|/ _\` | / _\` | / _ \\| '_ \\  / __|/ _ \\
| (__| (_| || (_| ||  __/| | | || (__|  __/
 \\___|\\__,_| \\__,_| \\___||_| |_| \\___|\\___|
                                           
 \u001b[0m`;

        console.log(_sing);
        console.log(".......... \u001b[32mVersion:\u001b[0m " + Cadence.Version);
        console.log(".......... \u001b[32mEnvironment:\u001b[0m " + (Cadence.Debug ? "Development" : "Production"));
        console.log(".......... \u001b[32mBoot date UTC:\u001b[0m " + (new Date().toUTCString()));
        console.log(".......... \u001b[32mBot name:\u001b[0m " + Cadence.BotName);
        console.log(".......... \u001b[32mRunning on:\u001b[0m nodejs " + process.version);
        console.log(".......... \u001b[32mHost Architecture:\u001b[0m " + process.arch);
        console.log();console.log();

        await CadenceMemory.getInstance().init();
        
        await CadenceWebsockets.getInstance().init();

        this.logger.log('starting discord module cadence ' + Cadence.Version + ", debug " + Cadence.Debug.toString());
        await CadenceDiscord.getInstance().init();

        await CadenceSpotify.getInstance().init();
        await CadenceLavalink.getInstance().init();

        if (!Cadence.Debug)
            CadenceDiscord.getInstance().sendStatus("Cadence logged in.");
    }

    public static getInstance(): Cadence {
        if (!this._instance) {
            this._instance = new Cadence();
        }

        return this._instance;
    }

}

if (require.main === module) {
    ;(async () => {
        await Cadence.getInstance().init();
    })();
}