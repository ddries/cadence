import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "rewind",
    description: "Rewind the song the given amount of seconds",
    aliases: ["r", "rw"],
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);

        if (!player) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        if (!(interaction.member as GuildMember).voice?.channelId || (interaction.member as GuildMember).voice.channelId != server.voiceChannelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ], ephemeral: true });
            return;
        }

        const sec = interaction.options.getInteger('seconds', true) * 1_000;
        
        if (sec >= player.position) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You can't rewind more than the song duration! Maximum " + Math.round(player.position / 1000) + " seconds.") ], ephemeral: true });
            return;
        }

        player.seekTo(player.position - sec);
        interaction.reply({ embeds: [ EmbedHelper.OK("⌛️ Now playing at " + EmbedHelper._msToString(player.position - sec)) ]});
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("rewind")
                        .setDescription("Rewind the song the given amount of seconds")
                        .addIntegerOption(o => o.setName('seconds').setDescription('Amount of seconds').setRequired(true).setMinValue(1))
                        .toJSON()
}