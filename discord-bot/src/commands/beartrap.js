import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('beartrap')
  .setDescription('View upcoming Bear Trap battle schedule, dual slot status (BT1/BT2), and turnouts');

function parseSlotTime(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.replace(' UTC', ':00Z').replace(' ', 'T');
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const [{ participations }, eventsRes] = await Promise.all([
      crmApi.getCachedParentData(),
      crmApi.getEvents('', 10),
    ]);

    const events = eventsRes.data || [];
    const bearTraps = events.filter(e => e.eventType === 'Bear Trap');
    const latestBT = bearTraps[0];

    const embed = createBaseEmbed('🐻 [HOT] Bear Trap Battle Protocol', COLORS.GOLD)
      .setDescription(
        '**Kingdom #1391 [HOT] Bear Trap Coordination**\n' +
        'Bear Trap activates every 48 hours with dual time slots to accommodate all global time zones.'
      );

    if (latestBT) {
      const slots = latestBT.slots || [];
      const bt1Slot = slots.find(s => s.slotName === 'BT1' || s.slotNumber === 1);
      const bt2Slot = slots.find(s => s.slotName === 'BT2' || s.slotNumber === 2);

      const bt1Time = parseSlotTime(bt1Slot?.startTime);
      const bt2Time = parseSlotTime(bt2Slot?.startTime);
      const now = new Date();

      // Attendance count per slot
      const bt1Attended = participations.filter(
        p => p.eventId === latestBT.id && p.attendanceSlotId === bt1Slot?.id
      ).length;
      const bt2Attended = participations.filter(
        p => p.eventId === latestBT.id && p.attendanceSlotId === bt2Slot?.id
      ).length;

      const battleDurationMs = 30 * 60 * 1000; // 30 minutes trap window

      // Determine slot statuses
      const getSlotStatus = (slotTime, attendedCount, label) => {
        if (!slotTime) return `• **${label}:** Time not set`;
        const unix = Math.floor(slotTime.getTime() / 1000);
        const timeDiff = now.getTime() - slotTime.getTime();

        if (timeDiff > battleDurationMs) {
          return `• **${label} (16:00 UTC):** ✅ **Completed** (${attendedCount} fighters attended)`;
        } else if (timeDiff >= 0 && timeDiff <= battleDurationMs) {
          return `• **${label}:** 🔥 **IN PROGRESS NOW!** (Trap is open)`;
        } else {
          return `• **${label} (${slotTime.toISOString().slice(11, 16)} UTC):** ⏳ **Upcoming** • Starts <t:${unix}:R> (<t:${unix}:t> UTC)`;
        }
      };

      const bt1Display = getSlotStatus(bt1Time, bt1Attended, 'Slot 1 (BT1)');
      const bt2Display = getSlotStatus(bt2Time, bt2Attended, 'Slot 2 (BT2)');

      // Overall battle status
      let overallStatus = '⏳ Scheduled';
      let statusColor = COLORS.GOLD;

      const isBt1Done = bt1Time && (now.getTime() - bt1Time.getTime() > battleDurationMs);
      const isBt2Done = bt2Time && (now.getTime() - bt2Time.getTime() > battleDurationMs);

      if (isBt1Done && isBt2Done) {
        overallStatus = '✅ Completed';
        statusColor = COLORS.EMERALD;
      } else if (isBt1Done && !isBt2Done) {
        overallStatus = '⚔️ Active Cycle (BT1 Finished • BT2 Upcoming)';
        statusColor = COLORS.GOLD;
      } else if (!isBt1Done && !isBt2Done) {
        overallStatus = '⏳ Scheduled';
      }

      embed.setColor(statusColor);

      embed.addFields(
        {
          name: '⚔️ Dual Slot Status & Schedule',
          value: [
            bt1Display,
            bt2Display,
            '• **Rule:** Warriors must attend at least **1 slot** per battle cycle.',
          ].join('\n'),
          inline: false,
        },
        {
          name: `🎯 Current Battle: ${latestBT.eventName}`,
          value: [
            `• **Status:** \`${overallStatus}\``,
            `• **Battle Date:** \`${latestBT.slots?.[0]?.startTime?.slice(0, 10) || 'Scheduled'}\``,
            `• **Total Registered:** **${latestBT.turnout?.totalRegistered || 0}** warriors`,
            `• **Total Attended So Far:** **${bt1Attended + bt2Attended}** fighters`,
            `• **Turnout Rate:** ${renderProgressBar(latestBT.turnout?.attendanceRate || 0)}`,
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
