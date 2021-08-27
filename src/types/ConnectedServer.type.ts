import { Player } from "lavacord";

export default class ConnectedServer {
    public player: Player;
    public guildId: string;
    public voiceChannelId: string;

    constructor(player: Player, voiceChannelId: string, guildId: string) {
        this.player = player;
        this.voiceChannelId = voiceChannelId;
        this.guildId = guildId;
    }
}