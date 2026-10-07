import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('checkin')
  .setDescription('Daily War Room check-in to build your battle streak and earn Titan glory');

function getStreakBadge(streak) {
  if (streak >= 30) return '👑 **Immortal Titan** (30+ Days)';
  if (streak >= 14) return '🥇 **Veteran Titan** (14+ Days)';
  if (streak >= 7) return '🥈 **Vanguard Warrior** (7+ Days)';
  if (streak >= 3) return '🥉 **Scout Contender** (3+ Days)';
  return '🌱 **Recruit Stride** (1-2 Days)';
}

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    // Check if user is linked to an in-game profile
    const linked = await crmApi.getLinkedMember(userId).catch(() => null);
    const warriorName = linked ? linked.name : displayName;

    const checkins = await crmApi.getSetting('bot_checkins', {});
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const userRecord = checkins[userId] || {
      streak: 0,
      totalCheckins: 0,
      lastDate: null,
      name: warriorName,
    };

    userRecord.name = warriorName;

    // 1. Already checked in today
    if (userRecord.lastDate === today) {
      const embed = createBaseEmbed('⏰ Already Checked In Today', COLORS.GOLD)
        .setDescription(
          `Hail **${warriorName}**! You have already completed your daily roll call for today.\n\n` +
          `🔥 **Current Streak:** **${userRecord.streak} Days**\n` +
          `🎖️ **Badge:** ${getStreakBadge(userRecord.streak)}\n\n` +
          `*Come back tomorrow after 00:00 UTC to extend your battle streak!*`
        )
        .setFooter({ text: 'Use /streaks to view the top streak leaderboard.' });

      return await interaction.editReply({ embeds: [embed] });
    }

    // 2. Continuous streak (checked in yesterday)
    if (userRecord.lastDate === yesterday) {
      userRecord.streak += 1;
    } else {
      // Streak broken or brand new
      userRecord.streak = 1;
    }

    userRecord.totalCheckins = (userRecord.totalCheckins || 0) + 1;
    userRecord.lastDate = today;
    checkins[userId] = userRecord;

    await crmApi.setSetting('bot_checkins', checkins);

    const badge = getStreakBadge(userRecord.streak);
    const fireEmojis = '🔥'.repeat(Math.min(userRecord.streak, 5));

    const embed = createBaseEmbed(`⚔️ Daily Check-in Claimed!`, COLORS.EMERALD)
      .setDescription(
        `**Kingdom #1391 War Room Presence Recorded**\n\n` +
        `Welcome to today's combat muster, **${warriorName}**!`
      )
      .addFields(
        {
          name: `${fireEmojis} Battle Streak`,
          value: `**${userRecord.streak} Consecutive Days**`,
          inline: true,
        },
        {
          name: '🎖️ Honor Standing',
          value: badge,
          inline: true,
        },
        {
          name: '📈 Total Muster Count',
          value: `**${userRecord.totalCheckins} Total Check-ins**`,
          inline: true,
        }
      )
      .setFooter({
        text: 'Keep the fire burning! Run /streaks to see who leads the alliance.',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /checkin error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to record daily check-in: \`${err.message}\``
        ),
      ],
    });
  }
}
