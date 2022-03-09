import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Message, MessageActionRow, MessageButton } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import EmbedHelper from "../api/Cadence.Embed";
import CadenceLavalink from "../api/Cadence.Lavalink";
import CadenceMemory from "../api/Cadence.Memory";
import { LoopType } from "../types/ConnectedServer.type";

export const Command: BaseCommand = {
    name: "queue",
    description: "Display the current queue",
    aliases: ["q"],
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const server = CadenceMemory.getInstance().getConnectedServer(interaction.guildId);
        if (!server) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        const player = CadenceLavalink.getInstance().getPlayerByGuildId(interaction.guildId);
        if (!player) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing playing!") ], ephemeral: true });
            return;
        }

        if (server.isQueueEmpty()) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("There's nothing in the queue!") ], ephemeral: true });
            return;
        }

        let page = (server.getCurrentQueueIndex() / 10 | 0) + 1;

        const requiredPages = Math.ceil(server.getQueue().length / 10);
        const embed = EmbedHelper.queue(server.getQueue(), page, requiredPages, server.loop == LoopType.QUEUE, server.shuffle);

        if (requiredPages <= 1) {
            interaction.reply({ embeds: [ embed ] });
        } else {
            const btnRow = new MessageActionRow()
                .addComponents(
                    [
                        new MessageButton()
                            .setStyle('SECONDARY')
                            .setLabel('Previous')
                            .setCustomId('list-prev'),
                        new MessageButton()
                            .setStyle('SECONDARY')
                            .setLabel('Next')
                            .setCustomId('list-next')
                    ]
            );

            interaction.reply({ embeds: [ embed ], components: [ btnRow ] });
            const reply = await interaction.fetchReply() as Message;

            const filter = b => b.user.id === interaction.user.id;
            const collector = reply.createMessageComponentCollector({
                filter,
                time: 30 * 1000
            });

            collector.on('collect', (interaction) => {
                interaction.deferUpdate().then(async () => {
                    switch (interaction.customId) {
                        case 'list-prev':
                            page--;
                            if (page < 1)
                                page = requiredPages;
                            break;
                        case 'list-next':
                            page++;
                            if (page > requiredPages)
                                page = 1;
                            break;
                    }
    
                    await interaction.editReply({
                        embeds: [ EmbedHelper.queue(server.getQueue(), page, requiredPages, server.loop == LoopType.QUEUE) ]
                    });
                }).catch(e => {
                    console.log(e);
                });
            });
        }
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("queue")
                        .setDescription("Display the current queue")
                        .toJSON()
}