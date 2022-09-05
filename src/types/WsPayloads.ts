import CadenceTrack from "./CadenceTrack.type";
import { LoopType } from "./ConnectedServer.type";
import { LavalinkResultTrack } from "./TrackResult.type";
import { WsErrorCodes } from "./WsErrors";

type ErrorPacket = { error?: { code: WsErrorCodes; message: string; }};

type SelfGetVoiceConnPayload = { guildId: string; };
type SelfGetVoiceConnPayloadResponse = {
    guildId: string,
    voiceChannelId: string;
    voiceChannelName: string;
};

type RequestTrackPayload = { track: LavalinkResultTrack; guildId: string; voiceChannelId: string; requestedByUserName: string; };

type AddTrackPayload = { track: CadenceTrack };
type TrackStartPayload = { trackIndex: number };

type PlayerUpdatePayload = Partial<{ pause: boolean, shuffle: boolean, loop: LoopType }>;

type RequestPausePayload = { guildId: string };
type RequestPausePayloadResponse = { pause: boolean };

type PlayerStopPayload = {};

export type {
    ErrorPacket,
    
    SelfGetVoiceConnPayload,
    SelfGetVoiceConnPayloadResponse,

    RequestTrackPayload,
    AddTrackPayload,
    TrackStartPayload,

    PlayerUpdatePayload,

    RequestPausePayload,
    RequestPausePayloadResponse,

    PlayerStopPayload,
}