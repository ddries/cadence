import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "pause",
    description: "Pause the current song",
    aliases: [],
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

        server.player.setPaused(true);
        interaction.reply({ embeds: [ EmbedHelper.OK("Player paused.") ]});
        // interaction.reply({ content: '⏸' });
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("pause")
                        .setDescription("Pause the current song")
                        .toJSON()
        if (s) {
            message.react('⏸');
        }

        server.updatePlayerControllerButtonsIfAny();
    }
}