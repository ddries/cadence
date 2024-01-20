import discord, { CommandInteraction, ContextMenuInteraction } from 'discord.js';

export default interface BaseCommand {
    name: string;
    description: string;

    requireAdmin: boolean;
    disabled?: boolean;

    run(interaction: CommandInteraction | ContextMenuInteraction): void;
    slashCommandBody: any;
}