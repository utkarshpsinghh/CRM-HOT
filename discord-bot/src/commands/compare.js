import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('compare')
  .setDescription('Compare attendance records between two alliance members')
  .addStringOption(opt =>
    opt
      .setName('player1')
      .setDescription('First player name or Player ID')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('player2')
      .setDescription('Second player name or Player ID')
      .setRequired(true)
  );

export async function execute(interaction) {
  const p1Query = interaction.options.getString('player1');
  const p2Query = interaction.options.getString('player2');

  await interaction.deferReply();

  try {
    const [p1, p2, lbRes] = await Promise.all([
      crmApi.searchMember(p1Query),
      crmApi.searchMember(p2Query),
      crmApi.getLeaderboard(100),
    ]);

    if (!p1) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player 1 Not Found', COLORS.CRIMSON).setDescription(
            `Could not find player **"${p1Query}"** in the [HOT] OneForAll roster.`
          ),
        ],
      });
    }

    if (!p2) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player 2 Not Found', COLORS.CRIMSON).setDescription(
            `Could not find player **"${p2Query}"** in the [HOT] OneForAll roster.`
          ),
        ],
      });
    }

    const leaderboard = lbRes.data || [];
    const lb1 = leaderboard.find(l => l.memberId === p1.id) || {
      attendanceRate: 0,
      attendedCount: 0,
      totalEvents: 0,
      rank: '-',
    };
    const lb2 = leaderboard.find(l => l.memberId === p2.id) || {
      attendanceRate: 0,
      attendedCount: 0,
      totalEvents: 0,
      rank: '-',
    };

    let verdict = '';
    if (lb1.attendanceRate > lb2.attendanceRate) {
      const diff = (lb1.attendanceRate - lb2.attendanceRate).toFixed(1);
      verdict = `**${p1.name}** has a higher attendance rate by **+${diff}%**.`;
    } else if (lb2.attendanceRate > lb1.attendanceRate) {
      const diff = (lb2.attendanceRate - lb1.attendanceRate).toFixed(1);
      verdict = `**${p2.name}** has a higher attendance rate by **+${diff}%**.`;
    } else {
      verdict = `Both members have an identical **${lb1.attendanceRate}%** attendance rate.`;
    }

    const embed = createBaseEmbed('[HOT] OneForAll • Member Comparison', COLORS.GOLD)
      .setDescription(
        `Comparing attendance for **${p1.name}** vs **${p2.name}**\n\n${verdict}`
      )
      .addFields(
        {
          name: p1.name,
          value: [
            `• **Alliance Rank:** ${formatRank(p1.rank)}`,
            `• **Player ID:** \`${p1.gameId || 'N/A'}\``,
            `• **Leaderboard:** **#${lb1.rank}**`,
            `• **Attendance Rate:** ${renderProgressBar(lb1.attendanceRate)}`,
            `• **Battles Attended:** **${lb1.attendedCount}** / ${lb1.totalEvents}`,
            `• **Strikes:** \`${p1.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: p2.name,
          value: [
            `• **Alliance Rank:** ${formatRank(p2.rank)}`,
            `• **Player ID:** \`${p2.gameId || 'N/A'}\``,
            `• **Leaderboard:** **#${lb2.rank}**`,
            `• **Attendance Rate:** ${renderProgressBar(lb2.attendanceRate)}`,
            `• **Battles Attended:** **${lb2.attendedCount}** / ${lb2.totalEvents}`,
            `• **Strikes:** \`${p2.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        }
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /compare error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to compare members: \`${err.message}\``
        ),
      ],
    });
  }
}
