import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDiscord from "../api/Cadence.Discord";
import { EmbedColor } from "../api/Cadence.Embed";
import Cadence from "../Cadence";

export const Command: BaseCommand = {
    name: "help",
    description: "Display help",
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const musicCommands = ["play", "np", "pause", "resume", "queue", "shuffle", "jump", "remove", "forward", "rewind", "goto", "move", "swap"];
        const utilityCommands = ["help", "prefix", "ping"];

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
                ]
            );

        const embed = new MessageEmbed()
            .setURL('https://cadence.driescode.dev')
            .setColor(EmbedColor.Info)
            .setAuthor({
                name: Cadence.BotName,
                iconURL: 'https://cdn.discordapp.com/attachments/692929962486792235/881589916901998652/adagio.jpg',
                url: 'https://cadence.driescode.dev'
            })
            .setDescription(Cadence.BotName + ' is the easiest way to play music in Discord. Add it to your server and start playing the best music with your friends!\n\nJump between help categories with the buttons below.')

        await interaction.reply({ embeds: [ embed ], components: [ rowOptions ] });
        const reply = await interaction.fetchReply() as Message;

        const filter = (b) => b.user.id === interaction.user.id;
        const collector = reply.createMessageComponentCollector({
            filter,
            time: 120 * 1000
        });

        const _buildDescription = (commands: string[]): string => {
            let desc = "";
            let allCommands = CadenceDiscord.getInstance().getAllCommands();
            for (const [key, cmd] of allCommands.entries()) {
                if (!commands.includes(key)) continue;
    
                let aliasString = "";
    
                desc += "`" + CadenceDiscord.getInstance().getServerPrefix(interaction.guildId) + cmd.name + "`: ";
                if (aliasString.length > 0)
                    desc += aliasString + " ";
                    
                desc += cmd.description + "\n\n";
            }
    
            return desc;
        }

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
                            .setAuthor({
                                name: Cadence.BotName,
                                iconURL: 'https://cdn.discordapp.com/attachments/692929962486792235/881589916901998652/adagio.jpg',
                                url: 'https://cadence.driescode.dev'
                            })
                            .setDescription(_buildDescription(array))
                    ]
                })
            }).catch(e => {
                console.log(e);
            });
        });
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("help")
                        .setDescription("Display help")
                        .toJSON()
}