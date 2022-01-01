import mongoose from 'mongoose';

export interface IGuild {
    guildId: string,
    prefix: string
}

export const GuildSchema = new mongoose.Schema<IGuild>({
    guildId: { type: String, required: true },
    prefix: { type: String, required: true }
}, { collection: 'guilds' });

export const GuildModel = mongoose.model<IGuild>('Guild', GuildSchema);