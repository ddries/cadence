import discord from 'discord.js';

export default abstract class BaseCommand {
    public abstract name: string;
    public abstract aliases: string[];
    public abstract description: string;

    public abstract requireAdmin: boolean;

    public abstract run(m: discord.Message, args: string[]): void;
}