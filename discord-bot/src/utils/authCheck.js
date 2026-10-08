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
      .setLabel('🔗 Link In-Game Account')
      .setStyle(ButtonStyle.Success)
  );
}

/**
 * Creates smooth quick-action buttons for verified alliance warriors
 */
export function createWarRoomButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_action_vote')
      .setLabel('🗳️ Cast Vote')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_action_beartrap')
      .setLabel('🐻 Battle Status')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_action_me')
      .setLabel('📊 My Dossier')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_action_roster')
      .setLabel('🏰 Roster')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Standard structured embed prompting user to link their account
 */
export function createUnlinkedEmbed(commandName = 'this command') {
  return createBaseEmbed('🛡️ Step 1: Verification Required', COLORS.GOLD)
    .setDescription(
      `**Welcome to Kingdom #1391 • House of Titans [HOT]**\n\n` +
      `🔒 Access to **/${commandName}** is locked until your in-game identity is verified.\n\n` +
      `### 📸 How to Complete Verification:\n` +
      `1. Open King's Shot and tap your avatar in the top-left corner.\n` +
      `2. Take a screenshot of your **Governor Profile** screen (showing name, ID, and Settings tab).\n` +
      `3. Tap the command link below to upload your screenshot:\n\n` +
      `👉 **</link:1557524738736267364>**\n\n` +
      `*(All alliance combat tools, Bear Trap voting, and records will unlock automatically once verified!)*`
    )
    .setFooter({ text: 'Kingdom #1391 • House of Titans • Identity Verification' });
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
