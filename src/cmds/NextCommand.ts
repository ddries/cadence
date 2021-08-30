import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import Config from "../api/Cadence.Config";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

class NextCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "next";
        this.description = "Skip to the next song in the queue";
        this.aliases = ["n", "skip"];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
        const server = CadenceMemory.getInstance().getConnectedServer(message.guildId);

        if (!server) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        if (!message.member.voice?.channelId || message.member.voice.channelId != server.voiceChannelId) {
            message.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ]});
            return;
        }

        if (server.isQueueEmpty()) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing in the queue!") ]});
            return;
        }

        const nextTrack = server.jumpNextSong();

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);

        await player.stop();

        if (await player.play(nextTrack.base64)/*await CadenceLavalink.getInstance().playTrack(nextTrack.base64, message.guildId)*/) {
            console.log("After next play player track: ");
            console.log(player.track);
            message.reply({ embeds: [ EmbedHelper.songBasic(nextTrack.trackInfo, message.author.id, "Now Playing!") ]});
            console.log("After reply server player: ");
            console.log(player);
        }
    }
}

export default new NextCommand();