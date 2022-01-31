import Logger from "./Cadence.Logger";
import mongoose, { mongo } from 'mongoose';
import Config from "./Cadence.Config";
import Cadence from "../Cadence";
import { GuildModel, IGuild } from "./models/GuildSchema";
import { ISong, SongModel } from "./models/SongSchema";

export default class CadenceDb {

    private static _instance: CadenceDb = null;
    private _logger: Logger = null;

    public async createServer(serverOptions: IGuild): Promise<void> {
        const doc = new GuildModel(serverOptions);
        await doc?.save();
    }

    public async createOrUpdateServer(server: IGuild): Promise<void> {
        await GuildModel.findOneAndUpdate({ guildId: server.guildId }, server, { upsert: true });
    }

    public async getAllServers(): Promise<Array<IGuild>> {
        return await GuildModel.find();
    }

    public async pushNewSong(song: ISong): Promise<void> {
        const doc = new SongModel(song);
        await doc?.save();
    }

    public async init(): Promise<void> {
        this._logger = new Logger('cadence-db');

        const mongoHost = Config.getInstance().getKeyOrDefault('MongoHost', '');
        const mongoPort = Config.getInstance().getKeyOrDefault('MongoPort', 27017);
        const mongoDb = Config.getInstance().getKeyOrDefault('MongoDB', '');
        const mongoUser = Config.getInstance().getKeyOrDefault('MongoUser', '');
        const mongoPass = Config.getInstance().getKeyOrDefault('MongoPass', '');

        await mongoose.connect(`mongodb://${mongoHost}:${mongoPort}/${mongoDb}`, {
            appName: 'cadence/' + Cadence.Version,
            authSource: mongoDb,
            auth: {
                username: mongoUser,
                password: mongoPass
            }
        });

        this._logger.log('sucessfully connected to mongodb ' + mongoUser + '@' + mongoHost);
    }

    public static getInstance(): CadenceDb {
        if (!this._instance) {
            this._instance = new CadenceDb();
        }

        return this._instance;
    }

}