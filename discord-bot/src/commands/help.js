import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';
import { createLinkButton, createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Alliance commands directory and instructions');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const linkedMember = await crmApi.getLinkedMember(interaction.user.id);

    // 1. UNLINKED USER
    if (!linkedMember) {
      const embed = createBaseEmbed('Verification Required', COLORS.GOLD)
        .setDescription(
          `**Welcome to [HOT] OneForAll (Kingdom #1391)**\n\n` +
          `Please link your in-game profile to access alliance commands.\n\n` +
          `**How to link:**\n` +
          `1. In King's Shot, tap your avatar to open your profile screen.\n` +
          `2. Take a screenshot.\n` +
          `3. Click the button below or type **/link** to attach your screenshot.\n\n` +
          `Once linked, type \`/help\` or \`/start\` to view your commands.`
        )
        .setFooter({
          text: 'Kingdom #1391 • [HOT] OneForAll',
        });

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. VERIFIED USER
    const embed = createBaseEmbed('[HOT] OneForAll • Commands', COLORS.GOLD)
      .setDescription(
        `Welcome back, **${linkedMember.name}** [${linkedMember.rank}]!\n` +
        `Here is the list of available alliance commands:`
      )
      .addFields(
        {
          name: '1. Battles & Voting',
          value: [
            '`/vote` — Vote for your Bear Trap slot',
            '`/beartrap` — Next battle countdown, slot status, and turnouts',
            '`/attendance [player]` — Battle attendance and vote history',
            '`/events [status]` — Schedule of alliance events',
          ].join('\n'),
          inline: false,
        },
        {
          name: '2. Profile & Rankings',
          value: [
            '`/myrank` — Check your leaderboard standing',
            '`/rank [player]` — View your rank or inspect another member',
            '`/me` — View your profile and stats',
            '`/profile <player>` — Look up any alliance member',
            '`/start` — Quick actions menu',
          ].join('\n'),
          inline: false,
        },
        {
          name: '3. Leaderboards & Stats',
          value: [
            '`/leaderboard [limit] [sort_by]` — Alliance attendance rankings',
            '`/mvp` — Top attendance MVP and contenders',
            '`/compare <player1> <player2>` — Compare attendance between two members',
            '`/inactives [filter]` — View inactive members or active strikes',
          ].join('\n'),
          inline: false,
        },
        {
          name: '4. Account & Officer Tools',
          value: [
            '`/link [screenshot] [player]` — Link account with profile screenshot',
            '`/unlink [user]` — Disconnect linked profile',
            '`/strike <add|remove>` — *(Officers only)* Issue or remove strikes',
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
    console.error('Execute /help error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load commands: \`${err.message}\``
        ),
      ],
    });
  }
}
