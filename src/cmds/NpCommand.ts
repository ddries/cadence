import { Message, MessageEmbed } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import Config from "../api/Cadence.Config";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LavalinkResultTrackInfo } from "../types/TrackResult.type";

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
        const song = player.track;
        // const song = server.player.track;

        console.log("Server player in np");
        // console.log(server.player);
        console.log(player);

        console.log("Current song in np: ");
        console.log(song);

        const trackData: LavalinkResultTrackInfo = await CadenceLavalink.getInstance().resolveTrackInfo(song);
        console.log("Track data in np")
        console.log(trackData);
        if (trackData) {
            // message.reply({ embeds: [ EmbedHelper.np(trackData, server.player.timestamp) ] });
            // message.reply({ embeds: [ EmbedHelper.songBasic(trackData, ) ] });
        }
    }
}

export default new NpCommand();