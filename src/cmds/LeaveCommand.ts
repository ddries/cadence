import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";

class LeaveCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();
        this.name = "leave";
        this.aliases = ["stop", "dc"];
        this.description = "Leave the current voice session";
    }

    public async run(m: Message, args: string[]): Promise<void> {
        const server = CadenceMemory.getInstance().getConnectedServer(m.guildId);

        if (server && server.voiceChannelId != m.member.voice.channelId) {
            m.reply({ embeds: [ EmbedHelper.NOK("I'm already being used in another voice channel!") ]});
            return;
        }

        const b = await CadenceLavalink.getInstance().leaveChannel(m.guildId);
        if (b) {
            m.react('👋')
        }
    }

}
export default new LeaveCommand();