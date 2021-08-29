import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceLavalink from "../api/Cadence.Lavalink";

class LeaveCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();
        this.name = "leave";
        this.aliases = ["stop"];
        this.description = "Leave the current voice session";
    }

    public async run(m: Message, args: string[]): Promise<void> {
        const b = await CadenceLavalink.getInstance().leaveChannel(m.guildId);
        if (b) {
            m.react('👋')
        }
    }

}
export default new LeaveCommand();