import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import CadenceTrack from "../types/CadenceTrack.type";
import { LavalinkResult } from "../types/TrackResult.type";

class HelpCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

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
            message.guildId
        );

        let server = CadenceMemory.getInstance().getConnectedServer(message.guildId);

        let result: LavalinkResult = null;
        if (CadenceLavalink.getInstance().isValidUrl(linkOrKeyword)) {
            result = await CadenceLavalink.getInstance().resolveLinkIntoTracks(linkOrKeyword);
        } else {
            for (let i = 0; i < args.length; ++i) linkOrKeyword += args[i] + " ";
            result = await CadenceLavalink.getInstance().resolveYoutubeIntoTracks(linkOrKeyword.trim());
        }

        switch (result.loadType) {
            case "LOAD_FAILED":
            case "NO_MATCHES":
                message.reply({ embeds: [ EmbedHelper.NOK("We couldn't find anything with that link!") ]});
                break;
            case "SEARCH_RESULT":
            case "TRACK_LOADED":
                const track = result.tracks[0];
                if (!server.player.playing) {
                    if (await CadenceLavalink.getInstance().playTrack(track.track, message.guildId)) {
                        message.reply({ embeds: [ EmbedHelper.songBasic(track.info, message.author.id, "Now Playing!") ]});
                    }
                } else {
                    const ct = new CadenceTrack(track.track, track.info, message.author.id);
                    server.addToQueue(ct);
                    message.reply({ embeds: [ EmbedHelper.songBasic(track.info, message.author.id, "Added to Queue!") ]});
                }
                break;
            case "PLAYLIST_LOADED":
                for (let i = server.player.playing ? 0 : 1; i < result.tracks.length; ++i) {
                    server.addToQueue(new CadenceTrack(result.tracks[i].track, result.tracks[i].info, message.author.id));
                }

                if (!server.player.playing) {
                    await CadenceLavalink.getInstance().playTrack(result.tracks[0].track, message.guildId);
                }

                message.reply({ embeds: [ EmbedHelper.OK(`Added **${result.tracks.length}** songs to the queue!`) ]});
        }
    }
}

export default new HelpCommand();