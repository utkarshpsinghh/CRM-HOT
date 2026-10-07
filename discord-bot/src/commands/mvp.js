import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('mvp')
  .setDescription('Spotlight the top alliance battle MVP and attendance champions');

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

    const embed = createBaseEmbed('👑 [HOT] Battle MVP of the Alliance', COLORS.GOLD)
      .setDescription(
        `Hail the reigning combat champion of **Kingdom #1391 [HOT]**!\n` +
        `Leading the alliance with unflinching dedication and battle presence.`
      )
      .addFields(
        {
          name: `🥇 SUPREME TITAN: ${champion.name}`,
          value: [
            `• **Alliance Rank:** ${formatRank(champion.allianceRank)}`,
            `• **Player ID:** \`${champion.gameId || 'Not Linked'}\``,
            `• **Attendance Turnout:** ${renderProgressBar(champion.attendanceRate)}`,
            `• **Battles Attended:** **${champion.attendedCount}** / ${champion.totalEvents} Events`,
            `• **Reliability Rating:** **${champion.reliabilityScore} / 100**`,
            `• **Disciplinary Record:** 🟢 **0 Strikes**`,
          ].join('\n'),
          inline: false,
        }
      );

    if (runnersUp.length > 0) {
      const medals = ['🥈', '🥉', '🎖️', '🎖️'];
      const runnersText = runnersUp.map((m, idx) => {
        const medal = medals[idx] || '🎖️';
        return `${medal} **#${m.rank} ${m.name}** [${m.allianceRank}] — **${m.attendanceRate}%** (${m.attendedCount}/${m.totalEvents} battles)`;
      }).join('\n');

      embed.addFields({
        name: '⚔️ Honor Roll: Elite Contenders',
        value: runnersText,
        inline: false,
      });
    }

    embed.setFooter({
      text: 'Kingdom #1391 • Loyalty • Honor • Victory',
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /mvp error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to determine Alliance MVP: \`${err.message}\``
        ),
      ],
    });
  }
}
