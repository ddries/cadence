import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

class GotoCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "goto";
        this.description = "Go to the given position in the song";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
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
            message.reply({ embeds: [ EmbedHelper.Info("Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "goto [hh:mm:ss]") ]});
            return;
        }

        const parts = args[0].split(":");

        let totalSeek = 0;
        let seconds = 0;
        let minutes = 0;
        let hours = 0;

        if (typeof parts[0] !== 'undefined' && !isNaN(parseInt(parts[0]))) {
            if (parts.length >= 3)  hours = parseInt(parts[0]);
            else if (parts.length == 2) minutes = parseInt(parts[0]);
            else seconds = parseInt(parts[0]);
        }

        if (typeof parts[1] !== 'undefined' && !isNaN(parseInt(parts[1]))) {
            if (parts.length > 2)  minutes = parseInt(parts[1]);
            else seconds = parseInt(parts[1]);
        }

        if (typeof parts[2] !== 'undefined' && !isNaN(parseInt(parts[2]))) {
            seconds = parseInt(parts[2]);
        }

        totalSeek = (seconds + (minutes * 60) + (hours * 3600)) * 1_000;

        if (totalSeek == 0) {
            message.reply({ embeds: [ EmbedHelper.Info("Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "goto [hh:mm:ss]") ]});
            return;
        }

        const song = server.getCurrentTrack();

        if (song.trackInfo.length <= totalSeek) {
            message.reply({ embeds: [ EmbedHelper.NOK("The given time is larger than the song length") ]});
            return;
        }

        const stringifySeconds = (seconds) => {
            if (seconds > 3600) return new Date(seconds * 1_000).toISOString().substring(11, 19);
            else return new Date(seconds * 1000).toISOString().substring(14, 19)
        };

        player.seekTo(totalSeek);
        message.reply({ embeds: [ EmbedHelper.OK("⏳ Jumped to " + stringifySeconds(totalSeek / 1_000)) ]});
    }
}

export default new GotoCommand();