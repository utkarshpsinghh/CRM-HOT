import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from './embedBuilder.js';

/**
 * Creates an interactive "Link Account" button that triggers the Discord link guide
 */
export function createLinkButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_open_link_modal')
      .setLabel('Link Account')
      .setStyle(ButtonStyle.Success)
  );
}

/**
 * Creates smooth quick-action buttons for verified alliance members
 */
export function createWarRoomButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_action_vote')
      .setLabel('Cast Vote')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_action_beartrap')
      .setLabel('Bear Trap')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_action_me')
      .setLabel('My Profile')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_action_rank')
      .setLabel('My Rank')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Standard structured embed prompting user to link their account
 */
export function createUnlinkedEmbed(commandName = 'this command') {
  return createBaseEmbed('Verification Required', COLORS.GOLD)
    .setDescription(
      `**Welcome to [HOT] OneForAll (Kingdom #1391)**\n\n` +
      `To use **/${commandName}**, please link your in-game profile first.\n\n` +
      `**How to link:**\n` +
      `1. In King's Shot, tap your avatar (top-left) to open your Governor Profile.\n` +
      `2. Take a screenshot of your profile screen.\n` +
      `3. Click the button below or type **/link** and attach your screenshot.\n\n` +
      `Once linked, voting, rankings, and battle attendance will unlock automatically.`
    )
    .setFooter({ text: 'Kingdom #1391 • [HOT] OneForAll' });
}

/**
 * Checks if user is linked. If not, sends prompt with link button and returns null.
 */
export async function requireLinkedMember(interaction, commandName) {
  const member = await crmApi.getLinkedMember(interaction.user.id);
  if (!member) {
    await interaction.editReply({
      embeds: [createUnlinkedEmbed(commandName)],
      components: [createLinkButton()],
    });
    return null;
  }
  return member;
}
