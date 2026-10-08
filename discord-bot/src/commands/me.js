import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';
import { requireLinkedMember, createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('me')
  .setDescription('View your player profile, stats, and attendance');

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
      ? '`0 / 3` (None)'
      : strikesCount >= 3
      ? `**${strikesCount} / 3** (Critical)`
      : `**${strikesCount} / 3**`;

    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;
    const attendedCount = lbEntry ? lbEntry.attendedCount : 0;
    const totalEvents = lbEntry ? lbEntry.totalEvents : 0;

    const embed = createBaseEmbed(`[HOT] OneForAll • ${member.name}`)
      .setDescription(`Player profile and attendance overview`)
      .addFields(
        {
          name: 'Player Info',
          value: [
            `• **Name:** ${member.name}`,
            `• **Player ID:** \`${member.gameId || 'Not Linked'}\``,
            `• **Alliance Rank:** ${formatRank(member.rank)}`,
            `• **Status:** \`${member.status || 'Active'}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Account Standing',
          value: [
            `• **Strikes:** ${strikesDisplay}`,
            `• **Communication:** \`${member.communication || 'Good'}\``,
            member.note ? `• **Note:** *${member.note}*` : '',
          ].filter(Boolean).join('\n'),
          inline: true,
        },
        {
          name: 'Attendance (All-Time)',
          value: [
            `• **Turnout Rate:** ${renderProgressBar(attendanceRate)}`,
            `• **Battles Attended:** **${attendedCount}** / **${totalEvents}**`,
            `• **Leaderboard Rank:** **#${lbEntry ? lbEntry.rank : 'Unranked'}** of **${leaderboard.length || 80}** members`,
          ].filter(Boolean).join('\n'),
          inline: false,
        }
      );

    if (recentRecords.length > 0) {
      const historyText = recentRecords.map(r => {
        const isAttended = r.attendanceStatus === 'ATTENDED';
        const icon = isAttended ? '✅' : '❌';
        const eventName = r.eventName || r.eventType || 'Event';
        const slotText = r.attendedSlot ? `(${r.attendedSlot})` : '';
        return `${icon} **${eventName}**: \`${r.attendanceStatus}\` ${slotText}`;
      }).join('\n');

      embed.addFields({
        name: 'Recent Events (Last 5)',
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
          `Failed to load profile: \`${err.message}\``
        ),
      ],
    });
  }
}
