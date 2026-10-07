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

    // 1. UNLINKED USER: DO NOT REVEAL COMMANDS YET — REQUIRE LINK FIRST!
    if (!linkedMember) {
      const embed = createBaseEmbed('🛡️ [HOT] Alliance Verification Required', COLORS.GOLD)
        .setDescription(
          `**Welcome to Kingdom #1391 • House of Titans [HOT] Bot!**\n\n` +
          `⚠️ **Step 1: Link Your In-Game Account First**\n` +
          `All alliance combat data, roster statistics, and war room features are locked behind identity verification.\n\n` +
          `You must link your Discord identity to your in-game player profile before accessing alliance commands.\n\n` +
          `👉 **Click the button below to link instantly**, or type **\`/link <in_game_name_or_id>\`**.\n\n` +
          `*(Once verified, type \`/help\` again to unlock the full 21-command console!)*`
        )
        .addFields(
          {
            name: '🔒 Locked Features (Unlocked Upon Verification)',
            value: [
              '• 🐻 Bear Trap Schedule, Dual Slots & Countdown (`/beartrap`)',
              '• 📢 Interactive Battle RSVP Roll Calls (`/rollcall`)',
              '• 📊 Personal Combat Dossier & Turnout Rating (`/me`)',
              '• 🔥 Daily War Room Attendance Streaks (`/checkin`)',
              '• 🏆 Global Alliance Leaderboards & MVP (`/leaderboard`, `/mvp`)',
              '• 🏰 Full 80-Member Roster & Census (`/roster`)',
              '• ⚔️ Combat Duels & Kingshot Trivia (`/duel`, `/trivia`)',
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({
          text: 'Click "Link In-Game Account" below to complete verification.',
        });

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. VERIFIED / LINKED USER: REVEAL FULL COMMAND DIRECTORY
    const embed = createBaseEmbed('🛡️ [HOT] Alliance Bot — Command Directory', COLORS.GOLD)
      .setDescription(
        `Welcome back, **${linkedMember.name}** [${linkedMember.rank}]!\n` +
        `Your identity is verified. Here is your full command console for **Kingdom #1391 [HOT]**:`
      )
      .addFields(
        {
          name: '👤 Identity & Personal Dossier',
          value: [
            '• `/start` — Interactive onboarding portal & quick action console.',
            '• `/link <player>` — Link your Discord account to your in-game Name or Player ID.',
            '• `/unlink [user]` — Disconnect your linked in-game identity.',
            '• `/me` — View your own combat dossier, attendance, and strikes instantly.',
            '• `/profile <player>` — Inspect any alliance member by Name or Player ID.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🏆 Rankings & Competition',
          value: [
            '• `/leaderboard [limit] [sort_by]` — Global alliance leaderboard (attendance rate or battle count).',
            '• `/mvp` — Spotlight the #1 reigning battle MVP and top elite contenders.',
            '• `/compare <player1> <player2>` — Head-to-head combat and attendance showdown.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚔️ Battle Coordination & Bear Trap',
          value: [
            '• `/beartrap` — Next battle countdown, dual slot times (`16:00 UTC` / `00:30 UTC`), and turnouts.',
            '• `/rollcall [battle]` — Launch live interactive RSVP roll call buttons for upcoming battles.',
            '• `/events [status]` — Schedule for Bear Traps, Swordsland War, and Tri Alliance battles.',
            '• `/attendance <player>` — Detailed battle ledger showing voted & attended slots.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔥 Community Engagement & War Room Games',
          value: [
            '• `/checkin` — Daily war room roll call to build your consecutive attendance streak.',
            '• `/streaks` — Top 10 longest active streak leaders.',
            '• `/salute give <player>` — Commend a comrade for clutch rallies or great advice.',
            '• `/salute leaderboard` — Most respected warriors honor roll.',
            '• `/duel <opponent>` — Challenge an alliance brother or sister to a combat duel simulator!',
            '• `/trivia play` — Rapid-fire Kingshot & Kingdom lore trivia with live buttons.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🏰 Alliance Roster & Discipline',
          value: [
            '• `/roster [rank]` — Alliance census summary & division lists (All 80 members, R5, R4, R3, R2, R1).',
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
