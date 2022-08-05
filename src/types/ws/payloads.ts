import CadenceTrack from "../CadenceTrack.type";
import { RawLavalinkTrackResult } from "../TrackResult.type";

type SelfGetVoiceConnPayload = { guildId: string; };
type SelfGetVoiceConnPayloadResponse = {
    id: string;
    name: string;
    listeners: number;
};

type RequestTrackPayload = { item: RawLavalinkTrackResult, guildId: string; voiceChannelId: string; };
type RequestTrackPayloadResponse = { error?: { code: number; message: string; }};

type SyncDashboardPayload = { guildId: string, voiceChannelId: string };
type SyncDashboardPayloadResponse = { queue: CadenceTrack[], currentTrack: CadenceTrack };

export type {
    SelfGetVoiceConnPayload,
    SelfGetVoiceConnPayloadResponse,

    RequestTrackPayload,
    RequestTrackPayloadResponse,

    SyncDashboardPayload,
    SyncDashboardPayloadResponse
}