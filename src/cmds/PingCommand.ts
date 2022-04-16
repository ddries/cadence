import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";

export const Command: BaseCommand = {
    name: "ping",
    description: "Get some feedback from cadence!",
    aliases: [],
    requireAdmin: false,

    run: (interaction: CommandInteraction): void => {
        interaction.reply({ content: "pong!", ephemeral: true });
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("ping")
                        .setDescription("Get some feedback from cadence!")
                        .toJSON()
}