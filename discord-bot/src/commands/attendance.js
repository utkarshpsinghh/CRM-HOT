import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('attendance')
  .setDescription('View battle attendance and votes for a member')
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
            `No member found matching **"${query}"** in the [HOT] OneForAll roster.`
          ),
        ],
      });
    }

    const [attRes, lbRes] = await Promise.all([
      crmApi.getAttendance(member.id, '', 15).catch(() => ({ data: [] })),
      crmApi.getLeaderboard(100).catch(() => ({ data: [] })),
    ]);

    const records = attRes.data || [];
    const leaderboard = lbRes.data || [];
    const stats = leaderboard.find(l => l.memberId === member.id);

    const embed = createBaseEmbed(`[HOT] OneForAll • Attendance: ${member.name}`)
      .setDescription(`Participation history for **${member.name}** [${member.rank || 'Member'}]`);

    if (stats) {
      embed.addFields({
        name: 'Attendance Summary',
        value: [
          `• **Attendance Rate:** ${renderProgressBar(stats.attendanceRate)}`,
          `• **Battles Attended:** **${stats.attendedCount}** / **${stats.totalEvents}**`,
          `• **Battles Missed:** **${stats.missedCount}**`,
        ].join('\n'),
        inline: false,
      });
    }

    if (records.length === 0) {
      embed.addFields({
        name: 'Attendance Records',
        value: 'No recorded battle participations found for this member yet.',
        inline: false,
      });
    } else {
      const recordLines = records.map(r => {
        const isAttended = r.attendanceStatus === 'ATTENDED';
        const icon = isAttended ? '✅' : '❌';
        const dateStr = r.eventDate ? new Date(r.eventDate).toLocaleDateString() : '';
        const eventName = r.eventName || r.eventType || 'Event';
        const slotVoted = r.votedSlot ? `Voted: \`${r.votedSlot}\`` : `Vote: \`${r.voteStatus}\``;
        const slotAttended = isAttended && r.attendedSlot ? `| Joined: \`${r.attendedSlot}\`` : '';

        return `${icon} **${eventName}** (${dateStr})\n  ↳ ${slotVoted} ${slotAttended} | Status: **${r.attendanceStatus}**`;
      });

      embed.addFields({
        name: `Battle History (Last ${records.length} Events)`,
        value: recordLines.join('\n\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /attendance error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Attendance Error', COLORS.CRIMSON).setDescription(
          `Failed to fetch attendance history: \`${err.message}\``
        ),
      ],
    });
  }
}
