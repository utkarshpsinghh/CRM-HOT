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

      return createBaseEmbed(`🐻 [HOT] Bear Trap Slot Vote: ${targetEvent.eventName}`, COLORS.GOLD)
        .setDescription(
          `**Kingdom #1391 • House of Titans [HOT]**\n` +
          `A battle has been scheduled by Alliance Leadership. Cast your vote for your preferred battle deployment slot below!\n\n` +
          `🛡️ **Rule:** Warriors must attend at least **1 slot** per 48-hour battle cycle.`
        )
        .addFields(
          {
            name: `⚔️ Slot 1: BT1 (16:00 UTC) [${bt1Votes} Votes]`,
            value: `• **Time:** \`16:00 UTC\` *(EU / Asia Primetime)*\n• **Registered:** **${bt1Votes}** warriors voted`,
            inline: true,
          },
          {
            name: `🛡️ Slot 2: BT2 (00:30 UTC) [${bt2Votes} Votes]`,
            value: `• **Time:** \`00:30 UTC\` *(Americas Primetime)*\n• **Registered:** **${bt2Votes}** warriors voted`,
            inline: true,
          },
          {
            name: '📊 Live Turnout Status',
            value: `Total Registered Votes: **${totalVoted}** / **${eventParts.length || 80}** alliance warriors`,
            inline: false,
          }
        )
        .setFooter({
          text: 'Click a button below to cast or update your vote • Kingdom #1391 Battle Command',
        });
    };

    const buildButtons = (disabled = false) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_bt1_${targetEvent.id}`)
          .setLabel('⚔️ Vote BT1 (16:00 UTC)')
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled || !bt1Slot),
        new ButtonBuilder()
          .setCustomId(`vote_bt2_${targetEvent.id}`)
          .setLabel('🛡️ Vote BT2 (00:30 UTC)')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || !bt2Slot)
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
