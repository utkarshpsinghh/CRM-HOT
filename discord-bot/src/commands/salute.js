import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';
import { requireLinkedMember } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('salute')
  .setDescription('Commend a fellow alliance comrade for valor, rallies, or battle leadership')
  .addSubcommand(sub =>
    sub
      .setName('give')
      .setDescription('Render an official combat salute to an alliance member')
      .addStringOption(opt =>
        opt
          .setName('player')
          .setDescription('Player in-game Name or Player ID')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('reason')
          .setDescription('Reason for the salute (e.g. Clutch Bear Trap damage or great defense!)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('leaderboard')
      .setDescription('View the Most Respected Warriors leaderboard (most saluted)')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply();

  try {
    const salutesData = await crmApi.getSetting('bot_salutes', {});

    // 1. LEADERBOARD SUBCOMMAND
    if (subcommand === 'leaderboard') {
      const entries = Object.values(salutesData);
      entries.sort((a, b) => (b.count || 0) - (a.count || 0));
      const topList = entries.slice(0, 10);

      if (topList.length === 0) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('No Salutes Yet', COLORS.GOLD).setDescription(
              'No combat salutes have been rendered yet!\n\n👉 Use **`/salute give <player>`** to salute a deserving brother or sister-in-arms!'
            ),
          ],
        });
      }

      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const lines = topList.map((item, idx) => {
        const medal = medals[idx] || '🎖️';
        const latest = item.recentReasons?.[0] ? ` — *" ${item.recentReasons[0]} "*` : '';
        return `${medal} **${item.name}** [${item.rank || 'R3'}] — 🫡 **${item.count} Salutes**${latest}`;
      });

      const embed = createBaseEmbed('🫡 [HOT] Most Respected Warriors Honor Roll', COLORS.GOLD)
        .setDescription(
          '**Kingdom #1391 • House of Titans [HOT]**\n' +
          'All-time most commended fighters awarded by fellow alliance comrades.'
        )
        .addFields({
          name: '🏆 Top Saluted Titans',
          value: lines.join('\n'),
          inline: false,
        });

      return await interaction.editReply({ embeds: [embed] });
    }

    // 2. GIVE SALUTE SUBCOMMAND
    const callerMember = await requireLinkedMember(interaction, 'salute');
    if (!callerMember) return;

    const playerQuery = interaction.options.getString('player');
    const reason = interaction.options.getString('reason') || 'Exemplary valor and alliance dedication!';

    const targetMember = await crmApi.searchMember(playerQuery);
    if (!targetMember) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Player Not Found', COLORS.CRIMSON).setDescription(
            `Could not find warrior **"${playerQuery}"** in the roster.`
          ),
        ],
      });
    }

    // Check self-salute
    if (callerMember.id === targetMember.id) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Self-Salute Prohibited', COLORS.GOLD).setDescription(
            '🛡️ *A true Titan does not salute themselves! Let your comrades sing your praises in battle.*'
          ),
        ],
      });
    }

    // Cooldown check (1 salute every 8 hours)
    const cooldowns = await crmApi.getSetting('bot_salute_cooldowns', {});
    const lastSaluteTime = cooldowns[interaction.user.id] || 0;
    const cooldownMs = 8 * 60 * 60 * 1000;
    const now = Date.now();

    if (now - lastSaluteTime < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - (now - lastSaluteTime)) / 60000);
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Salute Fatigue', COLORS.GOLD).setDescription(
            `You have already rendered a salute recently!\n\n⏳ Please wait another **${waitMinutes} minutes** before saluting again.`
          ),
        ],
      });
    }

    // Record salute
    const targetRecord = salutesData[targetMember.id] || {
      id: targetMember.id,
      name: targetMember.name,
      rank: targetMember.rank,
      count: 0,
      recentReasons: [],
    };

    targetRecord.name = targetMember.name;
    targetRecord.rank = targetMember.rank;
    targetRecord.count = (targetRecord.count || 0) + 1;
    targetRecord.recentReasons = [reason, ...(targetRecord.recentReasons || [])].slice(0, 3);
    salutesData[targetMember.id] = targetRecord;

    cooldowns[interaction.user.id] = now;

    await Promise.all([
      crmApi.setSetting('bot_salutes', salutesData),
      crmApi.setSetting('bot_salute_cooldowns', cooldowns),
    ]);

    const callerName = callerLinked ? callerLinked.name : (interaction.member?.displayName || interaction.user.username);

    const embed = createBaseEmbed('🫡 [HOT] Combat Salute Rendered!', COLORS.GOLD)
      .setDescription(
        `**${callerName}** has officially rendered a combat salute to **${targetMember.name}**!\n\n` +
        `*"${reason}"*`
      )
      .addFields(
        {
          name: '👤 Honored Comrade',
          value: `**${targetMember.name}** (${formatRank(targetMember.rank)})\nPlayer ID: \`${targetMember.gameId || 'N/A'}\``,
          inline: true,
        },
        {
          name: '🎖️ Total Commendations',
          value: `**${targetRecord.count} Salutes Received**`,
          inline: true,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • House of Titans • Honor • Respect • Victory',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /salute error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to process salute: \`${err.message}\``
        ),
      ],
    });
  }
}
