import mongoose from 'mongoose';

export interface ISong {
    guildId: string,
    songUrl: string,
    requestedById: string,
    dateUnix: string
}

export const SongSchema = new mongoose.Schema<ISong>({
    guildId: { type: String, required: true },
    songUrl: { type: String, required: true },
    requestedById: { type: String, required: true },
    dateUnix: { type: String, required: true }
}, { collection: 'songs' });

export const SongModel = mongoose.model<ISong>('Song', SongSchema);