import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View an alliance member profile, rank, and attendance')
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Player Name or in-game ID')
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
            `Could not find any member matching **"${query}"** in the [HOT] OneForAll roster.\n\n` +
            `*Tip: Try searching by their exact in-game name or Player ID.*`
          ),
        ],
      });
    }

    // Fetch attendance history for this member
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
      .setDescription(`Member profile for **${member.name}**`)
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
            lbEntry ? `• **Leaderboard Rank:** **#${lbEntry.rank}** of **${leaderboard.length || 80}** members` : '',
          ].filter(Boolean).join('\n'),
          inline: false,
        }
      );

    // Add recent event participation history
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

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /profile error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load player profile: \`${err.message}\``
        ),
      ],
    });
  }
}
