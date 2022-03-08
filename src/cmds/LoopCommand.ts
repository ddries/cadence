import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LoopType } from "../types/ConnectedServer.type";

class LoopCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "loop";
        this.description = "Loop your whole queue or just a single song 24/7!";
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

        if (!player ||!player.track) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        if (!message.member.voice?.channelId || message.member.voice.channelId != server.voiceChannelId) {
            message.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ]});
            return;
        }

        // no args + no loop = track loop
        if (args.length <= 0 && server.loop == LoopType.NONE) {
            server.loop = LoopType.TRACK;
            server.getCurrentTrack().looped = true;
            message.reply({ embeds: [ EmbedHelper.Info("Looping the current track! If you wish to loop the whole queue, use `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "loop queue`.") ]});
            return;
        }

        // no args + any loop = disable loop
        if (args.length <= 0 && server.loop != LoopType.NONE) {
            server.loop = LoopType.NONE;
            server.getCurrentTrack().looped = false;
            server.loopQueue(false);
            message.reply({ embeds: [ EmbedHelper.Info("Disabled loop!") ]});
            return;
        }

        // args queue + no loop or loop track = loop queue
        if (args.length > 0 && args[0] == 'queue' && server.loop != LoopType.QUEUE) {
            if (server.loop == LoopType.TRACK) {
                server.loop = LoopType.NONE;
                server.getCurrentTrack().looped = false;
            }
            
            server.loopQueue(true);
            message.reply({ embeds: [ EmbedHelper.Info("Looping the whole queue!") ]});
            return;
        }
    }
}

export default new LoopCommand();