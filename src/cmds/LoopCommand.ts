import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LoopType } from "../types/ConnectedServer.type";

export const Command: BaseCommand = {
    name: "loop",
    description: "Loop your whole queue or just a single song 24/7!",
    aliases: [],
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);

        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);

        if (!player ||!player.track) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        if (!(interaction.member as GuildMember).voice?.channelId || (interaction.member as GuildMember).voice.channelId != server.voiceChannelId) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("You must be connected to the same voice channel as " + Cadence.BotName + "!") ], ephemeral: true });
            return;
        }

        const loopQueue = interaction.options.getBoolean('queue', false);

        // no args + no loop = track loop
        if (!loopQueue && server.loop == LoopType.NONE) {
            server.loop = LoopType.TRACK;
            server.getCurrentTrack().looped = true;

            interaction.reply({ embeds: [ EmbedHelper.Info("Looping the current track! If you wish to loop the whole queue, use `" + CadenceDiscord.getInstance().getServerPrefix(interaction.guildId) + "loop queue`.") ]});
            message.reply({ embeds: [ EmbedHelper.Info("Looping the current track! If you wish to loop the whole queue, use `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "loop queue`.") ]});
            server.updatePlayerControllerButtonsIfAny();
            return;
        }

        // no args + any loop = disable loop
        if (!loopQueue && server.loop != LoopType.NONE) {
            server.loop = LoopType.NONE;

            server.getCurrentTrack().looped = false;
            server.loopQueue(false);

            interaction.reply({ embeds: [ EmbedHelper.Info("Disabled loop!") ]});
            message.reply({ embeds: [ EmbedHelper.Info("Disabled loop!") ]});
            server.updatePlayerControllerButtonsIfAny();
            return;
        }

        // args queue + no loop or loop track = loop queue
        if (loopQueue && server.loop != LoopType.QUEUE) {
            if (server.loop == LoopType.TRACK) {
                server.loop = LoopType.NONE;
                server.getCurrentTrack().looped = false;
            }
            
            server.loopQueue(true);
            interaction.reply({ embeds: [ EmbedHelper.Info("Looping the whole queue!") ]});
            message.reply({ embeds: [ EmbedHelper.Info("Looping the whole queue!") ]});
            server.updatePlayerControllerButtonsIfAny();
            return;
        }
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("loop")
                        .setDescription("Loop your whole queue or just a single song 24/7!")
                        .addBooleanOption(o => o.setName("queue").setDescription("Loop whole queue or just the current song").setRequired(false))
                        .toJSON()
}