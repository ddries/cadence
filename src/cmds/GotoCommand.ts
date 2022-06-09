import { SlashCommandBuilder, time } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "goto",
    description: "Go to the given position in the song",
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing :(") ], ephemeral: true });
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);

        if (!player) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing :(") ], ephemeral: true });
            return;
        }

        if (!(interaction.member as GuildMember).voice?.channelId || (interaction.member as GuildMember).voice.channelId != server.voiceChannelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ], ephemeral: true });
            return;
        }

        const timestamp = interaction.options.getString('timestamp', true);
        const parts = timestamp.split(":");

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

        const song = server.getCurrentTrack();

        if (song.trackInfo.length <= totalSeek) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("The given time is larger than the song length") ], ephemeral: true });
            return;
        }

        const stringifySeconds = (seconds) => {
            if (seconds > 3600) return new Date(seconds * 1_000).toISOString().substring(11, 19);
            else return new Date(seconds * 1000).toISOString().substring(14, 19)
        };

        player.seekTo(totalSeek);
        interaction.reply({ embeds: [ EmbedHelper.OK("⌛️ Now playing at " +stringifySeconds(totalSeek / 1_000)) ]});
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("goto")
                        .setDescription("Go to the given position in the song")      
                        .addStringOption(o => o.setName("timestamp").setDescription("Format [hh:mm:ss], [mm:ss] or [ss]").setRequired(true))
                        .toJSON()
}