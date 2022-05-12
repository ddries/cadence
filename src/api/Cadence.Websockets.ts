import WebSocket, { RawData, WebSocketServer } from "ws";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";

export default class CadenceWebsockets {

    private static instance: CadenceWebsockets = null;
    private logger: Logger = null;

    private protocolVersion: string = "1.0";

    private host: string = "";
    private path: string = "";
    private port: number = 0;
    private auth: string = "";

    private wss: WebSocketServer = null;

    // guild id -> ws connection
    private connections: Map<string, WsConnection> = null;

    public addConnection(guildId: string, ws: WsConnection): void {
        if (this.connections.has(guildId)) return;
        this.connections.set(guildId, ws);
    }

    public getConnection(guildId: string): WsConnection {
        if (!this.connections.has(guildId)) return null;
        return this.connections.get(guildId);
    }

    public removeConnection(guildId: string): void {
        if (!this.connections.has(guildId)) return;
        this.connections.delete(guildId);
    }

    public hasConnection(guildId: string): boolean {
        return this.getConnection(guildId) != null;
    }

    public getProto(): string {
        return this.protocolVersion;
    }

    public handleMessage(data: RawData, isBinary: boolean): void {
        if (isBinary) {
            console.log(data);
        }
    }

    private constructor() {
        this.logger = new Logger('cadence-ws');

        this.path = Config.getInstance().getKeyOrDefault('WsPath', '');
        this.host = Config.getInstance().getKeyOrDefault('WsHost', '');
        this.port = Config.getInstance().getKeyOrDefault('WsPort', 0);
        this.auth = Config.getInstance().getKeyOrDefault('WsPass', '');

        this.connections = new Map<string, WsConnection>();
    }

    public async init(): Promise<void> {
        this.wss = new WebSocketServer({
            host: this.host,
            port: this.port,
            path: this.path,
            clientTracking: false,
        }, () => {
            this.logger.log('ws server started');
        });

        this.wss.on('connection', (ws, request) => {
            // const auth: string = request.headers['Authorization'] as string;
            
            // if (auth != this.auth) {
            //     ws.close();
            //     return;
            // }

            // const guildId: string = request.headers['Guild-Id'] as string;
            const guildId: string = "asd";

            if (!guildId) {
                ws.close();
                return;
            }

            // if (this.hasConnection(guildId)) {
            //     console.log("2");
            //     // console.log(this.getConnection(guildId));
            //     ws.close();
            //     return;
            // }

            const conn = new WsConnection(ws,
                {
                    "Address": request.socket.address()
                }
            );

            this.addConnection(guildId, conn);
            const m = WsHelper.HelloMessage();

            // conn.rawSocket.send(m, {
            //     binary: true,
            // });
            console.log('sending');
            console.log(m);
            conn.rawSocket.send(m);

            conn.rawSocket.on("message", this.handleMessage.bind(this));
        });
    }

    public static getInstance(): CadenceWebsockets {
        if (!this.instance) {
            this.instance = new CadenceWebsockets();
        }

        return this.instance;
    }

}

// ********************************************************
//  All Websocket messages are defined here encoded to binary for optimization
// ********************************************************

export class WsHelper {

    public static HelloMessage(): ArrayBuffer {
        const b = new Uint8Array(3);
        b[0] = 0xF;
        const v = (): { major: number, minor: number } => {
            const v = CadenceWebsockets.getInstance().getProto();
            const major = parseInt(v.split('.')[0], 10);
            const minor = parseInt(v.split('.')[1], 10);
            return { major, minor };
        }
        b[1] = v().major;
        b[2] = v().minor;
        return b;
    }

}

export class WsConnection {
    public rawSocket: WebSocket = null;
    public metadata: { [key: string]: any };
    
    public constructor(socket: WebSocket, metadata: { [key: string]: any }) {
        this.rawSocket = socket;
        this.metadata = metadata;
    }
}