import { Message } from "discord.js";
import WebSocket from "ws";
import CadenceTrack from "../types/CadenceTrack.type";
import { WsErrorCodes } from "../types/WsErrors";
import { ErrorPacket, PlayerUpdatePayload, RequestPausePayload, RequestPausePayloadResponse, RequestTrackPayload, SelfGetVoiceConnPayload, SelfGetVoiceConnPayloadResponse } from "../types/WsPayloads";
import Config from "./Cadence.Config";
import CadenceDiscord from "./Cadence.Discord";
import EmbedHelper from "./Cadence.Embed";
import CadenceLavalink from "./Cadence.Lavalink";
import Logger from "./Cadence.Logger";
import CadenceMemory from "./Cadence.Memory";

type WsPacket<T> = {
    i: string,
    x: string,
    r?: string;
    o?: string;
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
        if (!this.ws) return;
        
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
        try {
            this.ws = new WebSocket(this.uri + "?token=" + this.auth);

            this.ws.on('error', error => {
                this.logger.log('error ' + error);
            });

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
                    case 'request_pause':
                        WsHandler.RequestPause(data);
                        break;
                }
            });
        } catch (e) {
            this.logger.log('could not connect to websocket server ' + e);
        }
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
                    guildId: "",
                    voiceChannelId: "",
                    voiceChannelName: "",
                };

                if (member.voice.channelId) {
                    payload.voiceChannelId = member.voice.channelId;
                    payload.voiceChannelName = member.voice.channel.name;
                    payload.guildId = guildId;
                }

                CadenceWebsockets.getInstance().replyTo(packet, payload);
            }).catch(e => {
                this.logger.log('get_voice_conn: could not fetch member (' + userId + ') ' + e);
                CadenceWebsockets.getInstance().replyTo(packet, {
                    error: {
                        code: 0,
                        message: 'I don\'t have permissions to access this server'
                    }
                });
            });
        }).catch(e => {
            this.logger.log('get_voice_conn: could not fetch guild (' + guildId + ') ' + e);
            CadenceWebsockets.getInstance().replyTo(packet, {
                error: {
                    code: 0,
                    message: 'I don\'t have permissions to access this server'
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
            CadenceWebsockets.getInstance().send<ErrorPacket>({
                i: 'error',
                x: packet.o,
                p: {
                    error: {
                        code: WsErrorCodes.ERROR_ON_TRACK_REQUEST,
                        message: "Invalid server"
                    }
                }
            });
            // CadenceWebsockets.getInstance().replyTo<RequestTrackPayload, ErrorPacket>(packet, {
            //     error: {
            //         code: 0,
            //         message: "Invalid server"
            //     }
            // });
            return;
        }

        // should fetch from cache :)
        const member = await guild.members.fetch(userId);

        if (!member) {
            CadenceWebsockets.getInstance().send<ErrorPacket>({
                i: 'error',
                x: packet.o,
                p: {
                    error: {
                        code: WsErrorCodes.ERROR_ON_TRACK_REQUEST,
                        message: "Invalid server"
                    }
                }
            });
            return;
        }

        let server = CadenceMemory.getInstance().getConnectedServer(guild.id);

        if (member.voice.channelId != voiceChannelId) {
            CadenceWebsockets.getInstance().send<ErrorPacket>({
                i: 'error',
                x: packet.o,
                p: {
                    error: {
                        code: WsErrorCodes.ERROR_ON_TRACK_REQUEST,
                        message: "Invalid server"
                    }
                }
            });
            return;
        }

        if (server && server.voiceChannelId != member.voice.channelId) {
            CadenceWebsockets.getInstance().send<ErrorPacket>({
                i: 'error',
                x: packet.o,
                p: {
                    error: {
                        code: WsErrorCodes.ERROR_ON_TRACK_REQUEST,
                        message: "I'm already being used in another voice channel"
                    }
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
            CadenceWebsockets.getInstance().send<ErrorPacket>({
                i: 'error',
                x: packet.o,
                p: {
                    error: {
                        code: WsErrorCodes.ERROR_ON_TRACK_REQUEST,
                        message: "I can't join the voice channel, do I have enough permissions?"
                    }
                }
            });
            return;
        }
        
        server = CadenceMemory.getInstance().getConnectedServer(guildId);
        const player = CadenceLavalink.getInstance().getPlayerByGuildId(guildId);

        const ct: CadenceTrack = {
            track: packet.p.track.track,
            info: packet.p.track.info,
            addedBy: { id: userId, name: member.user.username },

            beingPlayed: false,
            isSpotify: false,
            looped: false
        };

        server.addToQueue(ct);

        if (!player.track) {
            if (await CadenceLavalink.getInstance().playNextSongInQueue(player)) {
                if (server.textChannel) {
                    const m = await server.textChannel.send({ embeds: [ EmbedHelper.np(ct, player.position) ], components: server._buildButtonComponents() }) as Message;
                    server.setMessageAsMusicPlayer(m);
                }
            }
        } else {
            server.textChannel?.send({ embeds: [ EmbedHelper.songBasic(packet.p.track.info, userId, "Added to Queue", true) ]});

            // if there was any current player controller
            // we update buttons (next/back changed?)
            server.updatePlayerControllerButtonsIfAny();
        }
    }

    public static async RequestPause(packet: WsPacket<RequestPausePayload>): Promise<void> {
        const guildId = packet.p.guildId;
        const server = CadenceMemory.getInstance().getConnectedServer(guildId);

        if (!server) {
            CadenceWebsockets.getInstance().send<ErrorPacket>({
                i: 'error',
                x: packet.o,
                p: {
                    error: {
                        code: WsErrorCodes.ERROR_ON_REQUEST_PAUSE,
                        message: "Invalid server"
                    }
                }
            });
            return;
        }

        server.player.setPaused(!server.player.paused);

        CadenceWebsockets.getInstance().send<PlayerUpdatePayload>({
            i: 'player_update',
            x: 'channel:' + server.voiceChannelId,
            p: {
                pause: server.player.paused
            }
        });
        server.updatePlayerControllerButtonsIfAny();
    }
}