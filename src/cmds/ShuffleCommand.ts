import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "shuffle",
    description: "Randomize the queue",
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing :(") ], ephemeral: true });
            return;
        }

        if (!CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId)) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing :(") ], ephemeral: true });
            return;
        }

        if (!(interaction.member as GuildMember).voice?.channelId || (interaction.member as GuildMember).voice.channelId != server.voiceChannelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ], ephemeral: true });
            return;
        }

        if (server.isQueueEmpty()) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing in the queue :(") ], ephemeral: true });
            return;
        }

        server.shuffleQueue();
        interaction.reply({ embeds: [ EmbedHelper.OK("🔀 " + (server.shuffle ? "Enabled" : "Disabled") + " shuffle") ]});
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("shuffle")
                        .setDescription("Randomize the queue")
                        .toJSON()
}