import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

class JumpCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "jump";
        this.description = "Jump to the selected song from queue";
        this.aliases = ["j"];
        this.requireAdmin = false;
    }

    public run(message: Message, args: string[]): void {
        const server = CadenceMemory.getInstance().getConnectedServer(message.guildId);

        if (!server) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);

        if (!player) {
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

        if (args.length < 1) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter the song index! Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "jump [index].") ]});
            return;
        }

        let idx = parseInt(args[0], 10);

        if (isNaN(idx)) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter the song index! Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "jump [index].") ]});
            return;
        }

        if (!server.checkIndex(idx)) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index!") ]});
            return;
        }

        // given index is real index + 1 (thus, real is given -1)
        // if no loop is active we are removing 1 song in handleTrackEnded (currently played)
        // thus, given index is now index, real index is last given index - 1 (thus, real is first given -2)
        // then we jump to the given song
        // so we remove until the real index is now index 0

        // if queue loop is active then real index is just given - 1 as we dont remove songs then

        server.handleTrackEnded(false);
        const song = server.jumpToSong(idx - 1);

        CadenceLavalink.getInstance().playTrack(song, player.connection.guildId);
        server.sendPlayerController();
    }
}

export default new JumpCommand();