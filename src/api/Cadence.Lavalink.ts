import { Client, MessageEmbed, TextBasedChannels, TextChannel, Message } from 'discord.js';
import { Cluster, Node, Player, REST } from "lavaclient";
import Config from './Cadence.Config';
import CadenceDiscord from './Cadence.Discord';
import Logger from './Cadence.Logger';
import CadenceMemory from './Cadence.Memory';
import fetch from 'node-fetch';
import { URL } from 'url';
import * as TrackResult from '../types/TrackResult.type';
import { LavalinkResultTrackInfo } from '../types/TrackResult.type';
import EmbedHelper, { EmbedColor } from './Cadence.Embed';
import { LoopType } from '../types/ConnectedServer.type';
import CadenceTrack from '../types/CadenceTrack.type';

export default class CadenceLavalink {

    private static _instance: CadenceLavalink = null;
    private logger: Logger = null;

    private _cluster: Cluster = null;
    private _client: Client = null;
    public async playTrack(track: CadenceTrack, guildId: string): Promise<boolean> {
        if (!CadenceMemory.getInstance().isServerConnected(guildId)) return false;

        const player = this.getPlayerByGuildId(guildId);
        if (!player) return false;

        this.logger.log('requested to play track ' + track.base64 + ' in ' + guildId);

        if (player.playing) await player.stop();
        const result = await player.play(track.base64);

        if (result) {
            track.beingPlayed = true;
            return true;
        }
        
        return false;
    }

    public getPlayerByGuildId(guildId: string): Player {
        if (!this._cluster.getNode(guildId)?.players.has(guildId)) return null;
        return this._cluster.getNode(guildId).players.get(guildId);
    }

    public async resolveLinkIntoTracks(search: string): Promise<TrackResult.LavalinkResult> {
        const node = this._getIdealNode();

        this.logger.log('requested to resolve link ' + search);

        const params = new URLSearchParams();
        params.append("identifier", search);

        const tracks: TrackResult.LavalinkResult = await this._lavalinkRequest("/loadtracks?" + params, node);
        return tracks;
    }

    public async resolveYoutubeIntoTracks(search: string): Promise<TrackResult.LavalinkResult> {
        const node = this._getIdealNode();

        this.logger.log('requested to resolve youtube search ' + search);

        const params = new URLSearchParams();
        params.append("identifier", "ytsearch:" + search);

        const tracks: TrackResult.LavalinkResult = await this._lavalinkRequest("/loadtracks?" + params, node);
        return tracks;
    }

    public async resolveTrackInfo(track: string): Promise<LavalinkResultTrackInfo> {
        const node = this._getIdealNode();

        this.logger.log('requested to resolve track ' + track);

        const params = new URLSearchParams();
        params.append("track", track);

        const trackInfo: LavalinkResultTrackInfo = await this._lavalinkRequest("/decodetrack?" + params, node);
        return trackInfo;
    }

    public async playNextSongInQueue(player: Player, notify: boolean = true): Promise<boolean> {
        const s = CadenceMemory.getInstance().getConnectedServer(player.guildId);
        if (!s) return false;

        const t = s.getNextSong();
        if (!t) {
            if (s.getQueue().length <= 0) {
                await player.stop();
            }
            return false;
        }

        if (await this.playTrack(t, player.guildId)) {
            if (notify) {
                const lastMessage = s.textChannel.lastMessage;
                let m: Message = null;

                if (lastMessage.id != s.nowPlayingMessage?.id) {
                    m = await s.textChannel.send({ embeds: [ EmbedHelper.songBasic(t.trackInfo, t.requestedById, "Now Playing!") ]});
                } else {
                    m = await lastMessage.edit({ embeds: [ EmbedHelper.songBasic(t.trackInfo, t.requestedById, "Now Playing!") ]});
                }

                s.nowPlayingMessage = m;
            }

            return true;
        }

        return false;
    }

