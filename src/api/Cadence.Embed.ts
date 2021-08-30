import { MessageEmbed } from "discord.js";
import { TrackData } from "lavacord";
import Cadence from "../Cadence";
import CadenceTrack from "../types/CadenceTrack.type";
import { LavalinkResultTrackInfo } from "../types/TrackResult.type";

export default class EmbedHelper {

    public static generic(text: string, color: EmbedColor, title = ""): MessageEmbed {
        return this._simple(text, color, title).setFooter(Cadence.BotName).setTimestamp(Date.now());
    }

    public static songBasic(trackInfo: LavalinkResultTrackInfo, authorId: string, title: string): MessageEmbed {
        return new MessageEmbed()
            .setTitle(title)
            .setThumbnail("https://img.youtube.com/vi/" + trackInfo.identifier + "/0.jpg")
            .setColor(EmbedColor.OK)
            .setDescription(`[${trackInfo.title}](${trackInfo.uri}), requested by <@${authorId}>`);
    }

    public static np(track: LavalinkResultTrackInfo, startTime: number): MessageEmbed {
        const totalCharacters: number = 18;
        const totalDuration: number = track.length;
        const currentPosition: number = Date.now() - startTime;//track.position;

        const currentProgress: number = Math.ceil((totalCharacters * currentPosition) / totalDuration);

        // return new MessageEmbed()
        //     .setTitle("Now Playing!")
        //     .setColor(EmbedColor.Info)
        //     .setThumbnail("https://img.youtube.com/vi/" + track.identifier + "/0.jpg")
        //     .setDescription(`[${track.title}](${track.uri})`);

        let description: string = "";
        for (let i = 0; i < currentProgress; ++i) description += '─';
        description += "⚪";
        for (let i = currentProgress; i < totalCharacters; ++i) description += "─";

        return new MessageEmbed()
            .setTitle(track.title)
            .setColor(EmbedColor.Info)
            .setURL(track.uri)
            .setThumbnail("https://img.youtube.com/vi/" + track.identifier + "/0.jpg")
            .setDescription(description);
    }

    public static queue(tracks: CadenceTrack[], page: number = 1, maxPages: number = 1): MessageEmbed {
        let embed = new MessageEmbed()
            .setColor(EmbedColor.Info)
            .setTitle("Queue (" + tracks.length + ")")
            .setTimestamp(Date.now());
        
        let description = "";
        let i = Cadence.SongsPerEmbed * (page - 1);
        let j = tracks.length < (i + Cadence.SongsPerEmbed) ? tracks.length : (i + Cadence.SongsPerEmbed);
        for (; i  < j; ++i) {
            description += `**(${i + 1})** ${tracks[i].trackInfo.title.substr(0, 15)} [<@${tracks[i].requestedById}>]\n`
        }

        if (maxPages > 1)
            embed.setFooter("Page " + page + "/" + maxPages);

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

}

export enum EmbedColor {
    OK = "#32a852",
    NOK = "#eb4034",
    Info = "#fcba03"
}