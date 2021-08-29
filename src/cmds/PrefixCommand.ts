import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";

class HelpCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "prefix";
        this.description = "Displays or modifies the current prefix for the server";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
        if (args.length <= 0) {
            message.reply({ embeds: [ EmbedHelper.Info("Current prefix: `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "`\nUse: `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "prefix [new prefix]` to modify it.") ]});
            return;
        }

        const newPrefix: string = args[0];
        const currentPrefix = CadenceDiscord.getInstance().getServerPrefix(message.guildId);

        if (newPrefix == currentPrefix) {
            message.reply({ embeds: [ EmbedHelper.NOK("The new prefix cannot be the same!") ]});
            return;
        }

        if (newPrefix.length > 5) {
            message.reply({ embeds: [ EmbedHelper.NOK("Maximum length is of 5 characters!") ]});
            return;
        }

        CadenceDiscord.getInstance().setServerPrefix(message.guildId, newPrefix);
        message.reply({ embeds: [ EmbedHelper.OK("Updated prefix to `" + newPrefix + "`!") ]});
    }
}

export default new HelpCommand();