    public async joinChannel(channelId: string, guildId: string, channel: TextBasedChannels, selfDeaf: boolean = true, selfMute: boolean = false): Promise<Player> {
        if (!this._cluster) return null;

        this.logger.log('requested to join channel ' + channelId + ' in guild ' + guildId);

        const p = await this._cluster.createPlayer(guildId);
        
        if (!p?.connected) {
            CadenceMemory.getInstance().setConnectedServer(guildId, channelId, channel, p);

            p.connect(channelId, {
                deafened: selfDeaf,
                muted: selfMute
            });
    
            p.on('trackStart', async (track: string) => {
                const s = CadenceMemory.getInstance().getConnectedServer(guildId);
                if (!s) return;

                s.handleTrackStart();
            });

            p.on('trackEnd', async (track, reason) => {
                if (reason != "STOPPED" && reason != "REPLACED") {
                    this.logger.log('track ended in ' + guildId + ' playing next song in queue');

                    const s = CadenceMemory.getInstance().getConnectedServer(guildId);
                    if (!s) return;

                    s.handleTrackEnded();
                    await CadenceLavalink.getInstance().playNextSongInQueue(p, s.loop == LoopType.NONE);
                }
            });

            p.on('channelLeave', async (left: string) => {
                const s = CadenceMemory.getInstance().getConnectedServer(guildId);
                if (!s) return;

                this.leaveChannel(s.guildId);
            });

            p.on('channelMove', async (from: string, to: string) => {
                if (p.channelId) {
                    await p.pause();
                    await this._wait(1000);
                    await p.resume();

                    const s = CadenceMemory.getInstance().getConnectedServer(guildId);
                    if (!s) return;
                    
                    s.voiceChannelId = to;
                }
            });

            p.on('trackException', async (track, error) => {
                this.logger.log('trackException on track ' + track + ': ' + error);
                
                const s = CadenceMemory.getInstance().getConnectedServer(guildId);
                if (!s) return;

                s.handleTrackEnded();
                await CadenceLavalink.getInstance().playNextSongInQueue(p, s.loop == LoopType.NONE);
            });

            p.on('trackStuck', async (track: string, ms: number) => {
                this.logger.log('trackStuck on track ' + track);

                const s = CadenceMemory.getInstance().getConnectedServer(guildId);
                if (!s) return;

                s.handleTrackEnded();
                await CadenceLavalink.getInstance().playNextSongInQueue(p, s.loop == LoopType.NONE);
            });
        }

        if (p) return p;
        return null;
    }

    public async leaveChannel(guildId: string): Promise<boolean> {
        if (!this._cluster) return false;

        this.logger.log('requested to leave channel in guild ' + guildId);

        const player = this.getPlayerByGuildId(guildId);
        if (!player) return false;


        await player.disconnect().destroy();
        await this._cluster.destroyPlayer(guildId);
        CadenceMemory.getInstance().disconnectServer(guildId);
        return true;

        // if (player.disconnect && await player.destroy() && await this._cluster.destroyPlayer(guildId)) {
        //     CadenceMemory.getInstance().disconnectServer(guildId);
        //     return true;
        // }

        return true;
    }

    public isValidUrl(url: string, restrictHttp: boolean = true): boolean {
        try {
            const u = new URL(url);
            if (restrictHttp && !(['http:', 'https:']).includes(u.protocol)) return false;
            return true;
        } catch (e) { return false; };
        
    }

    private _buildLavalinkUrl(node: Node): string {
        return `http://${node.conn.info.host}:${node.conn.info.port}`;
    }

    private _getIdealNode(): Node {
        return this._cluster.idealNodes[0];
    }

    private async _lavalinkRequest(query: string, node: Node): Promise<any> {
        return await (await fetch(
            this._buildLavalinkUrl(node) + query, 
            {
                headers: {
                    "Authorization": node.conn.info.password
                }
            }
        )).json();
    }

