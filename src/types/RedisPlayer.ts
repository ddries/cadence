import type { LavalinkResultTrack } from './TrackResult.type'

type redisBoolean = 0 | 1;

/** Represents the player state saved in Redis */
type RedisPlayer = {
    /** If the player is currently paused or not */
    pause: redisBoolean,

    /** If the shuffle is currently enabled or not */
    shuffle: redisBoolean,

    /** Current loop mode enabled in the player */
    loop: number,
};

/** Queue state of the player */
type RedisQueue = {
    /** Index of the song being played in the player */
    index: number,

    /** Total count of items in the queue */
    count: number,

    /** Array of items in the queue */
    items: (LavalinkResultTrack & {
        /** User who added the track to the queue */
        addedBy: {
            /** Id of the user */
            id: string,

            /** Username of the user */
            name: string
        },

        /** If this track is currently being played or not */
        beingPlayed: redisBoolean
    })[]
};

export type {
    RedisPlayer,
    RedisQueue
}