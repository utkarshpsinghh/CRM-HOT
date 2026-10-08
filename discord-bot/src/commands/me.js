import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

import { requireLinkedMember, createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('me')
  .setDescription('View your personal Kingdom #1391 [HOT] combat dossier and attendance');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const member = await requireLinkedMember(interaction, 'me');
    if (!member) return;

    // Fetch attendance history and leaderboard for this member
    const [attRes, leaderboardRes] = await Promise.all([
      crmApi.getAttendance(member.id, '', 5).catch(() => ({ data: [] })),
      crmApi.getLeaderboard(100).catch(() => ({ data: [] })),
    ]);

    const recentRecords = attRes.data || [];
    const leaderboard = leaderboardRes.data || [];
    const lbEntry = leaderboard.find(l => l.memberId === member.id);

    const strikesCount = member.strikes || 0;
    const strikesDisplay = strikesCount === 0
      ? '🟢 `0 / 3` (Clean Record)'
      : strikesCount >= 3
      ? `🔴 **${strikesCount} / 3 (CRITICAL THRESHOLD)**`
      : `🟡 **${strikesCount} / 3**`;

    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;
    const attendedCount = lbEntry ? lbEntry.attendedCount : 0;
    const totalEvents = lbEntry ? lbEntry.totalEvents : 0;

    const embed = createBaseEmbed(`🛡️ [HOT] Personal Dossier: ${member.name}`)
      .setDescription(`**Kingdom #1391 Alliance Soldier Profile**`)
      .addFields(
        {
          name: '👤 Identity & Standing',
          value: [
            `• **Player Name:** ${member.name}`,
            `• **Game ID:** \`${member.gameId || 'Not Linked'}\``,
            `• **Alliance Rank:** ${formatRank(member.rank)}`,
            `• **Status:** \`${member.status || 'Active'}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '⚠️ Discipline & Standing',
          value: [
            `• **Active Strikes:** ${strikesDisplay}`,
            `• **Communication:** \`${member.communication || 'Good'}\``,
            member.note ? `• **Officer Note:** *${member.note}*` : '',
          ].filter(Boolean).join('\n'),
          inline: true,
        },
        {
          name: '📊 Battle Attendance Performance',
          value: [
            `• **Turnout Rate:** ${renderProgressBar(attendanceRate)}`,
            `• **Events Attended:** **${attendedCount}** / **${totalEvents}** Battles`,
            `• 🏆 **Leaderboard Standing:** **#${lbEntry ? lbEntry.rank : 'Unranked'}** of **${leaderboard.length || 80}** warriors`,
          ].filter(Boolean).join('\n'),
          inline: false,
        }
      );

    if (recentRecords.length > 0) {
      const historyText = recentRecords.map(r => {
        const isAttended = r.attendanceStatus === 'ATTENDED';
        const icon = isAttended ? '✅' : '❌';
        const eventName = r.eventName || r.eventType || 'Battle Event';
        const slotText = r.attendedSlot ? `(${r.attendedSlot})` : '';
        return `${icon} **${eventName}**: \`${r.attendanceStatus}\` ${slotText}`;
      }).join('\n');

      embed.addFields({
        name: '🕒 Recent Event History (Last 5)',
        value: historyText,
        inline: false,
      });
    }

    await interaction.editReply({
      embeds: [embed],
      components: [createWarRoomButtons()],
    });
  } catch (err) {
    console.error('Execute /me error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load your personal dossier: \`${err.message}\``
        ),
      ],
    });
  }
}
