import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import BaseCommand from "../api/Cadence.BaseCommand";
import CadenceDb from "../api/Cadence.Db";
import CadenceDiscord from "../api/Cadence.Discord";
import EmbedHelper from "../api/Cadence.Embed";

export const Command: BaseCommand = {
    name: "prefix",
    description: "Show/change the prefix",
    aliases: [],
    requireAdmin: false,

    run: async (interaction: CommandInteraction): Promise<void> => {
        const currentPrefix = CadenceDiscord.getInstance().getServerPrefix(interaction.guildId);
        const prefix = interaction.options.getString('prefix', false);

        if (prefix == null) {
            interaction.reply({ embeds: [ EmbedHelper.Info('Current prefix: `' + currentPrefix + '`\nUse `' + currentPrefix + 'prefix [new prefix]` to change it.') ], ephemeral: true })
            return;
        }

        if (prefix.length > 5) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Maximum prefix length is 5 characters.") ], ephemeral: true });
            return;
        }

        try {
            await CadenceDb.getInstance().createOrUpdateServer({
                guildId: interaction.guildId,
                prefix: prefix
            });

            CadenceDiscord.getInstance().setServerPrefix(interaction.guildId, prefix);

            interaction.reply({ embeds: [ EmbedHelper.OK("Prefix is now updated to `" + prefix + '`.') ]});
        } catch (e) {
            interaction.reply({ embeds: [ EmbedHelper.NOK("Could not update prefix correctly.") ], ephemeral: true });
        }
    },

    slashCommandBody: new SlashCommandBuilder()
                        .setName("prefix")
                        .setDescription("Show/change the prefix")
                        .addStringOption(o => o.setName("prefix").setDescription("New prefix").setRequired(false))
                        .toJSON()
}