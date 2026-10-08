import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';
import { createLinkButton, createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Alliance menu and quick actions');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const member = await crmApi.getLinkedMember(interaction.user.id);

    // 1. UNLINKED USER
    if (!member) {
      const embed = createBaseEmbed('Welcome to [HOT] OneForAll', COLORS.GOLD)
        .setDescription(
          `Welcome! This is the official bot for **[HOT] OneForAll** (Kingdom #1391).\n\n` +
          `**Step 1: Link your account**\n` +
          `To vote and view your stats, please link your in-game profile first.\n\n` +
          `**How to link:**\n` +
          `1. Open King's Shot and tap your avatar to open your profile screen.\n` +
          `2. Take a screenshot.\n` +
          `3. Click the button below or use **/link** to attach your screenshot.\n\n` +
          `Your profile, voting, and attendance will be unlocked once linked.`
        );

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. VERIFIED MEMBER
    const [attRes, leaderboardRes] = await Promise.all([
      crmApi.getAttendance(member.id, '', 5).catch(() => ({ data: [] })),
      crmApi.getLeaderboard(100).catch(() => ({ data: [] })),
    ]);

    const leaderboard = leaderboardRes.data || [];
    const lbEntry = leaderboard.find(l => l.memberId === member.id);
    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;

    const embed = createBaseEmbed(`Welcome, ${member.name}!`, COLORS.EMERALD)
      .setDescription(
        `Linked account: **${member.name}** [${formatRank(member.rank)}]\n\n` +
        `• **Status:** \`${member.status || 'Active'}\`\n` +
        `• **Leaderboard Rank:** **#${lbEntry ? lbEntry.rank : 'Unranked'}** of **${leaderboard.length || 80}** members\n` +
        `• **Attendance Rate:** ${renderProgressBar(attendanceRate)}`
      )
      .addFields({
        name: 'Available Commands',
        value: [
          '`/vote` — Vote for your Bear Trap slot',
          '`/beartrap` — Bear Trap schedule and turnout',
          '`/myrank` — Check your leaderboard standing',
          '`/me` — View your profile and stats',
          '`/leaderboard` — View alliance attendance rankings',
        ].join('\n'),
        inline: false,
      })
      .setFooter({ text: 'Select an option below or type /help for all commands' });

    await interaction.editReply({
      embeds: [embed],
      components: [createWarRoomButtons()],
    });
  } catch (err) {
    console.error('Execute /start error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load menu: \`${err.message}\``
        ),
      ],
    });
  }
}
