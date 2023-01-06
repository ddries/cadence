import { LavalinkResultTrack } from "./TrackResult.type";

type CadenceTrack = LavalinkResultTrack & {
    addedBy: {
        id: string,
        name: string
    },
    beingPlayed: boolean,
    looped: boolean,
    isSpotify: boolean
};

export default CadenceTrack;