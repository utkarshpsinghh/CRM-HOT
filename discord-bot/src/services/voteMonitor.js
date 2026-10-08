import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { crmApi } from './crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

let isRunning = false;

/**
 * Periodically monitors for newly scheduled Bear Traps and initiates voting in Discord
 */
export function startBearTrapVoteMonitor(client) {
  if (isRunning) return;
  isRunning = true;

  console.log('[MONITOR] Bear Trap battle vote monitor active.');

  // Run initial check after 10 seconds, then every 2 minutes
  setTimeout(() => checkAndBroadcastVote(client), 10000);
  setInterval(() => checkAndBroadcastVote(client), 2 * 60 * 1000);
}

async function checkAndBroadcastVote(client) {
  try {
    const eventsRes = await crmApi.getEvents('', 5);
    const events = eventsRes.data || [];
    const bearTraps = events.filter(e => e.eventType === 'Bear Trap');
    const scheduledBT = bearTraps.find(e => e.status === 'Scheduled');

    if (!scheduledBT) return;

    // Check if we have already broadcasted this event's vote
    const lastBroadcastedEventId = await crmApi.getSetting('bot_last_broadcasted_vote_id', null);
    if (lastBroadcastedEventId === scheduledBT.id) {
      return;
    }

    // Find target channel to post
    const guild = client.guilds.cache.first();
    if (!guild) return;

    let targetChannel = guild.systemChannel;
    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('announc') || c.name.includes('bear-trap') || c.name.includes('general') || c.name.includes('war-room'))
      ) || guild.channels.cache.find(c => c.isTextBased());
    }

    if (!targetChannel) return;

    const bt1Slot = scheduledBT.slots?.find(s => s.slotName === 'BT1' || s.slotNumber === 1);
    const bt2Slot = scheduledBT.slots?.find(s => s.slotName === 'BT2' || s.slotNumber === 2);

    const formatSlotTime = (startTimeStr) => {
      if (!startTimeStr) return 'TBD';
      const d = new Date(startTimeStr);
      if (isNaN(d.getTime())) return startTimeStr;
      const dateFormatted = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      const timeFormatted = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      });
      const unixSec = Math.floor(d.getTime() / 1000);
      return `${dateFormatted} • \`${timeFormatted} UTC\` (<t:${unixSec}:R>)`;
    };

    const isSlotPast = (slot) => {
      if (!slot?.startTime) return false;
      const d = new Date(slot.startTime);
      return !isNaN(d.getTime()) && d.getTime() <= Date.now();
    };

    const bt1Completed = isSlotPast(bt1Slot);
    const bt2Completed = isSlotPast(bt2Slot);

    const embed = createBaseEmbed(`🚨 [HOT] Bear Trap Scheduled: Vote Initiated!`, COLORS.GOLD)
      .setDescription(
        `**Attention Kingdom #1391 [HOT] Warriors!**\n\n` +
        `A new Bear Trap battle (**${scheduledBT.eventName}**) has been scheduled by Alliance Leadership!\n` +
        `Please select your preferred battle deployment slot below.\n\n` +
        `🛡️ **Rule:** Warriors must attend at least **1 slot** per 48-hour battle cycle.`
      )
      .addFields(
        {
          name: `⚔️ Slot 1: BT1 ${bt1Completed ? '[🔴 COMPLETED]' : '[🟢 OPEN]'}`,
          value: [
            `• **Date & Time:** ${formatSlotTime(bt1Slot?.startTime)}`,
            `• **Status:** ${bt1Completed ? '🛑 **BT1 is completed! No more entries allowed.**' : '🟢 **Open for Voting** *(EU / Asia Primetime)*'}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `🛡️ Slot 2: BT2 ${bt2Completed ? '[🔴 COMPLETED]' : '[🟢 OPEN]'}`,
          value: [
            `• **Date & Time:** ${formatSlotTime(bt2Slot?.startTime)}`,
            `• **Status:** ${bt2Completed ? '🛑 **BT2 is completed! No more entries allowed.**' : '🟢 **Open for Voting** *(Americas Primetime)*'}`,
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • House of Titans • Battle Command',
      });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_bt1_${scheduledBT.id}`)
        .setLabel(bt1Completed ? '⚔️ BT1 (16:00 UTC) [COMPLETED]' : '⚔️ Vote BT1 (16:00 UTC)')
        .setStyle(bt1Completed ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(!bt1Slot || bt1Completed),
      new ButtonBuilder()
        .setCustomId(`vote_bt2_${scheduledBT.id}`)
        .setLabel(bt2Completed ? '🛡️ BT2 (00:30 UTC) [COMPLETED]' : '🛡️ Vote BT2 (00:30 UTC)')
        .setStyle(bt2Completed ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(!bt2Slot || bt2Completed)
    );

    await targetChannel.send({
      content: '📢 **@everyone Bear Trap battle scheduled! Cast your slot vote below:**',
      embeds: [embed],
      components: [buttons],
    });

    console.log(`[MONITOR] Successfully initiated automated vote for ${scheduledBT.eventName} in #${targetChannel.name}!`);

    // Record that we broadcasted this event
    await crmApi.setSetting('bot_last_broadcasted_vote_id', scheduledBT.id);
  } catch (err) {
    console.warn('[MONITOR] Error checking Bear Trap vote:', err.message);
  }
}
