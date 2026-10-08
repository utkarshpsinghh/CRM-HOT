import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the [HOT] OneForAll attendance leaderboard')
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Number of members to display (default: 10, max: 25)')
      .setMinValue(3)
      .setMaxValue(25)
  )
  .addStringOption(option =>
    option
      .setName('sort_by')
      .setDescription('Sort by criteria')
      .addChoices(
        { name: 'Attendance Rate % (Default)', value: 'attendanceRate' },
        { name: 'Most Battles Attended', value: 'attended' }
      )
  );

export async function execute(interaction) {
  const limit = interaction.options.getInteger('limit') || 10;
  const sortBy = interaction.options.getString('sort_by') || 'attendanceRate';

  await interaction.deferReply();

  try {
    const res = await crmApi.getLeaderboard(limit, sortBy);
    const leaders = res.data || [];
    const totalCompleted = res.totalCompletedEvents || 0;

    if (leaders.length === 0) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Leaderboard Empty', COLORS.BRONZE).setDescription(
            'No attendance records found yet to compute the leaderboard.'
          ),
        ],
      });
    }

    const medals = ['🥇', '🥈', '🥉'];

    const leaderLines = leaders.map((m, idx) => {
      const medal = medals[idx] || `\`#${m.rank}\``;
      const rankTag = `[${m.allianceRank || 'Member'}]`;
      const rateText = `**${m.attendanceRate.toFixed(1)}%**`;
      const battleCount = `(${m.attendedCount}/${m.totalEvents} events)`;

      return `${medal} **${m.name}** ${rankTag} — ${rateText} ${battleCount}`;
    });

    const embed = createBaseEmbed('[HOT] OneForAll • Attendance Leaderboard')
      .setDescription(
        `Top **${leaders.length}** members sorted by **${sortBy === 'attended' ? 'Total Battles Attended' : 'Attendance Rate'}**\n` +
        `Total Completed Battles: **${totalCompleted}**\n\n` +
        leaderLines.join('\n\n')
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /leaderboard error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Leaderboard Error', COLORS.CRIMSON).setDescription(
          `Failed to load leaderboard: \`${err.message}\``
        ),
      ],
    });
  }
}
