`cadence` is a free music bot for Discord.

It is written in Typescript, NodeJS, and powered by Lavalink (https://github.com/freyacodes/Lavalink).

Features:
* Play music in your Discord server given a url or keywords.
* Based on Youtube videos.
* Supports Spotify links (tracks, playlists), will try its best to find the Youtube version.
* Fancy player controller based on buttons (pause, play next/prev, loop, stop).
* No duration limit, can play 24/7.
* Can be self-hosted [1].


[1] = Self-hosted is basically allowed (docker image is even published on hub.docker.com to ddries/cadence), but you'll have to play with the source code to identify config params.