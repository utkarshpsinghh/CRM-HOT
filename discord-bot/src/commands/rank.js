import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank, renderProgressBar } from '../utils/embedBuilder.js';
import { requireLinkedMember } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('Check your leaderboard rank or inspect any alliance member')
  .addStringOption(opt =>
    opt
      .setName('player')
      .setDescription('Optional: Member name or Player ID (leave blank for your own rank)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const query = interaction.options?.getString?.('player');
    let targetMember = null;

    if (query) {
      targetMember = await crmApi.searchMember(query);
      if (!targetMember) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Member Not Found', COLORS.CRIMSON).setDescription(
              `Could not find any member matching **"${query}"** in the [HOT] OneForAll roster.\n\n` +
              `*Tip: Please check spelling or use their numeric Player ID.*`
            ),
          ],
        });
      }
    } else {
      // Check caller's own rank
      targetMember = await requireLinkedMember(interaction, 'rank');
      if (!targetMember) return;
    }

    // Fetch full leaderboard data
    const lbRes = await crmApi.getLeaderboard(100);
    const leaderboard = lbRes.data || [];
    const totalMembers = leaderboard.length || 80;

    // Find target in leaderboard
    const targetIdx = leaderboard.findIndex(m => m.memberId === targetMember.id);
    const lbEntry = targetIdx !== -1 ? leaderboard[targetIdx] : null;
    const rankNum = lbEntry ? lbEntry.rank : (targetIdx !== -1 ? targetIdx + 1 : 'Unranked');

    const attendanceRate = lbEntry ? lbEntry.attendanceRate : 0;
    const attendedCount = lbEntry ? lbEntry.attendedCount : 0;
    const totalBattles = lbEntry ? lbEntry.totalEvents : (lbRes.totalCompletedEvents || 8);

    // Determine rank tier & badge
    let tierBadge = 'Member';
    let tierColor = COLORS.GOLD;
    if (typeof rankNum === 'number') {
      if (rankNum === 1) {
        tierBadge = '#1 MVP';
        tierColor = COLORS.EMERALD;
      } else if (rankNum <= 5) {
        tierBadge = 'Top 5';
        tierColor = COLORS.EMERALD;
      } else if (rankNum <= 20) {
        tierBadge = 'Top 20';
        tierColor = COLORS.GOLD;
      } else if (rankNum <= 50) {
        tierBadge = 'Top 50';
        tierColor = COLORS.GOLD;
      } else {
        tierBadge = 'Member';
        tierColor = COLORS.BRONZE;
      }
    }

    // Construct nearby leaderboard context
    let competitorLines = [];
    if (targetIdx !== -1) {
      const start = Math.max(0, targetIdx - 1);
      const end = Math.min(leaderboard.length, targetIdx + 2);
      competitorLines = leaderboard.slice(start, end).map(c => {
        const isSelf = c.memberId === targetMember.id;
        const pointer = isSelf ? ' 👈' : '';
        const nameFormatted = isSelf ? `**${c.name}**` : c.name;
        return `\`#${c.rank.toString().padStart(2, ' ')}\` ${nameFormatted} — **${c.attendanceRate}%** (${c.attendedCount}/${c.totalEvents} events)${pointer}`;
      });
    }

    const embed = createBaseEmbed(`[HOT] OneForAll • ${targetMember.name}`, tierColor)
      .setDescription(
        `Leaderboard rank and stats for **${targetMember.name}**\n\n` +
        `• **Rank:** **#${rankNum}** of **${totalMembers}** members (${tierBadge})\n` +
        `• **Attendance Rate:** ${renderProgressBar(attendanceRate)}`
      )
      .addFields(
        {
          name: 'Member Info',
          value: [
            `• **Alliance Rank:** ${formatRank(targetMember.rank)}`,
            `• **Player ID:** \`${targetMember.gameId || 'Not Linked'}\``,
            `• **Status:** \`${targetMember.status || 'Active'}\``,
            `• **Strikes:** \`${targetMember.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Attendance Stats',
          value: [
            `• **Turnout Rate:** **${attendanceRate}%**`,
            `• **Events Attended:** **${attendedCount}** / **${totalBattles}**`,
            `• **Leaderboard Rank:** **#${rankNum}** / **${totalMembers}**`,
          ].join('\n'),
          inline: true,
        }
      );

    if (competitorLines.length > 0) {
      embed.addFields({
        name: 'Nearby Leaderboard Members',
        value: competitorLines.join('\n'),
        inline: false,
      });
    }

    embed.setFooter({
      text: 'Kingdom #1391 • [HOT] OneForAll',
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_action_vote')
        .setLabel('Cast Vote')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_action_beartrap')
        .setLabel('Bear Trap')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_action_me')
        .setLabel('My Profile')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  } catch (err) {
    console.error('Execute /rank error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load rank: \`${err.message}\``
        ),
      ],
    });
  }
}
