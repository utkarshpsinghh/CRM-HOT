import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Fetch alliance player dossier, rank, strikes, and battle attendance')
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Player in-game Name or Player ID')
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
            `Could not find any member matching **"${query}"** in Kingdom #1391 [HOT] roster.\n\n` +
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

    // Strikes emoji indicator
    const strikesCount = member.strikes || 0;
    const strikesDisplay = strikesCount === 0
      ? '🟢 `0 / 3` (Clean Record)'
      : strikesCount >= 3
      ? `🔴 **${strikesCount} / 3 (CRITICAL THRESHOLD)**`
      : `🟡 **${strikesCount} / 3**`;

    // Attendance stats
    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;
    const attendedCount = lbEntry ? lbEntry.attendedCount : 0;
    const totalEvents = lbEntry ? lbEntry.totalEvents : 0;

    const embed = createBaseEmbed(`🛡️ [HOT] Player Dossier: ${member.name}`)
      .setDescription(`**Kingdom #1391 Alliance Roster Profile**`)
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
            lbEntry ? `• **Alliance Rank:** **#${lbEntry.rank}** on Leaderboard` : '',
          ].filter(Boolean).join('\n'),
          inline: false,
        }
      );

    // Add recent event participation history
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

    embed.addFields({
      name: '🔗 CRM Direct Link',
      value: `[Open in HOT Command Center](https://crm.1391.online/)`,
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /profile error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to fetch player data from CRM API: \`${err.message}\``
        ),
      ],
    });
  }
}
