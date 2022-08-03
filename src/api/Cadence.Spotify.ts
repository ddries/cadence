import Config from './Cadence.Config';
import Logger from './Cadence.Logger';
import fetch from 'node-fetch';
import * as TrackResult from '../types/TrackResult.type';
import CadenceLavalink from './Cadence.Lavalink';

export default class CadenceSpotify {

    private static _instance: CadenceSpotify = null;
    private logger: Logger = null;

    private _clientId: string = "";
    private _clientSecret: string = "";

    private _currentToken: string = "";

    public async resolveLinkIntoTracks(link: string): Promise<TrackResult.LavalinkResult> {
        this.logger.log('requested to resolve link ' + link);

        const trackId = this._getTrackIdFromLink(link);

        if (!trackId) {
            return null;
        }

        const result = await this._spotifyRequest("/v1/tracks/" + trackId);

        if (!result)  {
            return null;
        }

        if (!result.type || result.type != "track") {
            return null;
        }

        const trackName: string = result.name;
        let lavalinkResult = await CadenceLavalink.getInstance().resolveYoutubeIntoTracks(trackName);

        if (lavalinkResult.loadType == 'SEARCH_RESULT') {
            lavalinkResult.tracks[0].info.title = trackName;
        }
        
        return lavalinkResult;
    }

    public async resolveLinkIntoSpotifyPlaylist(link: string): Promise<TrackResult.SpotifyPlaylistResult> {
        this.logger.log('requested to resolve album ' + link);

        const albumId = this._getPlaylistIdFromLink(link);

        if (!albumId) {
            return null;
        }

        const result = await this._spotifyRequest('/v1/playlists/' + albumId);

        if (!result) {
            return null;
        }

        if (!result.tracks) {
            return null;
        }

        let total = result.tracks.total;

        if (total > 1000) {
            total = 1000;
        }

        const _fetchSpotifySongs = async (offset: number): Promise<Array<any>> => {
            try {
                const _r = await this._spotifyRequest('/v1/playlists/' + albumId + "/tracks?offset=" + offset);
                return _r.items;
            } catch (e) {}
            return null;
        };
        for (let i = 1; i < Math.ceil(total / 100); i++) {
            const offsetResult = await _fetchSpotifySongs(100 * i);
            if (offsetResult) result.tracks.items.push(...offsetResult);
        }

        if (!result.tracks) {
            return null;
        }

        const spotifyResult: TrackResult.SpotifyPlaylistResult = {
            loadType: 'SPOTIFY_LOAD',
            affectedByLimit: result.tracks.total > total,
            content: []
        };

        for (let i = 0; i < result.tracks.items.length; i++) {
            const track = result.tracks.items[i].track;
            if (!track) {
                continue;
            }

            const spotityTrack: TrackResult.SpotifyPlaylistTrack = {
                author: track.artists[0].name,
                id: track.id,
                length: track.duration_ms,
                title: track.name,
                uri: track.uri
            };

            spotifyResult.content.push(spotityTrack);
        }

        return spotifyResult;
    }

    private _getTrackIdFromLink(link: string): string {
        const a = link.split("track/");
        if (a.length == 2) {
            const b = a[1].split("/");
            const c = b[0].split("?");
            const d = c[0].split("&");
            return d[0];
        }
        return "";
    }

    private _getPlaylistIdFromLink(link: string): string {
        const a = link.split("playlist/");
        if (a.length === 2) {
            const b = a[1];
            return b.split("?")[0].split("&")[0];
        }
        return "";
    }

    private async _spotifyRequest(query: string): Promise<any> {
        const uri = "https://api.spotify.com" + query;
        this.logger.log("querying " + uri);
        return await (await fetch(
            uri,
            {
                headers: {
                    "Authorization": "Bearer " + await this._getValidAuthToken()
                }
            }
        )).json();
    }

    private async _getValidAuthToken(): Promise<string> {
        if (!this._currentToken) {
            // explicit any, too lazy
            const r: any = await (await fetch(
                "https://accounts.spotify.com/api/token",
                {
                    method: "POST",
                    body: "grant_type=client_credentials",
                    headers: {
                        "Authorization": "Basic " + Buffer.from(this._clientId + ":" + this._clientSecret).toString("base64"),
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            )).json();

            this._currentToken = r.access_token;
            console.log(this._currentToken);
            setTimeout(() => {
                this._currentToken = "";
            }, r.expires_in);
        }
        return this._currentToken;
    }

    private constructor() {
        this.logger = new Logger('cadence-spotify', 'spotify.log');
    }

    public async init(): Promise<void> {
        this._clientId = Config.getInstance().getKeyOrDefault('SpotifyClientId', '');
        this._clientSecret = Config.getInstance().getKeyOrDefault('SpotifyClientSecret', '');

        this._currentToken = "";
    }

    public static getInstance(): CadenceSpotify {
        if (!this._instance) {
            this._instance = new CadenceSpotify();
        }

        return this._instance;
    }

}