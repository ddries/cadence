import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

class SwapCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "swap";
        this.description = "Swap two songs from the queue";
        this.aliases = ["sw"];
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

        let idxFrom = parseInt(args[0], 10);
        let idxTo = parseInt(args[1], 10);

        if (isNaN(idxFrom) || isNaN(idxTo)) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter the song index! Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "jump [index].") ]});
            return;
        }

        idxFrom--;
        idxTo--;
        
        if (!server.checkIndex(idxFrom) || !server.checkIndex(idxTo)) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index!") ]});
            return;
        }
    
        server.swapSong(idxFrom, idxTo);
        message.react('✅');
    }
}

export default new SwapCommand();