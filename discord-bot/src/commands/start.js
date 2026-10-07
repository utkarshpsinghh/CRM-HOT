import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';
import { createLinkButton } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Get started with Kingdom #1391 [HOT] Bot and link your account');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const member = await crmApi.getLinkedMember(interaction.user.id);

    // 1. NEW USER (NOT LINKED YET)
    if (!member) {
      const embed = createBaseEmbed('👋 Welcome to Kingdom #1391 [HOT] Alliance Command', COLORS.GOLD)
        .setDescription(
          `Greetings warrior! You have entered the official Discord command center of **House of Titans [HOT]**.\n\n` +
          `### 🚀 Step 1: Link Your In-Game Account\n` +
          `To unlock personalized battle records, daily check-in streaks, combat duels, and role verification, link your in-game identity.\n\n` +
          `👉 **Click the button below to link immediately**, or run **\`/link <in_game_name_or_id>\`**.`
        )
        .addFields(
          {
            name: '✨ What You Unlock Upon Linking:',
            value: [
              '• **/me** — Instant personal battle dossier & turnout rating',
              '• **/checkin** — Build daily attendance streaks & earn Titan titles',
              '• **/duel** — Challenge alliance brothers & sisters to combat duels',
              '• **/salute** — Commend fellow fighters for big plays in rallies',
            ].join('\n'),
            inline: false,
          },
          {
            name: '📜 Public Reference Commands (Always Available):',
            value: [
              '• **/beartrap** — Dual slot times & live battle countdown',
              '• **/rollcall** — Interactive RSVP buttons for upcoming battles',
              '• **/leaderboard** — Top warriors ranked by attendance',
              '• **/roster** — Full 80-member alliance census & division directory',
              '• **/help** — Complete categorized command manual',
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({ text: 'Click "Link In-Game Account" below to get started!' });

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. RETURNING USER (ALREADY LINKED)
    const [attRes, leaderboardRes] = await Promise.all([
      crmApi.getAttendance(member.id, '', 5).catch(() => ({ data: [] })),
      crmApi.getLeaderboard(100).catch(() => ({ data: [] })),
    ]);

    const leaderboard = leaderboardRes.data || [];
    const lbEntry = leaderboard.find(l => l.memberId === member.id);
    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;

    const embed = createBaseEmbed(`👑 Welcome back, ${member.name}!`, COLORS.EMERALD)
      .setDescription(
        `Your Discord account <@${interaction.user.id}> is actively linked to **${member.name}** in the [HOT] Alliance database.\n\n` +
        `**Status:** \`${member.status || 'Active'}\` • **Rank:** ${formatRank(member.rank)} • **Turnout:** ${renderProgressBar(attendanceRate)}`
      )
      .addFields(
        {
          name: '🎯 Quick Combat Actions',
          value: [
            '• **/checkin** — Claim your daily war room muster streak',
            '• **/beartrap** — Check countdown & turnout for the next trap',
            '• **/me** — View your complete combat dossier & last 5 battles',
            '• **/duel <opponent>** — Challenge an alliance comrade to a duel',
            '• **/trivia play** — Test your Whiteout Survival & kingdom knowledge',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: 'Type /help for the complete directory of 20 alliance commands.' });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /start error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to initialize start menu: \`${err.message}\``
        ),
      ],
    });
  }
}