    private _wait(ms: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(resolve, ms);
        });
    }

    private constructor() {
        this.logger = new Logger('cadence-lavalink');
    }

    public async init(): Promise<void> {
        this._client = CadenceDiscord.getInstance().Client;

        this._cluster = new Cluster({
            nodes: Config.getInstance().getKeyOrDefault("LavalinkNodes", []),
            user: this._client.user.id,
            sendGatewayPayload: async (id: string, packet: any): Promise<void> => {
                if (this._client.guilds.cache) {
                    const guild = this._client.guilds.cache.get(packet.d.guild_id);
                    if (guild) return guild.shard.send(packet);
                } else {
                    const guild = await this._client.guilds.fetch(packet.d.guild_id).catch(e => {
                        this.logger.log('could not fetch guild ' + packet.d.guild_id + ' in raw send function');
                    });
                    if (guild) {
                        //@ts-ignore
                        typeof this._client.ws.send === 'function' ? this._client.ws.send(packet) : guild.shard.send(packet);
                    }
                }
            }
        });

        this._cluster.on('nodeError', (node, error) => {
            this.logger.log('error on node (' + node.conn.info.host + ':' + node.conn.info.port + '): ' + error);
        });

        this._cluster.on('nodeConnect', node => {
            this.logger.log('connected successfully to node (' + node.conn.info.host + ':' + node.conn.info.port + ')');
        });

        setInterval(() => {
            const nodes = Array.from(this._cluster.nodes.values());
            for (const n of nodes) {
                const e = new MessageEmbed()
                    .setTitle(n.conn.info.host + ":" + n.conn.info.port)
                    .setColor(EmbedColor.Debug)
                    .setTimestamp(Date.now())
                    .setFields([
                        {
                            name: "Load",
                            value: n.stats.cpu.lavalinkLoad.toFixed(2) + "% (L), " + n.stats.cpu.systemLoad.toFixed(2) + "% (C)"
                        },
                        {
                            name: "Players",
                            value: n.stats.playingPlayers + "/" + n.stats.players,
                            inline: true
                        },
                        {
                            name: "Uptime",
                            value: this._msToString(n.stats.uptime),
                            inline: true
                        }
                    ]);
                CadenceDiscord.getInstance().sendStats(e);
            }
        }, 3600e3);

        if (this._client.guilds.cache && typeof (this._client.ws as any).send === "undefined") {
            this._client.ws
                .on("VOICE_SERVER_UPDATE",this._cluster.handleVoiceUpdate.bind(this._cluster))
                .on("VOICE_STATE_UPDATE", this._cluster.handleVoiceUpdate.bind(this._cluster))
                .on("GUILD_CREATE", async data => {
                    for (const state of data.voice_states) await this._cluster.handleVoiceUpdate({ ...state, guild_id: data.id });
                });
        } else {
            // @ts-ignore
            this._client.client.on("raw", async (packet: DiscordPacket) => {
                switch (packet.t) {
                    case "VOICE_SERVER_UPDATE":
                        await this._cluster.handleVoiceUpdate(packet.d);
                        break;
                    case "VOICE_STATE_UPDATE":
                        await this._cluster.handleVoiceUpdate(packet.d);
                        break;
                    case "GUILD_CREATE":
                        for (const state of packet.d.voice_states) this._cluster.handleVoiceUpdate({ ...state, guild_id: packet.d.id });
                        break;
                }
            });
        }

        this.logger.log('trying to connect to all lavalink nodes (' + this._cluster.nodes.size + ')');
        try {
            this._cluster.connect();
        } catch (e) {
            this.logger.log('could not connect to all nodes: ' + e);
        }
    }

    private _msToString(ms: number): string {
        ms /= 1000;
        var h = Math.floor(ms / 3600);
        var m = Math.floor(ms % 3600 / 60);
        var s = Math.floor(ms % 3600 % 60);

        let result = "";

        if (h > 0) {
            result += h + "h ";
        }

        if (m > 0) {
            result += m + "m ";
        }

        if (s > 0) {
            result += s + "s ";
        }

        return result;
    }

    public static getInstance(): CadenceLavalink {
        if (!this._instance) {
            this._instance = new CadenceLavalink();
        }

        return this._instance;
    }

}