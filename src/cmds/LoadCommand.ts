import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import Config from "../api/Cadence.Config";
import Db from "../api/Cadence.Db";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper, { EmbedColor } from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import CadenceTrack from "../types/CadenceTrack.type";
import { LoopType } from "../types/ConnectedServer.type";

class LoadCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "load";
        this.description = "Loads a custom saved playlists in your server";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
        if (args.length < 1) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid playlist! Usage: `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "load [id]`") ]});
            return;
        }

        if (CadenceLavalink.getInstance().isValidUrl(args[0])) {
            message.reply({ embeds: [ EmbedHelper.NOK("To play a playlist from a link, please use `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "play [link]`."
                                                        + "\n`" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "load` is for playlists generated with `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "save`.") ]});
            return;
        }

        const playlistId = args[0];

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
            message.channel
        );

        let server = CadenceMemory.getInstance().getConnectedServer(message.guildId);
        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);

        const playlist = await Db.getInstance().loadPlaylist(playlistId);

        if (playlist && playlist.length > 0) {
            playlist.pop(); // last element is guild id for uniqueness
            for (let i = 0; i < playlist.length; ++i) {
                server.addToQueue(new CadenceTrack(playlist[i].base64, playlist[i].info, CadenceDiscord.getInstance().Client.user.id));
            }

            if (!player.playing) {
                await CadenceLavalink.getInstance().playNextSongInQueue(player);
            }

            message.reply({ embeds: [ EmbedHelper.OK(`Playlist loaded!\nAdded **${playlist.length}** songs to the queue!`) ]});
        } else {
            message.reply({ embeds: [ EmbedHelper.NOK("The playlist was not found or there has been an error loading it.") ]});
            return;
        }
    }
}

export default new LoadCommand();