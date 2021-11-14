import mysql from 'mysql2/promise';
import Config from './Cadence.Config';
import Logger from './Cadence.Logger';
import v8 from 'v8';

export default class Db {

    private static _instance: Db = null;
    private logger: Logger = null;

    private _mysql: MySql = null;

    public async savePlaylist(guildId: string, playlist: string[], name: string): Promise<number> {
        const token = v8.serialize(playlist).toString('hex');
        const id = await this._mysql.queryGetInsertId('INSERT INTO playlist(name, token, guild_id) VALUES(?, ?, ?)', [
            name,
            token,
            guildId
        ]);
        return id;
    }

    public async loadPlaylist(id: string): Promise<any[]> {
        const result = await this._mysql.queryGetResult('SELECT token FROM playlist WHERE id LIKE ?', [id]);
        let playlist: string[] = [];
        if (result.length > 0) {
            playlist = v8.deserialize(Buffer.from(result[0].token, "hex"));
        }
        return playlist;
    }

    public async getAllPlaylists(guildId: string): Promise<any[]> {
        return await this._mysql.queryGetResult('SELECT id, name FROM playlist WHERE guild_id = ?', [guildId]);
    }

    public async getAllPrefixes(): Promise<any> {
        return this._mysql.queryGetResult('SELECT * FROM prefix;');
    }

    public async setServerPrefix(guildId: string, prefix: string): Promise<void> {
        const r = await this._mysql.queryGetResult('SELECT * FROM prefix WHERE guild_id = ?;', [guildId]);
        if (r.length > 0) {
            this._mysql.query("UPDATE prefix SET prefix = ? WHERE guild_id = ?", [prefix, guildId]);
        } else {
            this._mysql.query("INSERT INTO prefix(guild_id, prefix) VALUES(?, ?);", [guildId, prefix]);
        }
    }

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

    public query(query: string, params: any[] | void): Promise<any[]> {
		return this._conn.execute(query, params);
	}

    public async queryGetInsertId(query: string, params: any[] | void): Promise<number> {
		const [ insertId ] = await this.query(query, params);
		return insertId["insertId"];
	}

	public async queryGetResult(query: string, params: any[] | void): Promise<any[]> {
		const [ rows ] = await this.query(query, params);
		return rows;
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