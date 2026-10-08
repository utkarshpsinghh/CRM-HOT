import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from './embedBuilder.js';

/**
 * Creates an interactive "Link Account" button that triggers the Discord modal
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
 * Standard structured embed prompting user to link their account
 */
export function createUnlinkedEmbed(commandName = 'this command') {
  return createBaseEmbed('🛡️ Identity Verification Required', COLORS.GOLD)
    .setDescription(
      `Hail warrior! Before accessing **/${commandName}**, you must link your Discord account to your in-game **Kingdom #1391 [HOT]** identity.\n\n` +
      `**Why link your account?**\n` +
      `• 🗳️ Cast Bear Trap deployment votes with \`/vote\`\n` +
      `• 📊 Inspect personal combat dossiers with \`/me\`\n` +
      `• ⏳ Track live Bear Trap countdowns with \`/beartrap\`\n` +
      `• 🏆 Check alliance rankings with \`/leaderboard\`\n\n` +
      `👉 **Click the button below or tap </link:1557524738736267364> to upload your Governor Profile screenshot.**`
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
