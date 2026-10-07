import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('beartrap')
  .setDescription('View upcoming Bear Trap battle schedule, slot times (BT1/BT2), and registration turnouts');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const eventsRes = await crmApi.getEvents('', 10);
    const events = eventsRes.data || [];

    // Find the latest Bear Trap
    const bearTraps = events.filter(e => e.eventType === 'Bear Trap');
    const latestBT = bearTraps[0];

    const embed = createBaseEmbed('🐻 [HOT] Bear Trap Battle Protocol', COLORS.GOLD)
      .setDescription(
        '**Kingdom #1391 [HOT] Bear Trap Coordination**\n' +
        'Bear Trap activates every 48 hours with dual time slots to accommodate all global time zones.'
      )
      .addFields(
        {
          name: '⚔️ Dual Slot Timings (UTC)',
          value: [
            '• **Slot 1 (BT1):** `16:00 UTC` *(EU / Asia Primetime)*',
            '• **Slot 2 (BT2):** `00:30 UTC` *(Americas Primetime)*',
            '• **Rule:** Warriors must attend at least **1 slot** per battle cycle.',
          ].join('\n'),
          inline: false,
        }
      );

    if (latestBT) {
      const turnout = latestBT.turnout || { totalRegistered: 0, attendedCount: 0, attendanceRate: 0 };
      const statusIcon = latestBT.status === 'Completed' ? '✅ Completed' : '⏳ Scheduled';

      embed.addFields(
        {
          name: `🎯 Current / Latest Battle: ${latestBT.eventName}`,
          value: [
            `• **Status:** \`${statusIcon}\``,
            `• **Battle Date:** \`${new Date(latestBT.date).toUTCString()}\``,
            `• **Total Registered:** **${turnout.totalRegistered}** warriors`,
            `• **Attended Turnout:** **${turnout.attendedCount}** warriors`,
            `• **Turnout Rate:** ${renderProgressBar(turnout.attendanceRate)}`,
          ].join('\n'),
          inline: false,
        }
      );
    }

    // List recent Bear Trap history
    if (bearTraps.length > 1) {
      const historyList = bearTraps.slice(1, 5).map(bt => {
        const rate = bt.turnout?.attendanceRate || 0;
        return `• **${bt.eventName}** (${new Date(bt.date).toISOString().slice(5, 10)}): **${rate}%** turnout (${bt.turnout?.attendedCount || 0} fighters)`;
      }).join('\n');

      embed.addFields({
        name: '📜 Recent Trap Performance',
        value: historyList,
        inline: false,
      });
    }

    embed.addFields({
      name: '🛡️ Officer Battle Instructions',
      value:
        '1. Be online 5 minutes before trap opens.\n' +
        '2. Join rally leaders with highest lethality & rally capacity.\n' +
        '3. Make sure to vote for your preferred slot ahead of time.',
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /beartrap error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load Bear Trap schedule: \`${err.message}\``
        ),
      ],
    });
  }
}
