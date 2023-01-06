import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "move",
    description: "Move one song from queue to the desired position",
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing :(") ], ephemeral: true });
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);

        if (!player) {
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

        let idxFrom = interaction.options.getInteger('song', true);
        let idxTo = interaction.options.getInteger('position', false);
        
        if (!server.checkIndex(idxFrom) || (!isNaN(idxTo) && idxTo != null && !server.checkIndex(idxTo))) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid index :(") ], ephemeral: true });
            return;
        }

        idxFrom--;

        // cannot move current song
        // xd
        if (idxFrom == server.getCurrentQueueIndex()) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("I'm not smart enough to move the current track :(") ], ephemeral: true });
            return;
        }

        // if the user does not give any position
        // then it is moved to the very next position
        if (idxTo == null) {
            idxTo = server.getCurrentQueueIndex() + 1;
        } else {
            idxTo--;

            if (idxTo == server.getCurrentQueueIndex()) {
                interaction.reply({ embeds: [ EmbedHelper.NOK("I'm not smart enough to move the current track :(\nAre you trying to replace the current song? Move to the next position in queue and skip!") ], ephemeral: true });
                return;
            }
        }

        server.moveSong(idxFrom, idxTo);
        const track = server.getSongAtIndex(idxTo);
        
        if (!track) {
            interaction.reply({ embeds: [ EmbedHelper.OK("Song moved.") ]});
        } else {
            interaction.reply({ embeds: [ EmbedHelper.OK(track.info.title + " moved to #" + (idxTo + 1)) ]});
        }
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("move")
                        .setDescription("Move one song from queue to the desired position")      
                        .addIntegerOption(o => o.setName("song").setDescription("Desired song number to move").setRequired(true).setMinValue(1))
                        .addIntegerOption(o => o.setName("position").setDescription("Desired new position for the song, [default]: next song").setRequired(false).setMinValue(1))
                        .toJSON()
}