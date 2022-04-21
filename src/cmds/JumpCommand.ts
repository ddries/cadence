import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "jump",
    description: "Jump to the selected song from queue",
    aliases: ["j"],
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);

        if (!player) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
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

        if (isNaN(idx)) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Please enter the song index! Usage: " + CadenceDiscord.getInstance().getServerPrefix(interaction.guildId) + "jump [index].") ], ephemeral: true });
            return;
        }

        if (!server.checkIndex(idx)) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index!") ], ephemeral: true });
            return;
        }

        idx--;

        // given index is real index + 1 (thus, real is given -1)
        // if no loop is active we are removing 1 song in handleTrackEnded (currently played)
        // thus, given index is now index, real index is last given index - 1 (thus, real is first given -2)
        // then we jump to the given song
        // so we remove until the real index is now index 0

        // if queue loop is active then real index is just given - 1 as we dont remove songs then

        server.handleTrackEnded(false);
        const song = server.jumpToSong(idx);

        CadenceLavalink.getInstance().playTrack(song, player.connection.guildId);

        const message = await interaction.reply({ embeds: [ EmbedHelper.np(song, server.player.position) ], components: server._buildButtonComponents(), fetchReply: true }) as Message;
        server.setMessageAsMusicPlayer(message);
        // server.sendPlayerController();
        // if (!Cadence.NowPlayingEnabled)
        //     return;

        // const lastMessage = server.textChannel.lastMessage;
        // let m: Message = null;

        // if (lastMessage.id != server.nowPlayingMessage?.id) {
        //     m = await server.textChannel.send({ embeds: [ EmbedHelper.songBasic(song.trackInfo, song.requestedById, "Now Playing!") ]});
        // } else {
        //     m = await lastMessage.edit({ embeds: [ EmbedHelper.songBasic(song.trackInfo, song.requestedById, "Now Playing!") ]});
        // }

        // server.nowPlayingMessage = m;
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("jump")
                        .setDescription("Jump to the selected song from queue")      
                        .addIntegerOption(o => o.setName("song").setDescription("Song number to jump at").setRequired(true).setMinValue(1))
                        .toJSON()
}