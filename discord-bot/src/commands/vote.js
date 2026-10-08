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
  .setDescription('Vote for your Bear Trap battle slot');

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

function checkSlotStatus(slot, eventStatus) {
  if (!slot) return { isCompleted: true, label: 'Not Available', badge: 'Closed' };
  if (eventStatus === 'Completed') {
    return { isCompleted: true, label: 'Finished', badge: 'Closed' };
  }
  if (!slot.startTime) {
    return { isCompleted: false, label: 'Open for Voting', badge: 'Open' };
  }
  const slotDate = new Date(slot.startTime);
  if (isNaN(slotDate.getTime())) {
    return { isCompleted: false, label: 'Open for Voting', badge: 'Open' };
  }

  const now = new Date();
  if (slotDate.getTime() <= now.getTime()) {
    return { isCompleted: true, label: 'Finished', badge: 'Closed' };
  }
  return { isCompleted: false, label: 'Open for Voting', badge: 'Open' };
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
        ? `[HOT] OneForAll • Bear Trap Finished: ${targetEvent.eventName}`
        : `[HOT] OneForAll • Bear Trap Vote: ${targetEvent.eventName}`;

      const embedColor = allCompleted ? COLORS.BRONZE : COLORS.GOLD;

      return createBaseEmbed(embedTitle, embedColor)
        .setDescription(
          allCompleted
            ? `All battle slots for **${targetEvent.eventName}** have ended. Voting is closed.`
            : `Select your battle slot for **${targetEvent.eventName}** below.\n\n• Please attend at least 1 slot per 48-hour cycle.`
        )
        .addFields(
          {
            name: `Slot 1: BT1 [${s1Status.badge}] — ${bt1Votes} Votes`,
            value: [
              `• **Time:** ${formatSlotTime(bt1Slot?.startTime)}`,
              `• **Status:** ${s1Status.isCompleted ? 'BT1 is finished (closed)' : 'Open for voting (16:00 UTC)'}`,
              `• **Turnout:** **${bt1Votes}** members`,
            ].join('\n'),
            inline: false,
          },
          {
            name: `Slot 2: BT2 [${s2Status.badge}] — ${bt2Votes} Votes`,
            value: [
              `• **Time:** ${formatSlotTime(bt2Slot?.startTime)}`,
              `• **Status:** ${s2Status.isCompleted ? 'BT2 is finished (closed)' : 'Open for voting (00:30 UTC)'}`,
              `• **Turnout:** **${bt2Votes}** members`,
            ].join('\n'),
            inline: false,
          },
          {
            name: 'Total Votes',
            value: `**${totalVoted}** / **${eventParts.length || 80}** members registered`,
            inline: false,
          }
        )
        .setFooter({
          text: allCompleted
            ? 'Kingdom #1391 • [HOT] OneForAll • Closed'
            : 'Click a button below to vote • Kingdom #1391 • [HOT] OneForAll',
        });
    };

    const buildButtons = (disabled = false) => {
      const s1Status = checkSlotStatus(bt1Slot, targetEvent.status);
      const s2Status = checkSlotStatus(bt2Slot, targetEvent.status);

      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_bt1_${targetEvent.id}`)
          .setLabel(s1Status.isCompleted ? 'BT1 (16:00 UTC) [Closed]' : 'Vote BT1 (16:00 UTC)')
          .setStyle(s1Status.isCompleted ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(disabled || !bt1Slot || s1Status.isCompleted),
        new ButtonBuilder()
          .setCustomId(`vote_bt2_${targetEvent.id}`)
          .setLabel(s2Status.isCompleted ? 'BT2 (00:30 UTC) [Closed]' : 'Vote BT2 (00:30 UTC)')
          .setStyle(s2Status.isCompleted ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(disabled || !bt2Slot || s2Status.isCompleted)
      );
    };

    const response = await interaction.editReply({
      embeds: [buildEmbed()],
      components: [buildButtons()],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 4 * 60 * 60 * 1000,
    });

    collector.on('collect', async btnInteraction => {
      const linked = await crmApi.getLinkedMember(btnInteraction.user.id);
      if (!linked) {
        return await btnInteraction.reply({
          content: 'Please link your account first using `/link` before voting.',
          ephemeral: true,
        });
      }

      const isBt1 = btnInteraction.customId.startsWith('vote_bt1_');
      const targetSlot = isBt1 ? bt1Slot : bt2Slot;

      if (!targetSlot) {
        return await btnInteraction.reply({
          content: 'Selected slot is not available.',
          ephemeral: true,
        });
      }

      const slotStatus = checkSlotStatus(targetSlot, targetEvent.status);
      if (slotStatus.isCompleted) {
        return await btnInteraction.reply({
          content: `**${targetSlot.slotName}** has ended. Entries are closed.`,
          ephemeral: true,
        });
      }

      const result = await crmApi.castVote(linked.id, targetEvent.id, targetSlot.id);

      if (!result.success) {
        return await btnInteraction.reply({
          content: `Failed to record vote: ${result.message}`,
          ephemeral: true,
        });
      }

      const { participations: freshParts } = await crmApi.getCachedParentData();

      await btnInteraction.update({
        embeds: [buildEmbed(freshParts)],
        components: [buildButtons()],
      });

      const slotLabel = isBt1 ? 'BT1 (16:00 UTC)' : 'BT2 (00:30 UTC)';
      await btnInteraction.followUp({
        content: `Vote confirmed: **${linked.name}** is registered for **${slotLabel}**.`,
        ephemeral: true,
      }).catch(() => {});
    });
  } catch (err) {
    console.error('Execute /vote error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load vote: \`${err.message}\``
        ),
      ],
    });
  }
}
