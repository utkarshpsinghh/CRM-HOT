import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';
import { verifyGovernorProfileScreenshot } from '../utils/imageVerifier.js';
import { createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account with Governor Profile screenshot verification')
  .addAttachmentOption(option =>
    option
      .setName('screenshot')
      .setDescription('In-game Governor Profile screenshot showing your name, ID, and Settings tab')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Optional: Your in-game Name or Player ID (auto-detected from screenshot if omitted)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const query = interaction.options.getString('player');
  const screenshot = interaction.options.getAttachment('screenshot');

  await interaction.deferReply();

  try {
    // 1. Validate image attachment format
    if (!screenshot || !screenshot.contentType?.startsWith('image/')) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Invalid Screenshot', COLORS.CRIMSON).setDescription(
            '⚠️ Please upload a valid image file (PNG/JPG) of your in-game **Governor Profile** screen.\n\n' +
            '*The screenshot must clearly show your avatar, in-game name, ID, and the Settings icon to verify profile ownership.*'
          ),
        ],
      });
    }

    // 2. Resolve target member if specified
    let targetMember = null;
    if (query) {
      targetMember = await crmApi.searchMember(query);
      if (!targetMember) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Player Not Found', COLORS.CRIMSON).setDescription(
              `Could not find any member matching **"${query}"** in the Kingdom #1391 [HOT] roster.\n\n` +
              `*Tip: Please check your spelling or use your exact numeric Player ID (e.g. \`202703263\`).*`
            ),
          ],
        });
      }
    }

    // 3. Authenticate Governor Profile Screenshot via OCR Analysis
    const verification = await verifyGovernorProfileScreenshot(screenshot.url, targetMember);
    if (!verification.valid) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Verification Failed', COLORS.CRIMSON).setDescription(
            `⚠️ **Profile Authentication Failed**\n\n${verification.reason}`
          ),
        ],
      });
    }

    // 4. If player was omitted, resolve member automatically from extracted Player ID
    const member = targetMember || (await crmApi.searchMember(verification.extractedId));
    if (!member) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player Not Found in Roster', COLORS.CRIMSON).setDescription(
            `Detected Player ID \`${verification.extractedId}\` from screenshot, but could not find this ID in the [HOT] roster.\n\n` +
            `*If your name was recently changed, please specify your in-game name using the \`player\` option.*`
          ),
        ],
      });
    }

    // 4. Link account with verified screenshot proof
    const result = await crmApi.linkDiscordUser(interaction.user.id, member, screenshot.url);

    if (!result.success) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Linking Rejected', COLORS.CRIMSON).setDescription(
            result.message || 'Unable to save your account link right now. Please try again later.'
          ),
        ],
      });
    }

    const embed = createBaseEmbed('🛡️ Profile Linked & Verified', COLORS.EMERALD)
      .setDescription(
        `Successfully linked <@${interaction.user.id}> to **${member.name}** with in-game Governor Profile verification proof!`
      )
      .addFields(
        {
          name: '👤 In-Game Identity',
          value: [
            `• **Name:** ${member.name}`,
            `• **Player ID:** \`${member.gameId || 'Not Linked'}\``,
            `• **Rank:** ${formatRank(member.rank)}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🛡️ Verification Standing',
          value: [
            `• **Status:** \`${member.status || 'Active'}\``,
            `• **Proof Attached:** ✅ Governor Profile Verified`,
            `• **Strikes:** \`${member.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🚀 War Room Activated — Next Steps:',
          value: [
            '`1.` Click **[ 🗳️ Cast Vote ]** below to register for active Bear Trap',
            '`2.` Click **[ 🐻 Battle Status ]** to track real-time countdowns',
            '`3.` Click **[ 📊 My Dossier ]** to view your combat dossier',
          ].join('\n'),
          inline: false,
        }
      )
      .setImage(screenshot.url)
      .setFooter({
        text: 'Kingdom #1391 • House of Titans • Identity Verified',
      });

    await interaction.editReply({
      embeds: [embed],
      components: [createWarRoomButtons()],
    });
  } catch (err) {
    console.error('Execute /link error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Error', COLORS.CRIMSON).setDescription(
          `An error occurred while linking your account: \`${err.message}\``
        ),
      ],
    });
  }
}
