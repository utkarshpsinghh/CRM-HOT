import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';
import { createLinkButton } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Alliance command manual and verification portal');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const linkedMember = await crmApi.getLinkedMember(interaction.user.id);

    // 1. UNLINKED USER: REQUIRE LINK FIRST
    if (!linkedMember) {
      const embed = createBaseEmbed('🛡️ [HOT] Alliance Verification Required', COLORS.GOLD)
        .setDescription(
          `**Welcome to Kingdom #1391 • House of Titans [HOT] Bot!**\n\n` +
          `⚠️ **Step 1: Link Your In-Game Account First**\n` +
          `All alliance combat data and voting tools are secured behind in-game profile verification.\n\n` +
          `You must link your Discord identity with an in-game **Governor Profile screenshot** (showing your name, ID, and Settings tab) before accessing alliance commands.\n\n` +
          `👉 **Click the button below or type \`/link <name_or_id>\` to upload your screenshot.**\n\n` +
          `*(Once verified, type \`/help\` again to unlock the full command console!)*`
        )
        .addFields(
          {
            name: '🔒 Locked Features (Unlocked Upon Verification)',
            value: [
              '• 🐻 Bear Trap Schedule, Countdown & Status (`/beartrap`)',
              '• 🗳️ Bear Trap Battle Slot Voting (`/vote`)',
              '• 📊 Personal Combat Dossier & Turnout Rating (`/me`)',
              '• 🏆 Global Alliance Leaderboards & MVP (`/leaderboard`, `/mvp`)',
              '• 🏰 Full 80-Member Roster & Census (`/roster`)',
              '• ⚔️ Battle Records & Head-to-Head Comparison (`/compare`, `/attendance`)',
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({
          text: 'Upload your Governor Profile screenshot with /link to complete verification.',
        });

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. VERIFIED USER: CLEAN & FOCUSED COMMAND DIRECTORY
    const embed = createBaseEmbed('🛡️ [HOT] Alliance Bot — Command Directory', COLORS.GOLD)
      .setDescription(
        `Welcome back, **${linkedMember.name}** [${linkedMember.rank}]!\n` +
        `Your identity is verified. Here is your official command console for **Kingdom #1391 [HOT]**:`
      )
      .addFields(
        {
          name: '👤 Identity & Account Management',
          value: [
            '• `/start` — Onboarding portal & quick action console.',
            '• `/link <player> <screenshot>` — Link in-game account with Governor Profile screenshot verification.',
            '• `/unlink [user]` — Disconnect linked profile (or officer unlinks a member).',
            '• `/me` — View your personal combat dossier, strikes, and battle turnout.',
            '• `/profile <player>` — Look up any alliance member dossier by Name or Player ID.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚔️ Battle Coordination & Bear Trap Voting',
          value: [
            '• `/vote` — Cast your Bear Trap battle deployment slot vote.',
            '• `/beartrap` — Next battle countdown, live dual slot status (`16:00 UTC` / `00:30 UTC`), and turnouts.',
            '• `/attendance <player>` — Detailed battle ledger showing voted and attended slots.',
            '• `/events [status]` — Schedule for Bear Traps, Swordsland War, and Tri Alliance battles.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🏆 Rankings & Alliance Roster',
          value: [
            '• `/leaderboard [limit] [sort_by]` — Global alliance leaderboard (attendance rate or battle count).',
            '• `/mvp` — Spotlight the #1 reigning battle MVP and top elite contenders.',
            '• `/roster [rank]` — Alliance census summary & division lists (All 80 members, R5, R4, R3, R2, R1).',
            '• `/compare <player1> <player2>` — Head-to-head attendance and rank showdown.',
            '• `/inactives [filter]` — Spot inactive members or players with warning strikes.',
            '• `/strike <add|remove>` — *(Officers only)* Issue or waive disciplinary strikes.',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • House of Titans • Powered by HOT Alliance Command',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /help error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load command directory: \`${err.message}\``
        ),
      ],
    });
  }
}
