import { Guild, Message } from "discord.js";
import WebSocket from "ws";
import Cadence from "../Cadence";
import CadenceTrack from "../types/CadenceTrack.type";
import { RequestTrackPayload, RequestTrackPayloadResponse, SelfGetVoiceConnPayload, SelfGetVoiceConnPayloadResponse, SyncDashboardPayload, SyncDashboardPayloadResponse } from "../types/ws/payloads";
import Config from "./Cadence.Config";
import CadenceDiscord from "./Cadence.Discord";
import EmbedHelper from "./Cadence.Embed";
import CadenceLavalink from "./Cadence.Lavalink";
import Logger from "./Cadence.Logger";
import CadenceMemory from "./Cadence.Memory";

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
        this.logger.log('tx ' + JSON.stringify(packet));
        this.ws.send(JSON.stringify(packet));
    }

    public replyTo<T, U>(packet: WsPacket<T>, payload: U, identifier: string = ""): void {
        this.send({
            i: identifier || packet.i,
            x: packet.r,
            o: CadenceWebsockets.wsUser,
            r: "",
            p: payload
        });
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
            this.logger.log('rx ' + JSON.stringify(data));
            // xxx:xxx:xxx...:name
            // rpc:xxx:xxx:xxx...:name:numericId
            let realPacketId = WsHandler.isRpc(data.i) ? data.i.split(":").slice(-2)[0] : data.i.split(":").slice(-1)[0];
            switch (realPacketId) {
                case 'get_voice_conn':
                    WsHandler.GetVoiceConn(data);
                    break;
                case 'request_track':
                    WsHandler.RequestTrack(data);
                    break;
                case 'sync_dashboard_initial':
                case 'sync_dashboard':
                    WsHandler.SyncDashboard(data);
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

    public static isRpc(packetIdentifier: string): boolean {
        return packetIdentifier.split(":")[0] == "rpc";
    }

    public static GetVoiceConn(packet: WsPacket<SelfGetVoiceConnPayload>): void {
        const userId = packet.o.split(":")[1];
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
                    i: packet.i,
                    x: packet.r,
                    o: CadenceWebsockets.wsUser,
                    r: "",
                    p: payload
                });
            }).catch(e => {
                this.logger.log('get_voice_conn: could not fetch member (' + userId + ') ' + e);
                CadenceWebsockets.getInstance().send({
                    i: packet.i,
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
            this.logger.log('get_voice_conn: could not fetch guild (' + guildId + ') ' + e);
            CadenceWebsockets.getInstance().send({
                i: packet.i,
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

    public static async RequestTrack(packet: WsPacket<RequestTrackPayload>): Promise<void> {
        const userId = packet.o.split(":")[1];
        const guildId = packet.p.guildId;
        const voiceChannelId = packet.p.voiceChannelId;

        // should fetch from cache :)
        let guild = await CadenceDiscord.getInstance().Client.guilds.fetch(guildId);

        if (!guild) {
            CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, RequestTrackPayloadResponse>(packet, {
                error: {
                    code: 0,
                    message: "Invalid server"
                }
            });
            return;
        }

        // should fetch from cache :)
        const member = await guild.members.fetch(userId);

        if (!member) {
            CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, RequestTrackPayloadResponse>(packet, {
                error: {
                    code: 0,
                    message: "Invalid server"
                }
            });
            return;
        }

        let server = CadenceMemory.getInstance().getConnectedServer(guild.id);

        if (member.voice.channelId != voiceChannelId) {
            CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, RequestTrackPayloadResponse>(packet, {
                error: {
                    code: 0,
                    message: "Invalid server"
                }
            });
            return;
        }

        if (server && server.voiceChannelId != member.voice.channelId) {
            CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, RequestTrackPayloadResponse>(packet, {
                error: {
                    code: 1,
                    message: "I'm already being used in another voice channel"
                }
            });
            return;
        }

        if (!(await CadenceLavalink.getInstance().joinChannel(
            voiceChannelId,
            guildId,
            null,
            guild.shardId
        ))) {
            CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, RequestTrackPayloadResponse>(packet, {
                error: {
                    code: 1,
                    message: "I can't join the voice channel, do I have enough permissions?"
                }
            });
            return;
        }
        
        server = CadenceMemory.getInstance().getConnectedServer(guildId);
        const player = CadenceLavalink.getInstance().getPlayerByGuildId(guildId);

        const ct = new CadenceTrack(packet.p.item.base64, packet.p.item, userId);
        server.addToQueue(ct);

        if (!player.track) {
            if (await CadenceLavalink.getInstance().playNextSongInQueue(player)) {
                if (server.textChannel) {
                    const m = await server.textChannel.send({ embeds: [ EmbedHelper.np(ct, player.position) ], components: server._buildButtonComponents() }) as Message;
                    server.setMessageAsMusicPlayer(m);
                }
            }
        } else {
            server.textChannel?.send({ embeds: [ EmbedHelper.songBasic(packet.p.item, userId, "Added to Queue", true) ]});

            // if there was any current player controller
            // we update buttons (next/back changed?)
            server.updatePlayerControllerButtonsIfAny();
        }

        CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, RequestTrackPayloadResponse>(packet, {});
        return;
    }

    public static async SyncDashboard(packet: WsPacket<SyncDashboardPayload>): Promise<void> {
        const userId = packet.o.split(":")[1];
        const guildId = packet.p.guildId;
        
        const server = CadenceMemory.getInstance().getConnectedServer(guildId);

        if (!server) {
            CadenceWebsockets.getInstance().replyTo<SyncDashboardPayload, SyncDashboardPayloadResponse>(packet, {
                currentTrack: null,
                queue: []
            });
            return;
        }

        CadenceWebsockets.getInstance().replyTo<SyncDashboardPayload, SyncDashboardPayloadResponse>(packet, {
            currentTrack: server.getCurrentTrack(),
            queue: server.getQueue()
        });
    }
}