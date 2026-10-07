import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('events')
  .setDescription('View upcoming and recent Kingdom #1391 [HOT] battle events & Bear Trap schedules')
  .addStringOption(option =>
    option
      .setName('status')
      .setDescription('Filter by event status')
      .addChoices(
        { name: 'All Events', value: 'all' },
        { name: 'Scheduled / Upcoming', value: 'Scheduled' },
        { name: 'Completed Battles', value: 'Completed' }
      )
  );

export async function execute(interaction) {
  const selectedStatus = interaction.options.getString('status');
  const status = selectedStatus && selectedStatus !== 'all' ? selectedStatus : '';
  await interaction.deferReply();

  try {
    const res = await crmApi.getEvents(status, 6);
    const events = res.data || [];

    if (events.length === 0) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('No Events Found', COLORS.BRONZE).setDescription(
            status ? `No events found with status \`${status}\`.` : 'No events currently registered.'
          ),
        ],
      });
    }

    const embed = createBaseEmbed('⚔️ [HOT] Alliance Battle Events & Bear Traps');

    events.forEach(evt => {
      const statusIcon = evt.status === 'Completed' ? '✅' : evt.status === 'Live' ? '🔴 LIVE' : '⏳';
      const eventDate = evt.date ? new Date(evt.date).toUTCString() : 'TBD';

      const slotDetails = (evt.slots || []).map(s => {
        return `• **${s.slotName}:** \`${s.startTime || 'TBD'}\``;
      }).join('  |  ');

      const turnoutText = evt.turnout?.totalRegistered
        ? `• **Turnout:** ${evt.turnout.attendedCount} attended (${evt.turnout.attendanceRate}%)`
        : '';

      embed.addFields({
        name: `${statusIcon} ${evt.eventName || evt.eventType}`,
        value: [
          `📅 **Date:** ${eventDate}`,
          slotDetails ? `🕒 **Slots:** ${slotDetails}` : '',
          turnoutText,
          evt.notes ? `📝 *${evt.notes}*` : '',
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /events error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Events Error', COLORS.CRIMSON).setDescription(
          `Failed to load events: \`${err.message}\``
        ),
      ],
    });
  }
}
