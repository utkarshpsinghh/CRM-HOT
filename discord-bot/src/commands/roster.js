import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('roster')
  .setDescription('Alliance census summary and rank division member lists')
  .addStringOption(opt =>
    opt
      .setName('rank')
      .setDescription('Filter by specific rank division')
      .setRequired(false)
      .addChoices(
        { name: 'All Ranks (Alliance Census)', value: 'ALL' },
        { name: 'R5 (Alliance Leader)', value: 'R5' },
        { name: 'R4 (Alliance Officers)', value: 'R4' },
        { name: 'R3 (Elite Division)', value: 'R3' },
        { name: 'R2 (Warrior Division)', value: 'R2' },
        { name: 'R1 (Soldiers)', value: 'R1' }
      )
  );

export async function execute(interaction) {
  const rankFilter = interaction.options.getString('rank') || 'ALL';
  await interaction.deferReply();

  try {
    const res = await crmApi.getAllMembers('Active');
    const members = res.data || [];

    const r5s = members.filter(m => (m.rank || '').toUpperCase() === 'R5');
    const r4s = members.filter(m => (m.rank || '').toUpperCase() === 'R4');
    const r3s = members.filter(m => (m.rank || '').toUpperCase() === 'R3');
    const r2s = members.filter(m => (m.rank || '').toUpperCase() === 'R2');
    const r1s = members.filter(m => (m.rank || '').toUpperCase() === 'R1');

    if (rankFilter === 'ALL') {
      const embed = createBaseEmbed('🏰 [HOT] Alliance Census & Hierarchy', COLORS.GOLD)
        .setDescription(
          `**Kingdom #1391 • House of Titans [HOT]**\n` +
          `Active Combat Roster: **${members.length} Members**`
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
            name: '👑 Alliance Leadership Team (R5 & R4)',
            value: [
              ...r5s.map(m => `• 👑 **${m.name}** [R5] \`${m.gameId || 'ID: -'}\``),
              ...r4s.map(m => `• 🛡️ **${m.name}** [R4] \`${m.gameId || 'ID: -'}\``),
            ].slice(0, 15).join('\n') || 'None recorded',
            inline: false,
          }
        )
        .setFooter({
          text: 'Use /roster [rank] to view members within a specific rank division.',
        });

      return await interaction.editReply({ embeds: [embed] });
    }

    // Specific rank division requested
    const rankMap = {
      R5: { list: r5s, label: '👑 R5 (Leader)' },
      R4: { list: r4s, label: '🛡️ R4 (Officers)' },
      R3: { list: r3s, label: '⚔️ R3 (Elites)' },
      R2: { list: r2s, label: '🏹 R2 (Warriors)' },
      R1: { list: r1s, label: '🗡️ R1 (Soldiers)' },
    };

    const target = rankMap[rankFilter] || { list: [], label: rankFilter };
    const memberLines = target.list.map(m => {
      const strikesText = m.strikes > 0 ? ` ⚠️ ${m.strikes}s` : '';
      return `• **${m.name}** \`${m.gameId || 'ID: -'}\`${strikesText}`;
    });

    const embed = createBaseEmbed(`🛡️ [HOT] Roster: ${target.label}`, COLORS.GOLD)
      .setDescription(
        `Total Members in this rank: **${target.list.length}**`
      );

    // Split into chunks of 20 members to avoid Discord 1024 char field limits
    const chunkSize = 20;
    for (let i = 0; i < memberLines.length; i += chunkSize) {
      const chunk = memberLines.slice(i, i + chunkSize);
      embed.addFields({
        name: i === 0 ? 'Warriors' : 'Warriors (Continued)',
        value: chunk.join('\n') || 'None recorded',
        inline: false,
      });
    }

    if (memberLines.length === 0) {
      embed.addFields({
        name: 'Warriors',
        value: '*No members currently assigned to this rank division.*',
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
