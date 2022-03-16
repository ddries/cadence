import { ButtonInteraction, Message, MessageActionRow, MessageButton } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LoopType } from "../types/ConnectedServer.type";

class NpCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "np";
        this.description = "Display the current song and progress";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
        let server = CadenceMemory.getInstance().getConnectedServer(message.guildId);
        
        if (!server) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);

        if (!player) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        if (!player.track) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        const song = server.getCurrentTrack();
        if (!song) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        server.sendPlayerController();
    }
}

export default new NpCommand();