import { Message } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import Config from "../api/Cadence.Config";
import Db from "../api/Cadence.Db";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper, { EmbedColor } from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import Cadence from "../Cadence";
import { LoopType } from "../types/ConnectedServer.type";

class SaveCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "save";
        this.description = "Saves the current queue in your server";
        this.aliases = [];
        this.requireAdmin = false;
    }

    public async run(message: Message, args: string[]): Promise<void> {
        if (args.length < 1) {
            message.reply({ embeds: [ EmbedHelper.NOK("Please enter a valid name! Usage: `" + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "save [name]`") ]});
            return;
        }

        let name = "";
        for (let i = 0; i < args.length; ++i) name += args[i] + " ";
        name = name.trimEnd().trimStart();

        if (name.length > 15) {
            message.reply({ embeds: [ EmbedHelper.NOK("Name cannot be longer than 15 characters!") ]});
            return;
        }

        const server = CadenceMemory.getInstance().getConnectedServer(message.guildId);

        if (!server) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(message.guildId);

        if (!player) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ]});
            return;
        }

        if (server.isQueueEmpty()) {
            message.reply({ embeds: [ EmbedHelper.NOK("There's nothing in the queue!") ]});
            return;
        }

        // if (server.getQueue().length > 100) {
        //     message.reply({ embeds: [ EmbedHelper.NOK("Queues larger than 100 tracks cannot be stored in our Bot. Please, consider create a Youtube playlist for it.") ]});
        //     return;
        // }

        const reply = await message.reply({ embeds: [ EmbedHelper.Info("You are about to save the current queue (" + server.getQueue().length + " tracks). React to the message to confirm or let the time pass to cancel.") ]});
        await reply.react('✅');
        const col = reply.createReactionCollector({ filter: (b, u) => b.emoji.name == '✅' && u.id == message.author.id, time: 10*1000, max: 1});

        col.on('collect', async _ => {
            let queueArray: any[] = [];
            const q = server.getQueue();
            for (let i = 0; i < q.length; ++i) {
                queueArray.push({base64: q[i].base64, info: q[i].trackInfo});

                if (i == q.length - 1) {
                    queueArray.push(message.guildId); // uniqueness for guild
                    try {
                        const id = await Db.getInstance().savePlaylist(message.guildId, queueArray, name);
                        message.reply({ embeds: [ EmbedHelper.OK('Successfully saved your playlist!\nUse `' + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "load " + id + "` to load it!") ]});
                    } catch (e) {
                        if (e.code == 'ER_DUP_ENTRY') {
                            message.reply({ embeds: [ EmbedHelper.NOK('Playlist already exists!\nPlease use `' + CadenceDiscord.getInstance().getServerPrefix(message.guildId) + "playlists`.") ]});
                        }
                    }
                }
            }
        });
    }
}

export default new SaveCommand();