import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LoopType } from "../types/ConnectedServer.type";

class RemoveCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "remove";
        this.description = "Remove the selected song from queue";
        this.aliases = ["rm"];
        this.requireAdmin = false;
    }

    public run(message: Message, args: string[]): void {
        const server = CadenceMemory.getInstance().getConnectedServer(message.guildId);

        if (!server) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        if (!CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId)) {
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
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter the song index! Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "remove [index].") ]});
            return;
        }

        let idx = parseInt(args[0], 10);

        if (isNaN(idx)) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter the song index! Usage: " + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "remove [index].") ]});
            return;
        }

        if (!server.checkIndex(idx)) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index!") ]});
            return;
        }

        idx--;

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);
        message.react('✅');

        if (idx == server.getCurrentQueueIndex()) {
            // if we are looping current track, we disable it
            if (server.loop == LoopType.TRACK) {
                server.loop = LoopType.NONE;
            }

            // if its last track, we disconnect
            if (server.getQueueLength() == 1) {
                player.stopTrack();
                server.handleTrackEnded();
                return;
            }

            // otherwise play next one
            CadenceLavalink.getInstance().playNextSongInQueue(player);
        }
        
        server.removeFromQueueIdx(idx);
        server.updatePlayerControllerButtonsIfAny();
    }
}

export default new RemoveCommand();