import WebSocket from "ws";
import Cadence from "../Cadence";
import { SelfGetVoiceConnPayload, SelfGetVoiceConnPayloadResponse } from "../types/ws/payloads";
import Config from "./Cadence.Config";
import CadenceDiscord from "./Cadence.Discord";
import Logger from "./Cadence.Logger";

type WsPacket<T> = {
    i: string,
    x: string,
    r: string;
    o: string;
    p: T;
}

export default class CadenceWebsockets {

    private static instance: CadenceWebsockets = null;
    private logger: Logger = null;

    public static wsUser: string = "user:0";

    private uri: string = "";
    private auth: string = "";

    private ws: WebSocket = null;

    public send<T>(packet: WsPacket<T>): void {
        this.ws.send(JSON.stringify(packet));
    }

    private constructor() {
        this.logger = new Logger('cadence-ws');

        this.uri = Config.getInstance().getKeyOrDefault('WsUri', '');
        this.auth = Config.getInstance().getKeyOrDefault('WsPass', '');
    }

    public async init(): Promise<void> {
        this.ws = new WebSocket(this.uri + "?token=" + this.auth);

        this.ws.on('open', () => {
            this.logger.log('connected to websocket server');
        });

        this.ws.on('message', rawData => {
            const data: WsPacket<any> = JSON.parse(rawData.toString());
            switch (data.i) {
                case 'self:get_voice_conn':
                    WsHandler.selfGetVoiceConn(data);
                    break;
            }
        });
    }

    public static getInstance(): CadenceWebsockets {
        if (!this.instance) {
            this.instance = new CadenceWebsockets();
        }

        return this.instance;
    }
}

class WsHandler {
    private static logger: Logger = new Logger('cadence-ws-handler');

    public static selfGetVoiceConn(packet: WsPacket<SelfGetVoiceConnPayload>): void {
        const userId = packet.o.split(":")[1]; // since it's self
        const guildId = packet.p.guildId;

        if (!userId || !guildId) return;

        CadenceDiscord.getInstance().Client.guilds.fetch(guildId).then(guild => {
            guild.members.fetch(userId).then(member => {
                let payload: SelfGetVoiceConnPayloadResponse = {
                    id: "",
                    name: "",
                    listeners : 0
                };

                if (member.voice.channelId) {
                    payload.id = member.voice.channelId;
                    payload.name = member.voice.channel.name;
                    payload.listeners = member.voice.channel.members.size;
                }

                CadenceWebsockets.getInstance().send({
                    i: 'self:get_voice_conn',
                    x: packet.r,
                    o: CadenceWebsockets.wsUser,
                    r: "",
                    p: payload
                });
            }).catch(e => {
                this.logger.log('self_get_voice_conn: could not fetch member (' + userId + ') ' + e);
                CadenceWebsockets.getInstance().send({
                    i: 'self:get_voice_conn',
                    x: packet.r,
                    o: CadenceWebsockets.wsUser,
                    r: "",
                    p: {
                        error: {
                            code: 0,
                            message: 'I don\'t have permissions to access this server',
                        }
                    }
                });
            });
        }).catch(e => {
            this.logger.log('self_get_voice_conn: could not fetch guild (' + guildId + ') ' + e);
            CadenceWebsockets.getInstance().send({
                i: 'self:get_voice_conn',
                x: packet.r,
                o: CadenceWebsockets.wsUser,
                r: "",
                p: {
                    error: {
                        code: 0,
                        message: 'I don\'t have permissions to access this server',
                    }
                }
            });
        })
    }
}