import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Cast or view the official Bear Trap battle slot vote');

/**
 * Formats a slot start time string into a clean date, time, and Discord relative timestamp
 */
function formatSlotTime(startTimeStr) {
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
}

/**
 * Checks whether an event slot has already completed based on current time or event status
 */
function checkSlotStatus(slot, eventStatus) {
  if (!slot) return { isCompleted: true, label: 'Not Available', badge: '⚪ N/A' };
  if (eventStatus === 'Completed') {
    return { isCompleted: true, label: 'COMPLETED — Entries Closed', badge: '🔴 CLOSED' };
  }
  if (!slot.startTime) {
    return { isCompleted: false, label: 'OPEN FOR VOTING', badge: '🟢 OPEN' };
  }
  const slotDate = new Date(slot.startTime);
  if (isNaN(slotDate.getTime())) {
    return { isCompleted: false, label: 'OPEN FOR VOTING', badge: '🟢 OPEN' };
  }

  const now = new Date();
  if (slotDate.getTime() <= now.getTime()) {
    return { isCompleted: true, label: 'COMPLETED — Entries Closed', badge: '🔴 COMPLETED' };
  }
  return { isCompleted: false, label: 'OPEN FOR VOTING', badge: '🟢 OPEN' };
}

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const [{ participations, slots }, eventsRes] = await Promise.all([
      crmApi.getCachedParentData(),
      crmApi.getEvents('', 10),
    ]);

    const events = eventsRes.data || [];
    const bearTraps = events.filter(e => e.eventType === 'Bear Trap');
    const targetEvent = bearTraps.find(e => e.status === 'Scheduled') || bearTraps[0];

    if (!targetEvent) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('No Active Battle Found', COLORS.GOLD).setDescription(
            'There are currently no active or upcoming Bear Trap battles scheduled.'
          ),
        ],
      });
    }

    const eventSlots = targetEvent.slots || [];
    const bt1Slot = eventSlots.find(s => s.slotName === 'BT1' || s.slotNumber === 1);
    const bt2Slot = eventSlots.find(s => s.slotName === 'BT2' || s.slotNumber === 2);

    const buildEmbed = (currentParts = participations) => {
      const eventParts = currentParts.filter(p => p.eventId === targetEvent.id);
      const bt1Votes = eventParts.filter(p => p.voteStatus === 'VOTED' && p.selectedSlotId === bt1Slot?.id).length;
      const bt2Votes = eventParts.filter(p => p.voteStatus === 'VOTED' && p.selectedSlotId === bt2Slot?.id).length;
      const totalVoted = bt1Votes + bt2Votes;

      const s1Status = checkSlotStatus(bt1Slot, targetEvent.status);
      const s2Status = checkSlotStatus(bt2Slot, targetEvent.status);
      const allCompleted = s1Status.isCompleted && s2Status.isCompleted;

      const embedTitle = allCompleted
        ? `🏁 [HOT] Bear Trap Concluded: ${targetEvent.eventName}`
        : `🐻 [HOT] Bear Trap Slot Vote: ${targetEvent.eventName}`;

      const embedColor = allCompleted ? COLORS.BRONZE : COLORS.GOLD;

      return createBaseEmbed(embedTitle, embedColor)
        .setDescription(
          `**Kingdom #1391 • House of Titans [HOT]**\n` +
          (allCompleted
            ? `🏁 **Battle Concluded:** All deployment slots for **${targetEvent.eventName}** have finished. Entries are closed.\n\n`
            : `Alliance Leadership has scheduled **${targetEvent.eventName}**. Select your battle deployment slot below!\n\n`) +
          `🛡️ **Rule:** Warriors must attend at least **1 slot** per 48-hour battle cycle.`
        )
        .addFields(
          {
            name: `⚔️ Slot 1: BT1 [${s1Status.badge}] — ${bt1Votes} Votes`,
            value: [
              `• **Date & Time:** ${formatSlotTime(bt1Slot?.startTime)}`,
              `• **Status:** ${s1Status.isCompleted ? '🛑 **BT1 is completed! No more entries allowed.**' : '🟢 **Open for Voting** *(EU / Asia Primetime)*'}`,
              `• **Turnout:** **${bt1Votes}** registered warriors`,
            ].join('\n'),
            inline: false,
          },
          {
            name: `🛡️ Slot 2: BT2 [${s2Status.badge}] — ${bt2Votes} Votes`,
            value: [
              `• **Date & Time:** ${formatSlotTime(bt2Slot?.startTime)}`,
              `• **Status:** ${s2Status.isCompleted ? '🛑 **BT2 is completed! No more entries allowed.**' : '🟢 **Open for Voting** *(Americas Primetime)*'}`,
              `• **Turnout:** **${bt2Votes}** registered warriors`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '📊 Turnout Overview',
            value: `Total Registered Votes: **${totalVoted}** / **${eventParts.length || 80}** alliance warriors`,
            inline: false,
          }
        )
        .setFooter({
          text: allCompleted
            ? 'Battle Concluded • Voting Expired • Kingdom #1391 Battle Command'
            : 'Click an active button below to vote • Kingdom #1391 Battle Command',
        });
    };

    const buildButtons = (disabled = false) => {
      const s1Status = checkSlotStatus(bt1Slot, targetEvent.status);
      const s2Status = checkSlotStatus(bt2Slot, targetEvent.status);

      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_bt1_${targetEvent.id}`)
          .setLabel(s1Status.isCompleted ? '⚔️ BT1 (16:00 UTC) [COMPLETED]' : '⚔️ Vote BT1 (16:00 UTC)')
          .setStyle(s1Status.isCompleted ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(disabled || !bt1Slot || s1Status.isCompleted),
        new ButtonBuilder()
          .setCustomId(`vote_bt2_${targetEvent.id}`)
          .setLabel(s2Status.isCompleted ? '🛡️ BT2 (00:30 UTC) [COMPLETED]' : '🛡️ Vote BT2 (00:30 UTC)')
          .setStyle(s2Status.isCompleted ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(disabled || !bt2Slot || s2Status.isCompleted)
      );
    };

    const response = await interaction.editReply({
      embeds: [buildEmbed()],
      components: [buildButtons()],
    });

    // 4-hour live component collector for instant vote updating
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 4 * 60 * 60 * 1000,
    });

    collector.on('collect', async btnInteraction => {
      // 1. Check if user is linked
      const linked = await crmApi.getLinkedMember(btnInteraction.user.id);
      if (!linked) {
        return await btnInteraction.reply({
          content: '⛔ You must link your in-game identity first using `/link` before you can cast a vote!',
          ephemeral: true,
        });
      }

      const isBt1 = btnInteraction.customId.startsWith('vote_bt1_');
      const targetSlot = isBt1 ? bt1Slot : bt2Slot;

      if (!targetSlot) {
        return await btnInteraction.reply({
          content: '⚠️ Selected slot is not available.',
          ephemeral: true,
        });
      }

      // Check slot completion
      const slotStatus = checkSlotStatus(targetSlot, targetEvent.status);
      if (slotStatus.isCompleted) {
        return await btnInteraction.reply({
          content: `⛔ **${targetSlot.slotName}** is completed! No more entries allowed for this slot.`,
          ephemeral: true,
        });
      }

      // 2. Cast vote directly in attendance ledger
      const result = await crmApi.castVote(linked.id, targetEvent.id, targetSlot.id);

      if (!result.success) {
        return await btnInteraction.reply({
          content: `❌ Failed to record vote: ${result.message}`,
          ephemeral: true,
        });
      }

      // 3. Reload latest data
      const { participations: freshParts } = await crmApi.getCachedParentData();

      // 4. Update the embed
      await btnInteraction.update({
        embeds: [buildEmbed(freshParts)],
        components: [buildButtons()],
      });

      const slotLabel = isBt1 ? 'BT1 (16:00 UTC)' : 'BT2 (00:30 UTC)';
      await btnInteraction.followUp({
        content: `✅ **Vote Confirmed!** **${linked.name}** is registered for **${slotLabel}**. Prepare for battle!`,
        ephemeral: true,
      }).catch(() => {});
    });
  } catch (err) {
    console.error('Execute /vote error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load Bear Trap vote: \`${err.message}\``
        ),
      ],
    });
  }
}
