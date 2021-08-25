import mysql from 'mysql2/promise';
import Config from './Cadence.Config';
import Logger from './Cadence.Logger';

export default class Db {

    private static _instance: Db = null;
    private logger: Logger = null;

    private _mysql: MySql = null;

    private constructor() {
        this.logger = new Logger('cadence-database');
    }

    public async init(): Promise<void> {
        this._mysql = await new MySql(
            Config.getInstance().getKeyOrDefault('MySqlHost', ''),
            Config.getInstance().getKeyOrDefault('MySqlPort', -1),
            Config.getInstance().getKeyOrDefault('MySqlDatabase', ''),
            Config.getInstance().getKeyOrDefault('MySqlUsername', ''),
            Config.getInstance().getKeyOrDefault('MySqlPassword', ''),
            this.logger
        ).init();   
    }

    public static getInstance(): Db {
        if (!this._instance) {
            this._instance = new Db();
        }

        return this._instance;
    }

}

class MySql {

    private _host: string = "";
    private _port: number = -1;
    private _db: string = "";
    private _user: string = "";
    private _pass: string = "";

    private _conn: mysql.Pool = null;
    private logger: Logger = null;

    constructor(host: string, port: number, db: string, user: string, pass: string, logger: Logger) {
        this._db = db;
        this._host = host;
        this._port = port;
        this._user = user;
        this._pass = pass;

        this.logger = logger;
    }

    public async init(): Promise<MySql> {
        this._conn = mysql.createPool({
            host: this._host,
            port: this._port,
            user: this._user,
            database: this._db,
            password: this._pass,
            waitForConnections: true,
            queueLimit: 10
        });

        try {
            await this._conn.execute('SELECT 1;');
            this.logger.log('successfully connected to ' +  this._host + '@' + this._user);
            return this;
        } catch (e) {
            this.logger.log('could not connect to mysql ' +  this._host + '@' + this._user);
            return null;
        }
    }
}