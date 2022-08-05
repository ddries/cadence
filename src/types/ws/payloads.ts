import { RawLavalinkTrackResult } from "../TrackResult.type";

type SelfGetVoiceConnPayload = { guildId: string; };
type SelfGetVoiceConnPayloadResponse = {
    id: string;
    name: string;
    listeners: number;
};

type RequestTrackPayload = { item: RawLavalinkTrackResult, guildId: string; voiceChannelId: string; };
type RequestTrackPayloadResponse = { error?: { code: number; message: string; }};

export type {
    SelfGetVoiceConnPayload,
    SelfGetVoiceConnPayloadResponse,

    RequestTrackPayload,
    RequestTrackPayloadResponse,
}