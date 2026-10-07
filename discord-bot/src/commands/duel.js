import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS, renderProgressBar } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('duel')
  .setDescription('Challenge an alliance comrade to a simulated Whiteout Survival combat duel!')
  .addStringOption(opt =>
    opt
      .setName('opponent')
      .setDescription('Opponent player Name or Player ID')
      .setRequired(true)
  );

export async function execute(interaction) {
  const opponentQuery = interaction.options.getString('opponent');
  await interaction.deferReply();

  try {
    const p2Member = await crmApi.searchMember(opponentQuery);
    if (!p2Member) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Opponent Not Found', COLORS.CRIMSON).setDescription(
            `Could not find warrior **"${opponentQuery}"** in the roster.`
          ),
        ],
      });
    }

    const callerLinked = await crmApi.getLinkedMember(interaction.user.id).catch(() => null);
    const p1Name = callerLinked ? callerLinked.name : (interaction.member?.displayName || interaction.user.username);
    const p2Name = p2Member.name;

    if (callerLinked && callerLinked.id === p2Member.id) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('Self-Harm Prohibited', COLORS.GOLD).setDescription(
            '🛡️ *You cannot challenge yourself to a duel, warrior! Pick an opponent from the alliance roster.*'
          ),
        ],
      });
    }

    // Duel mechanics: 3 rounds
    let hp1 = 100;
    let hp2 = 100;

    const roundMoves = [
      [
        `🏹 **${p1Name}** fires an incendiary volley dealing **{dmg1} DMG**!`,
        `🛡️ **${p2Name}** forms a shield wall and counters with a cavalry charge for **{dmg2} DMG**!`,
      ],
      [
        `💥 **${p2Name}** triggers *Hero Lethality Surge*, landing a crushing blow for **{dmg2} DMG**!`,
        `⚡ **${p1Name}** dodges into the flank, executing *Bear Trap Barrage* for **{dmg1} DMG**!`,
      ],
      [
        `🔥 **${p1Name}** unleashes their ultimate March rally for **{dmg1} DMG**!`,
        `⚔️ **${p2Name}** fights with reckless abandon, dealing a devastating **{dmg2} DMG**!`,
      ],
    ];

    const battleLog = [];

    for (let r = 0; r < 3; r++) {
      const dmg1 = Math.floor(Math.random() * 22) + 12; // 12-33
      const dmg2 = Math.floor(Math.random() * 22) + 12;

      hp2 = Math.max(0, hp2 - dmg1);
      hp1 = Math.max(0, hp1 - dmg2);

      const moveP1 = roundMoves[r][0].replace('{dmg1}', dmg1);
      const moveP2 = roundMoves[r][1].replace('{dmg2}', dmg2);

      battleLog.push(`**Round ${r + 1}:**\n• ${moveP1}\n• ${moveP2}`);
    }

    let winner = '';
    let winnerDesc = '';
    if (hp1 > hp2) {
      winner = p1Name;
      winnerDesc = `🏆 **VICTORY FOR ${p1Name}!** Overwhelmed ${p2Name} with superior tactical lethality!`;
    } else if (hp2 > hp1) {
      winner = p2Name;
      winnerDesc = `🏆 **VICTORY FOR ${p2Name}!** Crushed ${p1Name} with unbreakable defense and counter-strikes!`;
    } else {
      winner = 'Deadlock Draw';
      winnerDesc = `⚖️ **DOUBLE KNOCKOUT!** Both titans fought to a standstill!`;
    }

    const embed = createBaseEmbed(`⚔️ Alliance Duel: ${p1Name} vs ${p2Name}`, COLORS.GOLD)
      .setDescription(
        `**Kingdom #1391 War Room Arena**\n` +
        `Two warriors enter the proving grounds to test their might!\n\n` +
        `${winnerDesc}`
      )
      .addFields(
        {
          name: `🛡️ ${p1Name}`,
          value: `Health: ${renderProgressBar(hp1, 8)} (${hp1} HP remaining)`,
          inline: true,
        },
        {
          name: `⚔️ ${p2Name}`,
          value: `Health: ${renderProgressBar(hp2, 8)} (${hp2} HP remaining)`,
          inline: true,
        },
        {
          name: '📜 Battle Log',
          value: battleLog.join('\n\n'),
          inline: false,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • Arena of Titans • Friendly Duel',
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Execute /duel error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to process duel: \`${err.message}\``
        ),
      ],
    });
  }
}
