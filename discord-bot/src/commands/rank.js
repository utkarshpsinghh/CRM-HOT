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
  .setDescription('Check your leaderboard standing or inspect any alliance member rank')
  .addStringOption(opt =>
    opt
      .setName('player')
      .setDescription('Optional: Member name or numeric Player ID (leave blank to check your own rank)')
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
            createBaseEmbed('Warrior Not Found', COLORS.CRIMSON).setDescription(
              `Could not find any member matching **"${query}"** in the Kingdom #1391 [HOT] roster.\n\n` +
              `*Tip: Please check spelling or use their exact numeric in-game Player ID.*`
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
    const reliabilityScore = lbEntry ? lbEntry.reliabilityScore : 0;

    // Determine rank tier & badge
    let tierBadge = '🎖️ Soldier';
    let tierColor = COLORS.GOLD;
    if (typeof rankNum === 'number') {
      if (rankNum === 1) {
        tierBadge = '👑 #1 Reigning MVP';
        tierColor = COLORS.EMERALD;
      } else if (rankNum <= 5) {
        tierBadge = '💎 Elite Top 5 Vanguard';
        tierColor = COLORS.EMERALD;
      } else if (rankNum <= 20) {
        tierBadge = '⚔️ Top 20 Combatant';
        tierColor = COLORS.GOLD;
      } else if (rankNum <= 50) {
        tierBadge = '🛡️ Active Battler';
        tierColor = COLORS.GOLD;
      } else {
        tierBadge = '⚠️ Needs Attendance Boost';
        tierColor = COLORS.BRONZE;
      }
    }

    // Construct nearby leaderboard context (who is above and below)
    let competitorLines = [];
    if (targetIdx !== -1) {
      const start = Math.max(0, targetIdx - 1);
      const end = Math.min(leaderboard.length, targetIdx + 2);
      competitorLines = leaderboard.slice(start, end).map(c => {
        const isSelf = c.memberId === targetMember.id;
        const pointer = isSelf ? ' 👈 **(Target)**' : '';
        const nameFormatted = isSelf ? `**${c.name}**` : c.name;
        return `\`#${c.rank.toString().padStart(2, ' ')}\` ${nameFormatted} — **${c.attendanceRate}%** (${c.attendedCount}/${c.totalEvents} battles)${pointer}`;
      });
    }

    const embed = createBaseEmbed(`🏆 [HOT] Warrior Rank Standing: ${targetMember.name}`, tierColor)
      .setDescription(
        `**Kingdom #1391 • House of Titans [HOT]**\n` +
        `Combat standing and performance metrics for **${targetMember.name}**.\n\n` +
        `🎖️ **Tier Standing:** \`${tierBadge}\`\n` +
        `🏆 **Leaderboard Rank:** **#${rankNum}** of **${totalMembers}** warriors\n` +
        `📊 **Attendance Turnout:** ${renderProgressBar(attendanceRate)}`
      )
      .addFields(
        {
          name: '👤 Identity & Alliance Rank',
          value: [
            `• **Alliance Rank:** ${formatRank(targetMember.rank)}`,
            `• **Player ID:** \`${targetMember.gameId || 'Not Linked'}\``,
            `• **Account Status:** \`${targetMember.status || 'Active'}\``,
            `• **Strikes:** \`${targetMember.strikes || 0} / 3\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '⚔️ Battle Attendance Records',
          value: [
            `• **Turnout Rate:** **${attendanceRate}%**`,
            `• **Battles Attended:** **${attendedCount}** / **${totalBattles}**`,
            `• **Reliability Score:** **${reliabilityScore}%**`,
            `• **Leaderboard Rank:** **#${rankNum}** / **${totalMembers}**`,
          ].join('\n'),
          inline: true,
        }
      );

    if (competitorLines.length > 0) {
      embed.addFields({
        name: '🎯 Leaderboard Context (Surrounding Warriors)',
        value: competitorLines.join('\n'),
        inline: false,
      });
    }

    embed.setFooter({
      text: 'Kingdom #1391 • House of Titans • Attendance Leaderboard',
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_action_vote')
        .setLabel('🗳️ Cast Vote')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_action_beartrap')
        .setLabel('🐻 Battle Status')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_action_me')
        .setLabel('📊 Full Dossier')
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
          `Failed to load warrior rank: \`${err.message}\``
        ),
      ],
    });
  }
}
