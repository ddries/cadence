import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";

class HelpCommand extends BaseCommand {
    public name: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "help";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public run(message: Message): void {
        message.reply('Working!');
    }
}

export default new HelpCommand();