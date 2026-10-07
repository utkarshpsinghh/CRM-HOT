import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('inactives')
  .setDescription('View members who are inactive or have active penalty strikes')
  .addStringOption(option =>
    option
      .setName('filter')
      .setDescription('Filter criteria')
      .addChoices(
        { name: 'All Inactive Members', value: 'inactive' },
        { name: 'Members with Strikes (1+ Strikes)', value: 'strikes' },
        { name: 'Critical Penalty (2+ Strikes)', value: 'critical' }
      )
  );

export async function execute(interaction) {
  const filter = interaction.options.getString('filter') || 'inactive';
  await interaction.deferReply();

  try {
    const res = await crmApi.getAllMembers();
    const members = res.data || [];

    let filtered = [];
    let title = '';

    if (filter === 'inactive') {
      filtered = members.filter(m => m.status === 'Inactive' || m.status === 'Needs Attention');
      title = '💤 Inactive Alliance Members';
    } else if (filter === 'strikes') {
      filtered = members.filter(m => (m.strikes || 0) >= 1);
      title = '⚠️ Members with Active Strikes (1+)';
    } else if (filter === 'critical') {
      filtered = members.filter(m => (m.strikes || 0) >= 2);
      title = '🚨 Members at Critical Strike Risk (2+)';
    }

    if (filtered.length === 0) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('All Clear! 🎉', COLORS.EMERALD).setDescription(
            `No members found matching the **${filter}** filter criteria. The alliance is in great standing!`
          ),
        ],
      });
    }

    const lines = filtered.slice(0, 20).map(m => {
      const strikeTag = m.strikes > 0 ? `• **Strikes:** \`${m.strikes}/3\`` : '';
      const statusTag = `• **Status:** \`${m.status || 'Active'}\``;
      const gameId = m.gameId ? `\`[ID: ${m.gameId}]\`` : '';
      return `• **${m.name}** ${gameId} (${formatRank(m.rank)})\n  ↳ ${statusTag} ${strikeTag}`;
    });

    const embed = createBaseEmbed(title, filter === 'critical' ? COLORS.CRIMSON : COLORS.GOLD)
      .setDescription(
        `Found **${filtered.length}** members matching criteria:\n\n` +
        lines.join('\n\n')
      );

      embed.setFooter({
        text: `Showing first 20 of ${filtered.length} members • Kingdom #1391 [HOT] Alliance`,
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /inactives error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Error', COLORS.CRIMSON).setDescription(
          `Failed to load member status: \`${err.message}\``
        ),
      ],
    });
  }
}
