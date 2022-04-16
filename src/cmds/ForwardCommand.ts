import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "forward",
    description: "Forward the song the given amount of seconds",
    aliases: ["f", "ff"],
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
        const song = server.getCurrentTrack();
        const remaining = (song.trackInfo.length - player.position);
        
        if (sec >= remaining) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You can't forward more than the remaining time! Maximum " + Math.round(remaining) + " seconds.") ], ephemeral: true });
            return;
        }

        player.seekTo(player.position + sec);
        interaction.reply({ embeds: [ EmbedHelper.OK("Forwarded " + sec + " seconds.") ]});
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("forward")
                        .setDescription("Forward the song the given amount of seconds")
                        .addIntegerOption(o => o.setName('seconds').setDescription('Amount of seconds').setRequired(true))
                        .toJSON()
}