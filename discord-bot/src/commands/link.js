import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';
import { verifyGovernorProfileScreenshot } from '../utils/imageVerifier.js';
import { createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account with game profile screenshot')
  .addAttachmentOption(option =>
    option
      .setName('screenshot')
      .setDescription('In-game profile screenshot showing your name, ID, and Settings tab')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Optional: Your in-game Name or Player ID (auto-detected if omitted)')
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
            'Please upload a valid image file (PNG/JPG) of your in-game profile screen.\n\n' +
            '*The screenshot must clearly show your name, Player ID, and the Settings icon to verify ownership.*'
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
              `Could not find any member matching **"${query}"** in the [HOT] OneForAll roster.\n\n` +
              `*Tip: Please check spelling or use your exact numeric Player ID (e.g. \`202703263\`).*`
            ),
          ],
        });
      }
    }

    // 3. Authenticate screenshot via OCR
    console.log(`[LINK] Processing /link for Discord user ${interaction.user.tag} (${interaction.user.id}). Query: "${query || ''}"`);
    const verification = await verifyGovernorProfileScreenshot(screenshot.url, targetMember);
    console.log(`[LINK] Verification result: valid=${verification.valid}, extractedId=${verification.extractedId}, reason=${verification.reason || 'None'}`);

    if (!verification.valid) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Verification Failed', COLORS.CRIMSON).setDescription(
            `**Verification Failed**\n\n${verification.reason}`
          ),
        ],
      });
    }

    // 4. If player was omitted, resolve member automatically from extracted Player ID
    const member = targetMember || (await crmApi.searchMember(verification.extractedId));
    if (!member) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player Not Found', COLORS.CRIMSON).setDescription(
            `Detected Player ID \`${verification.extractedId}\` from screenshot, but could not find this ID in the [HOT] OneForAll roster.\n\n` +
            `*If your name was recently changed, please specify your in-game name using the \`player\` option.*`
          ),
        ],
      });
    }
    console.log(`[LINK] Resolved member: ${member.name} (${member.id}, GID: ${member.gameId})`);

    // 5. Link account with verified screenshot proof
    const result = await crmApi.linkDiscordUser(interaction.user.id, member, screenshot.url);

    if (!result.success) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Linking Failed', COLORS.CRIMSON).setDescription(
            result.message || 'Unable to save your account link right now. Please try again later.'
          ),
        ],
      });
    }

    const embed = createBaseEmbed('Profile Linked & Verified', COLORS.EMERALD)
      .setDescription(
        `Successfully linked <@${interaction.user.id}> to **${member.name}**!`
      )
      .addFields(
        {
          name: 'Player Info',
          value: [
            `• **Name:** ${member.name}`,
            `• **Player ID:** \`${member.gameId || 'Not Linked'}\``,
            `• **Rank:** ${formatRank(member.rank)}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Account Standing',
          value: [
            `• **Status:** \`${member.status || 'Active'}\``,
            `• **Verification:** Verified`,
            `• **Strikes:** \`${member.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Next Steps',
          value: [
            '• Use **/vote** or the button below to vote for Bear Trap',
            '• Use **/beartrap** to view countdown and turnouts',
            '• Use **/me** to check your profile and attendance',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • [HOT] OneForAll',
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
