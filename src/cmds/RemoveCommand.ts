import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, TextBasedChannel } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LoopType } from "../types/ConnectedServer.type";

export const Command: BaseCommand = {
    name: "remove",
    description: "Remove the selected song from queue",
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        if (!CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId)) {
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

        let idx = interaction.options.getInteger('song', true);

        if (idx > server.getQueue().length) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index!") ], ephemeral: true });
            return;
        }

        idx--;

        const trackName = server.getSongAtIndex(idx)?.trackInfo.title;

        server.removeFromQueueIdx(idx);
        interaction.reply({ embeds: [ EmbedHelper.OK('🗑 Removed ' + trackName) ]});

        if (idx == server.getCurrentQueueIndex()) {
            if (await CadenceLavalink.getInstance().playNextSongInQueue(server.player)) {
                const m = await (server.musicPlayer.message.channel as TextBasedChannel).send({ embeds: [ EmbedHelper.np(server.getCurrentTrack(), server.player.position) ], components: server._buildButtonComponents() });
                server.setMessageAsMusicPlayer(m);
            }
        }
    },
    
    slashCommandBody: new SlashCommandBuilder()
                        .setName("remove")
                        .setDescription("Remove the selected song from queue")
                        .addIntegerOption(o => o.setName("song").setDescription("Song number").setMinValue(1).setRequired(true))
                        .toJSON()
}