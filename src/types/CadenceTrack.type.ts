import { LavalinkResultTrackInfo } from "./TrackResult.type";

export default class CadenceTrack {
    public base64: string;
    public requestedById: string;
    public trackInfo: LavalinkResultTrackInfo;
    public beingPlayed: boolean = false;
    public looped: boolean = false;

    constructor(base64: string, track: LavalinkResultTrackInfo, requestedById: string) {
        this.base64 = base64;
        this.trackInfo = track;
        this.requestedById = requestedById;
    }
}