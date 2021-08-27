import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import CadenceLavalink from "../api/Cadence.Lavalink";
import Logger from "../api/Cadence.Logger";

class JoinCommand extends BaseCommand {
    public name: string;
    public aliases: string[];
    public requireAdmin: boolean;

    private logger: Logger = null;

    constructor() {
        super();
        this.name = "join";
        this.logger = new Logger('cadence-cmd-join');
    }

    public async run(m: Message, args: string[]): Promise<void> {
        const channelId = args[0];
        const p = await CadenceLavalink.getInstance().joinChannel(channelId, m.guildId).catch(e => {
            this.logger?.log('could not join channel on ' + CadenceDiscord.getInstance().resolveGuildNameAndId(m.guild) + ': ' + e);
        });

        if (p)
            m.reply('done!');
    }

}
export default new JoinCommand();