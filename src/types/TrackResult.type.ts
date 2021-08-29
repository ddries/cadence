export type LavalinkResultPlaylistInfo = {
    selectedTrack: number,
    name: string
};

export type LavalinkResultTrackInfo = {
    identifier: string,
    isSeekable: boolean,
    author: string,
    length: number,
    isStream: boolean,
    position: number,
    title: string,
    uri: string
};

export type LavalinkResultTrack = {
    info: LavalinkResultTrackInfo,
    track: string
};

export type LavalinkResult = {
    playlistInfo: LavalinkResultPlaylistInfo,
    loadType: "LOAD_FAILED" | "PLAYLIST_LOADED" | "TRACK_LOADED" | "NO_MATCHES" | "SEARCH_RESULT",
    tracks: LavalinkResultTrack[]
};