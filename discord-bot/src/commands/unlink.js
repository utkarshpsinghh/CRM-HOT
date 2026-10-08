import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('unlink')
  .setDescription('Disconnect your Discord account from your in-game profile')
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('Officer option: Specific Discord user to unlink (leave empty to unlink yourself)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const targetUser = interaction.options.getUser('user');
    const isUnlinkingOther = Boolean(targetUser && targetUser.id !== interaction.user.id);

    if (isUnlinkingOther) {
      const isOfficer =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
        interaction.member?.roles?.cache?.some(r => {
          const name = r.name.toLowerCase();
          return name.includes('officer') || name.includes('r4') || name.includes('r5') || name.includes('lead');
        });

      if (!isOfficer) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Permission Denied', COLORS.CRIMSON).setDescription(
              'Only **Alliance Officers (R4/R5)** or Administrators can unlink another member.'
            ),
          ],
        });
      }
    }

    const userIdToUnlink = targetUser ? targetUser.id : interaction.user.id;
    const targetMention = `<@${userIdToUnlink}>`;

    const result = await crmApi.unlinkDiscordUser(userIdToUnlink);

    if (!result.success) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Unlink Failed', COLORS.GOLD).setDescription(
            result.message || 'Account is not currently linked to any in-game profile.'
          ),
        ],
      });
    }

    const embed = createBaseEmbed('Account Unlinked', COLORS.EMERALD)
      .setDescription(
        isUnlinkingOther
          ? `Officer <@${interaction.user.id}> has unlinked ${targetMention} from **${result.memberName}**.`
          : `Successfully disconnected your Discord account from **${result.memberName}**.`
      )
      .addFields(
        {
          name: 'Previous Profile',
          value: `• **Name:** ${result.memberName}\n• **Player ID:** \`${result.gameId || 'N/A'}\``,
          inline: true,
        },
        {
          name: 'Next Steps',
          value: 'You can link your account again anytime by typing **/link**.',
          inline: true,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • [HOT] OneForAll',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /unlink error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to unlink account: \`${err.message}\``
        ),
      ],
    });
  }
}
