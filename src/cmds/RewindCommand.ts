import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

class RewindCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "rewind";
        this.description = "Rewind the song the given amount of seconds.";
        this.aliases = ["r", "rw"];
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

        const sec = parseInt(args[0], 10) * 1_000;
        
        if (sec >= player.position) {
            message.reply({ embeds: [ EmbedHelper.NOK("You can't rewind more than the song duration! Maximum " + Math.round(player.position / 1_000) + " seconds.") ]});
            return;
        }

        player.seekTo(player.position - sec);
        message.react('⏪');
    }
}

export default new RewindCommand();