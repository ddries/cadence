import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";

export const Command: BaseCommand = {
    name: "np",
    description: "Display the current song and progress",
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

        if (!player.track) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        const song = server.getCurrentTrack();
        if (!song) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        // interaction.reply({ embeds: [ EmbedHelper.np(song, player.position) ] });
        const m = await interaction.reply({ embeds: [ EmbedHelper.np(song, player.position, true) ], components: server._buildButtonComponents(), fetchReply: true }) as Message;
        server.setMessageAsMusicPlayer(m);
        // interaction.reply({ embeds: [ EmbedHelper.Info("I've sent again the music player controller.") ], ephemeral: true });
        // server.sendPlayerController();
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("np")
                        .setDescription("Display the current song and progress")
                        .toJSON()
}