import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import Cadence from "../Cadence";

class PingCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "ping";
        this.description = "Get some feedback from " + Cadence.BotName + "!";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public run(message: Message): void {
        message.reply('Pong!');
    }
}

export default new PingCommand();