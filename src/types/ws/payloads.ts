type SelfGetVoiceConnPayload = {
    guildId: string;
};

type SelfGetVoiceConnPayloadResponse = {
    id: string;
    name: string;
    listeners: number;
};

export type {
    SelfGetVoiceConnPayload,
    SelfGetVoiceConnPayloadResponse,
}