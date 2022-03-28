import { MessageEmbed } from "discord.js";
import Cadence from "../Cadence";
import CadenceTrack from "../types/CadenceTrack.type";
import { LavalinkResultTrackInfo } from "../types/TrackResult.type";

export default class EmbedHelper {

    public static generic(text: string, color: EmbedColor, title = ""): MessageEmbed {
        return this._simple(text, color, title).setFooter({ text: Cadence.BotName }).setTimestamp(Date.now());
    }

    public static songBasic(trackInfo: LavalinkResultTrackInfo, authorId: string, title: string): MessageEmbed {
        return new MessageEmbed()
            .setTitle(title)
            .setThumbnail("https://img.youtube.com/vi/" + trackInfo.identifier + "/0.jpg")
            .setColor(EmbedColor.OK)
            .setDescription(`[${trackInfo.title}](${trackInfo.uri}), requested by <@${authorId}>`);
    }

    public static np(track: CadenceTrack, position: number): MessageEmbed {
        const totalCharacters: number = 18;
        const totalDuration: number = track.trackInfo.length;
        const currentPosition: number = position;

        let description: string = "";
        const currentProgress: number = Math.ceil((totalCharacters * currentPosition) / totalDuration);

        for (let i = 0; i < currentProgress; ++i) description += '─';
        description += "⚪";
        for (let i = currentProgress; i < totalCharacters; ++i) description += "─";
        let startAsText = this._msToString(currentPosition);

        description += "\n⏳ " + (track.trackInfo.isStream ? '♾' : (startAsText + " — " + this._msToString(totalDuration)));

        return new MessageEmbed()
            .setTitle(track.trackInfo.title)
            .setColor(EmbedColor.Info)
            .setURL(track.trackInfo.uri)
            .setThumbnail("https://img.youtube.com/vi/" + track.trackInfo.identifier + "/0.jpg")
            .setDescription(description);
    }

    public static queue(tracks: CadenceTrack[], page: number = 1, maxPages: number = 1, queueLoop: boolean = false, shuffle: boolean = false): MessageEmbed {
        let embed = new MessageEmbed()
            .setColor(EmbedColor.Info)
            .setTitle((queueLoop ? '🔁 ' : '') + (shuffle ? '🔀 ' : '') + "Queue (" + tracks.length + ")")
            .setTimestamp(Date.now());
        
        let description = "";
        const offset = Cadence.SongsPerEmbed * (page - 1);
        let totalTime = 0;
        let i = offset;
        let j = tracks.length < (i + Cadence.SongsPerEmbed) ? tracks.length : (i + Cadence.SongsPerEmbed);

        // queue duration is the total duration
        for (let i = 0; i < tracks.length; i++) {
            if (!tracks[i].trackInfo.isStream && totalTime >= 0)
                totalTime += tracks[i].trackInfo.length;
            else totalTime = -1;
        }

        // but we only show current page tracks
        for (; i  < j; ++i) {
            description += `**(${i + 1})** ${tracks[i].looped ? '🔂 ' : ' '}${tracks[i].beingPlayed ? '➡️ ' : ' '}${tracks[i].trackInfo.title.substring(0, 40)} [<@${tracks[i].requestedById}>]\n`
        }

        let footer = "";

        if (maxPages > 1)
            footer = "Page " + page + "/" + maxPages + " | ";
        
        footer += "Queue duration: " + (totalTime < 0 ? '♾️' : (Math.ceil(totalTime / 1000 / 60) + " minutes."));

        embed.setFooter({
            text: footer
        });

        embed.setDescription(description);
        return embed;
    }

    public static OK(text: string): MessageEmbed {
        return this._simple(text, EmbedColor.OK);
    }

    public static NOK(text: string): MessageEmbed {
        return this._simple(text, EmbedColor.NOK);
    }

    public static Info(text: string): MessageEmbed {
        return this._simple(text, EmbedColor.Info);
    }

    private static _simple(text: string, color: EmbedColor, title: string = ""): MessageEmbed {
        return new MessageEmbed()
            .setDescription(text)
            .setTitle(title)
            .setColor(color);
    }

    private static _msToString(ms: number): string {
        ms /= 1000;
        var h = Math.floor(ms / 3600);
        var m = Math.floor(ms % 3600 / 60);
        var s = Math.floor(ms % 3600 % 60);

        return (h > 0 ? ((h >= 10 ? h : ('0' + h)) + ':') : '') + (m >= 10 ? m : ('0' + m)) + ':' + (s >= 10 ? s : ('0' + s));
    }

}

export enum EmbedColor {
    OK = "#32a852",
    NOK = "#eb4034",
    Info = "#fcba03",
    Debug = "#4287f5"
}