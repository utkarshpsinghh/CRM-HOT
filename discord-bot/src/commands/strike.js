import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('strike')
  .setDescription('Alliance officer command to issue or remove disciplinary strikes')
  .addSubcommand(sub =>
    sub
      .setName('add')
      .setDescription('Issue a strike to a player for attendance or rule violation')
      .addStringOption(opt =>
        opt
          .setName('player')
          .setDescription('Player in-game Name or Player ID')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('reason')
          .setDescription('Reason for the strike (e.g. Unexcused absence at Bear Trap #46)')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('remove')
      .setDescription('Remove/waive a strike from a player')
      .addStringOption(opt =>
        opt
          .setName('player')
          .setDescription('Player in-game Name or Player ID')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  // Check officer / admin permission
  const isOfficer =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.member?.roles?.cache?.some(r => {
      const name = r.name.toLowerCase();
      return name.includes('officer') || name.includes('r4') || name.includes('r5') || name.includes('lead');
    });

  if (!isOfficer) {
    return await interaction.reply({
      embeds: [
        createBaseEmbed('Permission Denied', COLORS.CRIMSON).setDescription(
          '⛔ Only **Alliance Officers (R4/R5)** or Server Administrators are authorized to issue or remove disciplinary strikes.'
        ),
      ],
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand();
  const playerQuery = interaction.options.getString('player');
  const officerName = interaction.user.username;

  try {
    const member = await crmApi.searchMember(playerQuery);

    if (!member) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player Not Found', COLORS.CRIMSON).setDescription(
            `Could not find any member matching **"${playerQuery}"** in the roster.`
          ),
        ],
      });
    }

    if (subcommand === 'add') {
      const reason = interaction.options.getString('reason');
      const result = await crmApi.addStrike(member.id, reason, officerName);

      if (!result.success) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Action Failed', COLORS.CRIMSON).setDescription(
              `Failed to add strike: ${result.message}`
            ),
          ],
        });
      }

      const isCritical = result.newStrikes >= 3;
      const statusTitle = isCritical
        ? '🚨 DISCIPLINARY ALERT: 3/3 STRIKES REACHED'
        : '⚠️ Disciplinary Action: Strike Issued';

      const embed = createBaseEmbed(statusTitle, COLORS.CRIMSON)
        .setDescription(
          isCritical
            ? `**WARRIOR HAS REACHED CRITICAL 3/3 STRIKES!**\nRecommend leadership review for dismissal or demotion.`
            : `A disciplinary penalty strike has been issued to **${member.name}**.`
        )
        .addFields(
          {
            name: '👤 Member',
            value: `**${member.name}** (${formatRank(member.rank)})\nPlayer ID: \`${member.gameId || 'N/A'}\``,
            inline: true,
          },
          {
            name: '📊 Updated Strikes',
            value: `**${result.newStrikes} / 3 Strikes**`,
            inline: true,
          },
          {
            name: '📝 Violation Reason',
            value: `*${reason}*`,
            inline: false,
          },
          {
            name: '🛡️ Enforcing Officer',
            value: `<@${interaction.user.id}> (${officerName})`,
            inline: true,
          }
        );

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'remove') {
      const result = await crmApi.removeStrike(member.id, officerName);

      if (!result.success) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Action Failed', COLORS.GOLD).setDescription(
              result.message || 'Failed to remove strike.'
            ),
          ],
        });
      }

      const embed = createBaseEmbed('⚖️ Disciplinary Action: Strike Waived', COLORS.EMERALD)
        .setDescription(`Successfully waived 1 penalty strike for **${member.name}**.`)
        .addFields(
          {
            name: '👤 Member',
            value: `**${member.name}** (${formatRank(member.rank)})`,
            inline: true,
          },
          {
            name: '📊 Remaining Strikes',
            value: `**${result.newStrikes} / 3 Strikes**`,
            inline: true,
          },
          {
            name: '🛡️ Authorized By',
            value: `<@${interaction.user.id}> (${officerName})`,
            inline: true,
          }
        );

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Execute /strike error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `An error occurred while processing strike: \`${err.message}\``
        ),
      ],
    });
  }
}
