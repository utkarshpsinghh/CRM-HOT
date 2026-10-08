import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('mvp')
  .setDescription('View the top attendance MVP and top contenders');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const lbRes = await crmApi.getLeaderboard(10, 'attendanceRate');
    const leaders = lbRes.data || [];

    if (leaders.length === 0) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('No Data Available', COLORS.GOLD).setDescription(
            'No battle attendance records found to calculate the MVP.'
          ),
        ],
      });
    }

    const champion = leaders[0];
    const runnersUp = leaders.slice(1, 5);

    const embed = createBaseEmbed('[HOT] OneForAll • Attendance MVP', COLORS.GOLD)
      .setDescription(
        `Top attendance performer in **[HOT] OneForAll** (Kingdom #1391)`
      )
      .addFields(
        {
          name: `#1 MVP: ${champion.name}`,
          value: [
            `• **Alliance Rank:** ${formatRank(champion.allianceRank)}`,
            `• **Player ID:** \`${champion.gameId || 'Not Linked'}\``,
            `• **Attendance Rate:** ${renderProgressBar(champion.attendanceRate)}`,
            `• **Battles Attended:** **${champion.attendedCount}** / ${champion.totalEvents}`,
            `• **Strikes:** \`0 / 3\``,
          ].join('\n'),
          inline: false,
        }
      );

    if (runnersUp.length > 0) {
      const medals = ['🥈', '🥉', '4.', '5.'];
      const runnersText = runnersUp.map((m, idx) => {
        const medal = medals[idx] || `${idx + 2}.`;
        return `${medal} **#${m.rank} ${m.name}** [${m.allianceRank}] — **${m.attendanceRate}%** (${m.attendedCount}/${m.totalEvents} battles)`;
      }).join('\n');

      embed.addFields({
        name: 'Top Contenders',
        value: runnersText,
        inline: false,
      });
    }

    embed.setFooter({
      text: 'Kingdom #1391 • [HOT] OneForAll',
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /mvp error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to determine MVP: \`${err.message}\``
        ),
      ],
    });
  }
}
