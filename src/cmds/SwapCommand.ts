import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "swap",
    description: "Swap two songs from the queue",
    requireAdmin: false,
    disabled: true,

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

        if (server.isQueueEmpty()) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing in the queue!") ], ephemeral: true });
            return;
        }

        let idxFrom = interaction.options.getInteger('first', true);
        let idxTo = interaction.options.getInteger('second', true);

        idxFrom--;
        idxTo--;
        
        if (!server.checkIndex(idxFrom) || !server.checkIndex(idxTo)) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index!") ], ephemeral: true });
            return;
        }
    
        server.swapSong(idxFrom, idxTo);
        interaction.reply({ content: '✅' });
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("swap")
                        .setDescription("Swap two songs from the queue")
                        .addIntegerOption(o => o.setName("first").setDescription("First song to swap").setRequired(true).setMinValue(1))
                        .addIntegerOption(o => o.setName("second").setDescription("Second song to swap").setRequired(true).setMinValue(1))
                        .toJSON()
}