import { Client, Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import { EmbedColor } from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import Cadence from "../Cadence";

class HelpCommand extends BaseCommand {
    public name: string;
    public description: string;
    public aliases: string[];
    public requireAdmin: boolean;

    constructor() {
        super();

        this.name = "help";
        this.description = "Display help and information";
        this.aliases = ["h"];
        this.requireAdmin = false;
    }

    public async run(m: Message, args: string[]): Promise<void> {
        const musicCommands = ["play", "np", "pause", "resume", "next", "queue", "shuffle", "clear", "jump", "remove", "loop", "forward"];
        const utilityCommands = ["help", "leave", "prefix", "ping", "load", "save", "playlists"];

        const rowOptions = new MessageActionRow()
            .addComponents(
                [
                    new MessageButton()
                        .setStyle('SECONDARY')
                        .setLabel('Music')
                        .setCustomId('help-music'),
                    new MessageButton()
                        .setStyle('SECONDARY')
                        .setLabel('Utility')
                        .setCustomId('help-util'),
                    new MessageButton()
                        .setStyle('LINK')
                        .setLabel('Invite')
                        .setURL('https://theradiobot.com/join'),
                    // new MessageButton()
                    //     .setStyle('LINK')
                    //     .setLabel('Vote')
                    //     .setURL('https://top.gg/bot/778044858760953866/vote')
                ]
            );

        const embed = new MessageEmbed()
            .setURL('https://cadence.driescode.dev')
            .setColor(EmbedColor.Info)
            .setAuthor(Cadence.BotName, 'https://cdn.discordapp.com/attachments/692929962486792235/881589916901998652/adagio.jpg', 'https://cadence.driescode.dev')
            .setDescription(Cadence.BotName + ' is the easiest way to play music in Discord. Add it to your server and start playing the best music with your friends!\n\nJump between help categories with the buttons below.')

        const reply = await m.reply({ embeds: [ embed ], components: [ rowOptions ] });

        const filter = (b) => b.user.id === m.author.id;
        const collector = reply.createMessageComponentCollector({
            filter,
            time: 120 * 1000
        });

        collector.on('collect', interaction => {
            interaction.deferUpdate().then(async () => {
                let array = [];
                switch (interaction.customId) {
                    case 'help-music':
                        array = musicCommands;
                        break;
                    case 'help-util':
                        array = utilityCommands;
                        break;
                }

                await interaction.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setURL('https://cadence.driescode.dev')
                            .setColor(EmbedColor.Info)
                            .setAuthor(Cadence.BotName, 'https://cdn.discordapp.com/attachments/692929962486792235/881589916901998652/adagio.jpg', 'https://cadence.driescode.dev')
                            .setDescription(this._buildDescription(m, CadenceDiscord.getInstance().Client, array))
                    ]
                })
            }).catch(e => {
                console.log(e);
            });
        });
    }

    private _buildDescription(message: Message, client: Client, commands: string[]): string {
        let desc = "";
        let allCommands = CadenceDiscord.getInstance().getAllCommands();
        for (const [key, cmd] of allCommands.entries()) {
            if (!commands.includes(key)) continue;

            let aliasString = "";
            if (cmd.aliases && cmd.aliases.length > 0) {
                aliasString = "( ";
                for (let j = 0; j < cmd.aliases.length; j++) {
                    aliasString += CadenceDiscord.getInstance().getServerPrefix(message.guild.id) + cmd.aliases[j];
                    if (j+1 < cmd.aliases.length) {
                        aliasString += ", ";
                    } else {
                        aliasString += " )";
                    }
                }
            }

            desc += "`" + CadenceDiscord.getInstance().getServerPrefix(message.guild.id) + cmd.name + "`: ";
            if (aliasString.length > 0)
                desc += aliasString + " ";
                
            desc += cmd.description + "\n\n";
        }

        return desc;
    }

}
export default new HelpCommand();