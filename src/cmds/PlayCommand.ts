import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import CadenceSpotify from "../api/Cadence.Spotify";
import CadenceTrack from "../types/CadenceTrack.type";
import { LavalinkResult } from "../types/TrackResult.type";

export const Command: BaseCommand = {
    name: "play",
    description: "Play the given song as a link or keyworkds to search for. Accepts playlists!",
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        let linkOrKeyword: string = interaction.options.getString('input', true);

        if (!(interaction.member as GuildMember).voice?.channelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You must be connected to a voice channel!") ], ephemeral: true });
            return;
        }

        const oldServer = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (oldServer && oldServer.voiceChannelId != (interaction.member as GuildMember).voice.channelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("I'm already being used in another voice channel!") ], ephemeral: true });
            return;
        }

        await interaction.deferReply();

        if (!(await CadenceLavalink.getInstance().joinChannel(
            (interaction.member as GuildMember).voice.channelId,
            interaction.guildId,
            interaction.channel,
            interaction.guild.shardId
        ))) {
            interaction.editReply({ embeds: [ EmbedHelper.NOK("I can't join that voice channel! Do I have enough permissions?") ] });
            return;
        }

        let server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);
        
        let result: LavalinkResult = null;
        if (CadenceLavalink.getInstance().isValidUrl(linkOrKeyword)) {
            if (linkOrKeyword.includes("youtube") || linkOrKeyword.includes("you")) {
                result = await CadenceLavalink.getInstance().resolveLinkIntoTracks(linkOrKeyword);
            } else {
                result = await CadenceSpotify.getInstance().resolveLinkIntoTracks(linkOrKeyword);
            }
        } else {
            result = await CadenceLavalink.getInstance().resolveYoutubeIntoTracks(linkOrKeyword.trim());
        }
        
        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);

        if (result == null) {
            interaction.editReply({ embeds: [ EmbedHelper.NOK("I couldn't find anything with that link :(") ] });
            return;
        }
        
        switch (result.loadType) {
            case "LOAD_FAILED":
            case "NO_MATCHES":
                interaction.editReply({ embeds: [ EmbedHelper.NOK("I couldn't find anything with that link :(") ] });
                break;
            case "SEARCH_RESULT":
            case "TRACK_LOADED":
                const track = result.tracks[0];
                const ct = new CadenceTrack(track.track, track.info, interaction.user.id);
                server.addToQueue(ct);

                if (!player.track) {
                    if (CadenceLavalink.getInstance().playNextSongInQueue(player)) {
                        const m = await interaction.editReply({ embeds: [ EmbedHelper.np(ct, player.position) ], components: server._buildButtonComponents() }) as Message;
                        server.setMessageAsMusicPlayer(m);
                    }
                } else {
                    interaction.editReply({ embeds: [ EmbedHelper.songBasic(track.info, interaction.user.id, "Added to Queue") ]});

                    // if there was any current player controller
                    // we update buttons (next/back changed?)
                    server.updatePlayerControllerButtonsIfAny();
                }

                // CadenceDb.getInstance().pushNewSong({
                //     guildId: message.guildId,
                //     requestedById: message.author.id,
                //     dateUnix: (Date.now() / 1000).toString(),
                //     songUrl: ct.trackInfo.uri
                // });
                
                break;
            case "PLAYLIST_LOADED":
                for (let i = 0; i < result.tracks.length; ++i) {
                    server.addToQueue(new CadenceTrack(result.tracks[i].track, result.tracks[i].info, interaction.user.id));
                }

                if (!player.track) {
                    if (CadenceLavalink.getInstance().playNextSongInQueue(player)) {
                        const m = await interaction.editReply({ embeds: [ EmbedHelper.np(ct, player.position) ], components: server._buildButtonComponents()}) as Message;
                        server.setMessageAsMusicPlayer(m);
                    }
                } else {
                    // if there was any current player controller
                    // we update buttons (next/back changed?)
                    server.updatePlayerControllerButtonsIfAny();
                }

                interaction.editReply({ embeds: [ EmbedHelper.OK(`Added **${result.tracks.length}** songs to the queue`) ]});
                break;            
        }
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("play")
                        .setDescription("Play the given song as a link or keyworkds to search for. Accepts playlists!")
                        .addStringOption(o => o.setName("input").setDescription("Link or keywords").setRequired(true))
                        .toJSON()
}