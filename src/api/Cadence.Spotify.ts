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
        return CadenceLavalink.getInstance().resolveYoutubeIntoTracks(trackName);
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

    private async _spotifyRequest(query: string): Promise<any> {
        const uri = "https://api.spotify.com" + query;
        this.logger.log("querying " + uri)
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
        if (this._currentToken.length == 0) {
            // explicit any, too lazy
            const r: any = await (await fetch(
                "https://accounts.spotify.com/api/token",
                {
                    method: "POST",
                    body: JSON.stringify(["grant_type=client_credentials"]),
                    headers: {
                        "Authorization": "Basic " + Buffer.from(this._clientId + ":" + this._clientSecret).toString("base64"),
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            )).json();

            this._currentToken = r.access_token;
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
    }

    public static getInstance(): CadenceSpotify {
        if (!this._instance) {
            this._instance = new CadenceSpotify();
        }

        return this._instance;
    }

}