import discord, { CommandInteraction } from 'discord.js';

export default interface BaseCommand {
    name: string;
    aliases: string[];
    description: string;

    requireAdmin: boolean;
    disabled?: boolean;

    run(interaction: CommandInteraction): void;
    slashCommandBody: any;
}