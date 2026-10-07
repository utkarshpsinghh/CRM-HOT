import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account to your in-game Kingdom #1391 [HOT] profile')
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Your in-game Name or Player ID (e.g. 205063171)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const query = interaction.options.getString('player');
  await interaction.deferReply();

  try {
    const member = await crmApi.searchMember(query);

    if (!member) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player Not Found', COLORS.CRIMSON).setDescription(
            `Could not find any member matching **"${query}"** in the Kingdom #1391 [HOT] roster.\n\n` +
            `*Tip: Please check your spelling or use your exact numeric Player ID.*`
          ),
        ],
      });
    }

    const success = await crmApi.linkDiscordUser(interaction.user.id, member);

    if (!success) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Linking Failed', COLORS.CRIMSON).setDescription(
            `Unable to save your account link right now. Please try again later.`
          ),
        ],
      });
    }

    const embed = createBaseEmbed('🔗 Account Linked Successfully', COLORS.EMERALD)
      .setDescription(
        `Successfully linked <@${interaction.user.id}> to **${member.name}** in the [HOT] Alliance database!`
      )
      .addFields(
        {
          name: '👤 In-Game Identity',
          value: [
            `• **Name:** ${member.name}`,
            `• **Player ID:** \`${member.gameId || 'Not Linked'}\``,
            `• **Rank:** ${formatRank(member.rank)}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🛡️ Standing',
          value: [
            `• **Status:** \`${member.status || 'Active'}\``,
            `• **Strikes:** \`${member.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        }
      )
      .setFooter({
        text: 'Tip: You can now type /me anytime to quickly view your personal combat dossier!',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /link error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Error', COLORS.CRIMSON).setDescription(
          `An error occurred while linking your account: \`${err.message}\``
        ),
      ],
    });
  }
}
