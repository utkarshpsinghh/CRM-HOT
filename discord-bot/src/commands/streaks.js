import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('streaks')
  .setDescription('View the top daily check-in streak leaders of Kingdom #1391 [HOT]');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const checkins = await crmApi.getSetting('bot_checkins', {});
    const entries = Object.entries(checkins).map(([userId, data]) => ({
      userId,
      ...data,
    }));

    // Sort by streak descending, then total check-ins
    entries.sort((a, b) => (b.streak || 0) - (a.streak || 0) || (b.totalCheckins || 0) - (a.totalCheckins || 0));

    const topLeaders = entries.slice(0, 10);

    if (topLeaders.length === 0) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('No Streaks Active', COLORS.GOLD).setDescription(
            'No alliance members have checked in yet today!\n\n👉 Type **`/checkin`** to ignite the very first battle streak!'
          ),
        ],
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const leaderLines = topLeaders.map((u, idx) => {
      const medal = medals[idx] || '🎖️';
      return `${medal} **${u.name}** — 🔥 **${u.streak} Days** (*${u.totalCheckins || u.streak} Total Musters*)`;
    });

    const embed = createBaseEmbed('🔥 [HOT] War Room Streak Leaderboard', COLORS.GOLD)
      .setDescription(
        '**Kingdom #1391 • House of Titans [HOT]**\n' +
        'Honor roll of our most dedicated warriors who never miss roll call!'
      )
      .addFields({
        name: '🏆 Top Dedicated Warriors',
        value: leaderLines.join('\n'),
        inline: false,
      })
      .setFooter({
        text: 'Type /checkin daily to build and climb the streak ranks!',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /streaks error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load streak rankings: \`${err.message}\``
        ),
      ],
    });
  }
}
