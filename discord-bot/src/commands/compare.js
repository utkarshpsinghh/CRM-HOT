import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('compare')
  .setDescription('Head-to-head battle showdown comparing two alliance members')
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
            `Could not find player **"${p1Query}"** in the roster.`
          ),
        ],
      });
    }

    if (!p2) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player 2 Not Found', COLORS.CRIMSON).setDescription(
            `Could not find player **"${p2Query}"** in the roster.`
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
      reliabilityScore: 0,
    };
    const lb2 = leaderboard.find(l => l.memberId === p2.id) || {
      attendanceRate: 0,
      attendedCount: 0,
      totalEvents: 0,
      rank: '-',
      reliabilityScore: 0,
    };

    // Determine who leads
    let verdict = '';
    if (lb1.attendanceRate > lb2.attendanceRate) {
      const diff = (lb1.attendanceRate - lb2.attendanceRate).toFixed(1);
      verdict = `🏆 **${p1.name}** holds the battle advantage by **+${diff}%** attendance turnout!`;
    } else if (lb2.attendanceRate > lb1.attendanceRate) {
      const diff = (lb2.attendanceRate - lb1.attendanceRate).toFixed(1);
      verdict = `🏆 **${p2.name}** holds the battle advantage by **+${diff}%** attendance turnout!`;
    } else {
      verdict = `⚖️ **Deadlock Draw!** Both warriors have an identical **${lb1.attendanceRate}%** attendance record!`;
    }

    const embed = createBaseEmbed(`⚔️ Head-to-Head Showdown`, COLORS.GOLD)
      .setDescription(
        `Comparing battle records for **${p1.name}** vs **${p2.name}**\n\n${verdict}`
      )
      .addFields(
        {
          name: `🛡️ ${p1.name}`,
          value: [
            `• **Rank:** ${formatRank(p1.rank)}`,
            `• **ID:** \`${p1.gameId || 'N/A'}\``,
            `• **Leaderboard:** **#${lb1.rank}**`,
            `• **Attendance:** ${renderProgressBar(lb1.attendanceRate)}`,
            `• **Battles:** **${lb1.attendedCount}** / ${lb1.totalEvents}`,
            `• **Reliability:** **${lb1.reliabilityScore} / 100**`,
            `• **Strikes:** \`${p1.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: `⚔️ ${p2.name}`,
          value: [
            `• **Rank:** ${formatRank(p2.rank)}`,
            `• **ID:** \`${p2.gameId || 'N/A'}\``,
            `• **Leaderboard:** **#${lb2.rank}**`,
            `• **Attendance:** ${renderProgressBar(lb2.attendanceRate)}`,
            `• **Battles:** **${lb2.attendedCount}** / ${lb2.totalEvents}`,
            `• **Reliability:** **${lb2.reliabilityScore} / 100**`,
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
          `Failed to compare warriors: \`${err.message}\``
        ),
      ],
    });
  }
}
