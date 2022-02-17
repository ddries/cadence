import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDb from "../api/Cadence.Db";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import CadenceSpotify from "../api/Cadence.Spotify";
import Cadence from "../Cadence";
import CadenceTrack from "../types/CadenceTrack.type";
import { LavalinkResult } from "../types/TrackResult.type";

class PlayCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    public first: boolean = false;

    constructor() {
        super();

        this.name = "play";
        this.description = "Play the given song as a link or keyworkds to search for. Accepts playlists!"
        this.aliases = ["p"];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
        if (args.length <= 0) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid link or keywords! Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "play [link or keywords]") ]});
            return;
        }

        let linkOrKeyword: string = args[0];

        if (!message.member.voice?.channelId) {
            message.reply({ embeds: [ EmbedHelper.NOK("You must be connected to a voice channel!") ]});
            return;
        }

        const oldServer = CadenceMemory.getInstance().getConnectedServer(message.guildId);

        if (oldServer && oldServer.voiceChannelId != message.member.voice.channelId) {
            message.reply({ embeds: [ EmbedHelper.NOK("I'm already being used in another voice channel!") ]});
            return;
        }

        await CadenceLavalink.getInstance().joinChannel(
            message.member.voice.channelId,
            message.guildId,
            message.channel,
            message.guild.shardId
        );

        let server = CadenceMemory.getInstance().getConnectedServer(message.guildId);
        
        let result: LavalinkResult = null;
        if (CadenceLavalink.getInstance().isValidUrl(linkOrKeyword)) {
            if (linkOrKeyword.includes("youtube") || linkOrKeyword.includes("you")) {
                result = await CadenceLavalink.getInstance().resolveLinkIntoTracks(linkOrKeyword);
            } else {
                result = await CadenceSpotify.getInstance().resolveLinkIntoTracks(linkOrKeyword);
            }
        } else {
            for (let i = 1; i < args.length; ++i) linkOrKeyword += " " + args[i];
            result = await CadenceLavalink.getInstance().resolveYoutubeIntoTracks(linkOrKeyword.trim());
        }
        
        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);

        if (result == null) {
            message.reply({ embeds: [ EmbedHelper.NOK("We couldn't find anything with that link! (Private Spotify links do not work)") ]});
            return;
        }
        
        switch (result.loadType) {
            case "LOAD_FAILED":
            case "NO_MATCHES":
                message.reply({ embeds: [ EmbedHelper.NOK("We couldn't find anything with that link!") ]});
                break;
            case "SEARCH_RESULT":
            case "TRACK_LOADED":
                const track = result.tracks[0];
                const ct = new CadenceTrack(track.track, track.info, message.author.id);
                server.addToQueue(ct);

                if (!player.track) {
                    await CadenceLavalink.getInstance().playNextSongInQueue(player);
                } else {
                    message.reply({ embeds: [ EmbedHelper.songBasic(track.info, message.author.id, "Added to Queue!") ]});
                }

                // CadenceDb.getInstance().pushNewSong({
                //     guildId: message.guildId,
                //     requestedById: message.author.id,
                //     dateUnix: (Date.now() / 1000).toString(),
                //     songUrl: ct.trackInfo.uri
                // });
                
                break;
            case "PLAYLIST_LOADED":
                for (let i = 0; i < result.tracks.length; ++i) {
                    server.addToQueue(new CadenceTrack(result.tracks[i].track, result.tracks[i].info, message.author.id));
                }

                if (!player.track) {
                    await CadenceLavalink.getInstance().playNextSongInQueue(player);
                }

                message.reply({ embeds: [ EmbedHelper.OK(`Added **${result.tracks.length}** songs to the queue!`) ]});
        }
    }
}

export default new PlayCommand();