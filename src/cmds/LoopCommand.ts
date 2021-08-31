import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import Config from "../api/Cadence.Config";
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

        if (!player || !player.playing) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        if (!message.member.voice?.channelId || message.member.voice.channelId != server.voiceChannelId) {
            message.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ]});
            return;
        }

        if (args.length <= 0) {
            if (server.loop != LoopType.NONE) {
                server.loop = LoopType.NONE;
                server.getCurrentTrack().looped = false;
                server.loopQueue(false);
                message.reply({ embeds: [ EmbedHelper.Info("Disabled loop!") ]});
                return;
            }

            server.loop = LoopType.TRACK;
            server.getCurrentTrack().looped = true;
            message.reply({ embeds: [ EmbedHelper.Info("Looping the current track! If you wish to loop the whole queue, use `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "loop queue`.") ]});
        } else if (args[0] == 'queue') {
            if (server.loop == LoopType.TRACK) {
                server.loop = LoopType.NONE;
                server.getCurrentTrack().looped = false;
            }
            
            server.loopQueue(true);
            message.reply({ embeds: [ EmbedHelper.Info("Looping the whole queue!") ]});
        }
    }
}

export default new LoopCommand();