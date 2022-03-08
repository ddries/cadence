import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDb from "../api/Cadence.Db";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";


class PrefixCommand extends BaseCommand {
    public name: string;
    public aliases: string[];
    public description: string;
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "prefix";
        this.description = "Show/Change the prefix of the bot";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public async run(m: Message, args: string[]): Promise<void> {
        const currentPrefix = CadenceDiscord.getInstance().getServerPrefix(m.guildId);

        if (args.length <= 0) {
            m.reply({ embeds: [ EmbedHelper.Info('Current prefix: `' + currentPrefix + '`\nUse `' + currentPrefix + 'prefix [new prefix]` to change it.') ]})
            return;
        }

        const newPrefix = args[0];

        if (newPrefix.length > 5) {
            m.reply({ embeds: [ EmbedHelper.NOK("Maximum prefix length is 5 characters.") ]});
            return;
        }

        try {
            await CadenceDb.getInstance().createOrUpdateServer({
                guildId: m.guildId,
                prefix: newPrefix
            });

            CadenceDiscord.getInstance().setServerPrefix(m.guildId, newPrefix);

            m.reply({ embeds: [ EmbedHelper.OK("Prefix is now updated to `" + newPrefix + '`.') ]});
        } catch (e) {
            m.reply({ embeds: [ EmbedHelper.NOK("Could not update prefix correctly.") ]});
        }
    }

}

export default new PrefixCommand();