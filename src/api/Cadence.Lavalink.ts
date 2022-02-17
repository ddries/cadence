import { Client, MessageEmbed, TextBasedChannel, TextChannel, Message } from 'discord.js';
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
import { Libraries, Shoukaku, ShoukakuPlayer, ShoukakuSocket } from 'shoukaku';
import Cadence from '../Cadence';

export default class CadenceLavalink {

    private static _instance: CadenceLavalink = null;
    private logger: Logger = null;

    private _cluster: Shoukaku = null;
    private _nodeAuthorizations: { [key: string]: string } = {};

    private _playersByGuildId: Map<string, ShoukakuPlayer> = new Map<string, ShoukakuPlayer>();

    public async playTrack(track: CadenceTrack, guildId: string): Promise<boolean> {
        if (!CadenceMemory.getInstance().isServerConnected(guildId)) return false;

        const player = this.getPlayerByGuildId(guildId);
        if (!player) return false;

        if (!!player.track) {
            player.stopTrack();
        }

        this.logger.log('requested to play track ' + track.base64 + ' in ' + guildId);
        
        const result = await player.playTrack(track.base64);

        if (result) {
            track.beingPlayed = true;
            return true;
        }
        
        return false;
    }

    public getPlayerByGuildId(guildId: string): ShoukakuPlayer {
        if (this._playersByGuildId.has(guildId)) {
            return this._playersByGuildId.get(guildId);
        } else {
            return null;
        }
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

    public async playNextSongInQueue(player: ShoukakuPlayer, notify: boolean = true): Promise<boolean> {
        const s = CadenceMemory.getInstance().getConnectedServer(player.connection.guildId);
        if (!s) return false;

        const t = s.getNextSong();
        if (!t) {
            if (s.getQueue().length <= 0) {
                await player.stopTrack();
            }
            return false;
        }

        if (await this.playTrack(t, player.connection.guildId)) {
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

    public async joinChannel(channelId: string, guildId: string, channel: TextBasedChannel, shardId: number, selfDeaf: boolean = true, selfMute: boolean = false): Promise<ShoukakuPlayer> {
        if (!this._cluster) return null;

        this.logger.log('requested to join channel ' + channelId + ' in guild ' + guildId);

        let p = this.getPlayerByGuildId(guildId);

        if (!p) {
            p = await this._getIdealNode().joinChannel({
                guildId: guildId,
                channelId: channelId,
                shardId: shardId,
                deaf: selfDeaf,
                mute: selfMute
            });

            CadenceMemory.getInstance().setConnectedServer(guildId, channelId, channel, p);
            this._playersByGuildId.set(guildId, p);

            p.on('start', async (data: any) => {
                this.logger.log('received start event in player (' + p.connection.guildId + ')');

                const s = CadenceMemory.getInstance().getConnectedServer(data.guildId);
                if (!s) return;
    
                s.handleTrackStart();
            });
    
            p.on('end', async (data: any) => {
                this.logger.log('recevied end event in player (' + p.connection.guildId + ')');

                if (data.reason != "STOPPED" && data.reason != "REPLACED") {
                    this.logger.log('track ended in ' + data.guildId + ' playing next song in queue');
    
                    const s = CadenceMemory.getInstance().getConnectedServer(data.guildId);
                    if (!s) return;
    
                    s.handleTrackEnded();
                    await CadenceLavalink.getInstance().playNextSongInQueue(p, s.loop == LoopType.NONE);
                }
            });
    
            p.on('resumed', () => {
                this.logger.log('received resumed event in player (' + p.connection.guildId + ')');
            });

            p.on('exception', async (data: any) => {
                this.logger.log('received exception event in player (' + p.connection.guildId + ') ' + data);
                
                const s = CadenceMemory.getInstance().getConnectedServer(p.connection.guildId);
                if (!s) return;
    
                s.handleTrackEnded();
                await CadenceLavalink.getInstance().playNextSongInQueue(p, s.loop == LoopType.NONE);
            });

            p.on('closed', async r => {
                this.logger.log('received closed event in player (' + p.connection.guildId + ') ' + JSON.stringify(r));
                // the connection was closed abnormally, we try to reconnect the previous session
                if (r.code == 1006) {
                    const s = CadenceMemory.getInstance().getConnectedServer(r.guildId);
                    if (s) {
                        this.logger.log('trying to reconnect from disconnected server on (' + s.guildId + ')');
                        // copy the server that has been disconnected
                        // const tmp = s.getClone();
                        // // the current track that was being played in order to resume
                        // const track = s.getCurrentTrack();
                        // current position of the track being played
                        const currentPosition = p.position;
                        
                        try {
                            await p.connection.reconnect();
                            // if it resolves, the connection was resumed
                            // then we resume the track that was being played
                            p.resume({
                                startTime: currentPosition
                            });

                            this.logger.log('resumed successfully disconnected session on (' + s.guildId + ')');
                        } catch(e) {
                            this.logger.log('the connection could not be resumed, ending session on (' + s.guildId + ')');
                            this.leaveChannel(p.connection.guildId);
                        }

                        return;
                    }
                }

                // if anyting fails we just disconnect
                this.leaveChannel(p.connection.guildId);
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

        const s = CadenceMemory.getInstance().getConnectedServer(guildId);
        if (s) s.handleDisconnect();

        player.connection.node.leaveChannel(guildId);

        CadenceMemory.getInstance().disconnectServer(guildId);
        this._playersByGuildId.delete(guildId);
        return true;
    }

    public isValidUrl(url: string, restrictHttp: boolean = true): boolean {
        try {
            const u = new URL(url);
            if (restrictHttp && !(['http:', 'https:']).includes(u.protocol)) return false;
            return true;
        } catch (e) { return false; };
        
    }

    private _buildLavalinkUrl(node: ShoukakuSocket): string {
        return node.rest.url;
    }

    private _getIdealNode(): ShoukakuSocket {
        return this._cluster.getNode()
    }

    private async _lavalinkRequest(query: string, node: ShoukakuSocket): Promise<any> {
        return await (await fetch(
            this._buildLavalinkUrl(node) + query, 
            {
                headers: {
                    "Authorization": this._nodeAuthorizations[node.name]
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
        const lavalinkNodes = Config.getInstance().getKeyOrDefault('LavalinkNodes', []);

        lavalinkNodes.forEach(n => {
            this._nodeAuthorizations[n.name] = n.auth;
        });

        this._cluster = new Shoukaku(
            new Libraries.DiscordJS(CadenceDiscord.getInstance().Client),
            lavalinkNodes,
            {
                "resumable": true,
                "moveOnDisconnect": true,
                "userAgent": "cadence/" + Cadence.Version
            }
        );

        this._cluster.on('error', (nodeName, error) => {
            this.logger.log('error on node (' + nodeName + '): ' + error);
        });

        this._cluster.on('ready', nodeName => {
            this.logger.log('connected successfully to node (' + nodeName + ')');
        });

        this._cluster.on('close', (nodeName, code, reason) => {
            this.logger.log('closed node (' + nodeName + ') with code (' + code + '), reason (' + (reason || 'no reason') + ')');
        });

        this._cluster.on('disconnect', (nodeName, players, moved) => {
            this.logger.log('disconnected node (' + nodeName + '), (' + players.length + ') players have been ' + (moved ? 'moved' : 'disconnected'));
        });

        this._cluster.on('debug', (nodeName, info) => {
            // this.logger.log('debug node (' + nodeName + ') -> ' + info);
        });
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