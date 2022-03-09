import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";

export const Command: BaseCommand = {
    name: "leave",
    description: "Leave the current voice session",
    aliases: ["stop", "dc"],
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (server && server.voiceChannelId != (interaction.member as GuildMember).voice.channelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("I'm already being used in another voice channel!") ], ephemeral: true });
            return;
        }

        const b = await CadenceLavalink.getInstance().leaveChannel(interaction.guildId);
        if (b) {
            interaction.reply({ content: '👋' });
        }
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("leave")
                        .setDescription("Leave the current voice session")      
                        .toJSON()


}