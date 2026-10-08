import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('roster')
  .setDescription('Alliance census summary, full 80-member directory, and rank divisions')
  .addStringOption(opt =>
    opt
      .setName('rank')
      .setDescription('Select view: Census summary, full 80-member list, or specific rank')
      .setRequired(false)
      .addChoices(
        { name: '📊 Census & Leadership (Summary)', value: 'CENSUS' },
        { name: '📜 Full Roster (All 80 Members)', value: 'ALL' },
        { name: '👑 R5 (Alliance Leader)', value: 'R5' },
        { name: '🛡️ R4 (Alliance Officers - 9)', value: 'R4' },
        { name: '⚔️ R3 (Elite Division - 62)', value: 'R3' },
        { name: '🏹 R2 (Warrior Division - 6)', value: 'R2' },
        { name: '🗡️ R1 (Soldiers - 2)', value: 'R1' }
      )
  );

export async function execute(interaction) {
  const rankFilter = interaction.options?.getString?.('rank') || 'CENSUS';
  await interaction.deferReply();

  try {
    const res = await crmApi.getAllMembers();
    const members = res.data || [];

    // Sort: R5 -> R4 -> R3 -> R2 -> R1, then alphabetical by name
    const rankPriority = { R5: 1, R4: 2, R3: 3, R2: 4, R1: 5 };
    members.sort((a, b) => {
      const pA = rankPriority[(a.rank || '').toUpperCase()] || 9;
      const pB = rankPriority[(b.rank || '').toUpperCase()] || 9;
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });

    const r5s = members.filter(m => (m.rank || '').toUpperCase() === 'R5');
    const r4s = members.filter(m => (m.rank || '').toUpperCase() === 'R4');
    const r3s = members.filter(m => (m.rank || '').toUpperCase() === 'R3');
    const r2s = members.filter(m => (m.rank || '').toUpperCase() === 'R2');
    const r1s = members.filter(m => (m.rank || '').toUpperCase() === 'R1');

    // 1. CENSUS SUMMARY (Default)
    if (rankFilter === 'CENSUS') {
      const embed = createBaseEmbed('🏰 [HOT] Alliance Census & Hierarchy', COLORS.GOLD)
        .setDescription(
          `**Kingdom #1391 • House of Titans [HOT]**\n` +
          `Active Alliance Roster: **${members.length} Members**`
        )
        .addFields(
          {
            name: '📊 Rank Distribution',
            value: [
              `• 👑 **R5 (Leader):** **${r5s.length}**`,
              `• 🛡️ **R4 (Officers):** **${r4s.length}**`,
              `• ⚔️ **R3 (Elites):** **${r3s.length}**`,
              `• 🏹 **R2 (Warriors):** **${r2s.length}**`,
              `• 🗡️ **R1 (Soldiers):** **${r1s.length}**`,
            ].join('\n'),
            inline: false,
          },
          {
            name: `👑 Alliance Leadership Team (${r5s.length + r4s.length} Leaders)`,
            value: [
              ...r5s.map(m => `• 👑 **${m.name}** [R5] \`${m.gameId || 'ID: -'}\``),
              ...r4s.map(m => `• 🛡️ **${m.name}** [R4] \`${m.gameId || 'ID: -'}\``),
            ].join('\n') || 'None recorded',
            inline: false,
          }
        )
        .setFooter({
          text: 'Tip: Run "/roster rank:Full Roster" to view all 80 members with Game IDs!',
        });

      return await interaction.editReply({ embeds: [embed] });
    }

    // 2. FULL ROSTER (ALL 80 MEMBERS)
    if (rankFilter === 'ALL') {
      const embed = createBaseEmbed(`🛡️ [HOT] Full Alliance Directory (${members.length} Warriors)`, COLORS.GOLD)
        .setDescription(
          `**Kingdom #1391 • House of Titans [HOT]**\n` +
          `Complete roster directory of all **${members.length}** warriors sorted by rank:`
        );

      const memberLines = members.map((m, idx) => {
        const idText = m.gameId ? ` \`${m.gameId}\`` : '';
        const strikesText = m.strikes > 0 ? ` ⚠️ ${m.strikes}s` : '';
        return `${idx + 1}. **${m.name}** [${m.rank}]${idText}${strikesText}`;
      });

      // Split into 4 chunks of 20
      const chunkSize = 20;
      for (let i = 0; i < memberLines.length; i += chunkSize) {
        const chunk = memberLines.slice(i, i + chunkSize);
        const start = i + 1;
        const end = Math.min(i + chunkSize, memberLines.length);
        embed.addFields({
          name: `Warriors (${start} - ${end})`,
          value: chunk.join('\n'),
          inline: false,
        });
      }

      return await interaction.editReply({ embeds: [embed] });
    }

    // 3. SPECIFIC RANK DIVISION
    const rankMap = {
      R5: { list: r5s, label: '👑 R5 (Leader)' },
      R4: { list: r4s, label: '🛡️ R4 (Officers)' },
      R3: { list: r3s, label: '⚔️ R3 (Elites)' },
      R2: { list: r2s, label: '🏹 R2 (Warriors)' },
      R1: { list: r1s, label: '🗡️ R1 (Soldiers)' },
    };

    const target = rankMap[rankFilter] || { list: [], label: rankFilter };
    const memberLines = target.list.map((m, idx) => {
      const idText = m.gameId ? ` \`${m.gameId}\`` : '';
      const strikesText = m.strikes > 0 ? ` ⚠️ ${m.strikes} strikes` : '';
      return `${idx + 1}. **${m.name}**${idText}${strikesText}`;
    });

    const embed = createBaseEmbed(`🛡️ [HOT] Roster Division: ${target.label}`, COLORS.GOLD)
      .setDescription(
        `Total Warriors in this division: **${target.list.length} Members**`
      );

    const chunkSize = 20;
    for (let i = 0; i < memberLines.length; i += chunkSize) {
      const chunk = memberLines.slice(i, i + chunkSize);
      embed.addFields({
        name: i === 0 ? 'Division Members' : 'Division Members (Continued)',
        value: chunk.join('\n') || 'None recorded',
        inline: false,
      });
    }

    if (memberLines.length === 0) {
      embed.addFields({
        name: 'Division Members',
        value: '*No warriors currently assigned to this rank division.*',
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /roster error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load roster census: \`${err.message}\``
        ),
      ],
    });
  }
}
