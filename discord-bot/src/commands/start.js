import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';
import { createLinkButton, createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Alliance onboarding console and War Room quick actions');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const member = await crmApi.getLinkedMember(interaction.user.id);

    // 1. NEW USER (NOT LINKED YET) - CLEAN STEP 1 ONBOARDING
    if (!member) {
      const embed = createBaseEmbed('👋 Welcome to Kingdom #1391 [HOT] Alliance Command', COLORS.GOLD)
        .setDescription(
          `Hail warrior! You have entered the official Discord command center of **House of Titans [HOT]**.\n\n` +
          `### 🛡️ Step 1: In-Game Identity Verification\n` +
          `To keep alliance operations secure, commands unlock in a structured sequence.\n` +
          `Before accessing the War Room, you must verify your in-game identity.\n\n` +
          `📸 **How to Verify:**\n` +
          `1. Open King's Shot and tap your avatar to open your **Governor Profile** screen.\n` +
          `2. Take a screenshot (showing your name, ID, and the bottom **Settings** tab).\n` +
          `3. Click the command button below to attach your screenshot:\n\n` +
          `👉 **</link:1557524738736267364>**\n\n` +
          `*(All alliance combat tools and commands will unlock automatically upon verification!)*`
        )
        .setFooter({ text: 'Kingdom #1391 • House of Titans • Identity Verification' });

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. VERIFIED WARRIOR - STRUCTURED SEQUENTIAL WAR ROOM CONSOLE
    const [attRes, leaderboardRes] = await Promise.all([
      crmApi.getAttendance(member.id, '', 5).catch(() => ({ data: [] })),
      crmApi.getLeaderboard(100).catch(() => ({ data: [] })),
    ]);

    const leaderboard = leaderboardRes.data || [];
    const lbEntry = leaderboard.find(l => l.memberId === member.id);
    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;

    const embed = createBaseEmbed(`👑 Welcome back, ${member.name}!`, COLORS.EMERALD)
      .setDescription(
        `Your Discord identity is verified and bound to **${member.name}** [${formatRank(member.rank)}].\n\n` +
        `**Status:** \`${member.status || 'Active'}\` • **Turnout Score:** ${renderProgressBar(attendanceRate)}`
      )
      .addFields(
        {
          name: '⚔️ War Room Command Sequence',
          value: [
            '`1.` 🗳️ **/vote** — Cast active Bear Trap slot vote',
            '`2.` 🐻 **/beartrap** — Live countdown & slot turnout status',
            '`3.` 📊 **/me** — View personal combat dossier & battle history',
            '`4.` 🏰 **/roster** — Full 80-member alliance census & ranks',
            '`5.` 🏆 **/leaderboard** — Global attendance rankings',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: 'Click any button below for instant action, or type /help for the full manual.' });

    await interaction.editReply({
      embeds: [embed],
      components: [createWarRoomButtons()],
    });
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
