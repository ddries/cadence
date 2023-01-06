import { createClient, RedisClientType } from "redis";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";

export default class CadenceRedis {

    private static instance: CadenceRedis = null;
    private logger: Logger = null;

    private address: string = null;
    private auth: string = null;
    private database: number = 0;

    private client: RedisClientType = null;

    public set(key: string, value: string, duration: number = -1): void {
        if (!this.client) return;
        if (duration > 0) {
            this.client.set(key, value, { EX: duration});
        }
        this.client.set(key, value);
    }

    public async get(key: string): Promise<string> {
        if (!this.client) return "";
        return await this.client.get(key);
    }

    public hSet(key: string, value: { [key: string]: any }): void {
        if (!this.client) null;
        value = this.redisify(value);
        this.client.hSet(key, value);
    }

    public async hGet(key: string, field: string): Promise<string> {
        if (!this.client) return "";
        return await this.client.hGet(key, field);
    }

    public async hGetAll(key: string): Promise<{ [key: string]: string }> {
        if (!this.client) return {};
        return await this.client.hGetAll(key);
    }

    public hDel(key: string, field: string): void {
        if (!this.client) return;
        this.client.hDel(key, field);
    }

    public del(key: string): void {
        if (!this.client) return;
        this.client.del(key);
    }

    private redisify(object: { [key: string]: any }): { [key: string]: string | number } {
        const result: { [key: string]: string | number } = {};

        for (const k in object) {
            const val = object[k];
            if (typeof val == 'string' || typeof val == 'number') {
                result[k] = val;
                continue;
            }

            if (typeof val == 'boolean') {
                result[k] = val ? 1 : 0;
                continue;
            }

            if (typeof val == 'object') {
                this.logger.log('redisify: omitting parse of object value \'' + k + '\'');
            }
        }

        return result;
    }

    private constructor() {
        this.logger = new Logger('cadence-redis');

        this.address = Config.getInstance().getKeyOrDefault('RedisHost', '');
        this.auth = Config.getInstance().getKeyOrDefault('RedisAuth', '');
        this.database = Config.getInstance().getKeyOrDefault('RedisDb', 0);
    }

    public async init(): Promise<void> {
        const port = parseInt(this.address.split(":")[1]);
        const host = this.address.split(":")[0];

        this.client = createClient({
            socket: {
                host,
                port
            },

            password: this.auth,
            database: this.database
        });

        this.logger.log('connecting to redis');
        await this.client.connect();
        this.logger.log('successfully connected to redis');
    }

    public static getInstance(): CadenceRedis {
        if (!this.instance) {
            this.instance = new CadenceRedis();
        }

        return this.instance;
    }
}