import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List all available Kingdom #1391 [HOT] CRM bot commands');

export async function execute(interaction) {
  const embed = createBaseEmbed('🛡️ [HOT] Alliance Bot — Command Guide', COLORS.GOLD)
    .setDescription(
      'Welcome to the official **Kingdom #1391 [HOT] Alliance Bot**!\n\n' +
      'Here are the commands you can use:'
    )
    .addFields(
      {
        name: '👤 Player Dossier',
        value:
          '`/profile <player>` — Look up any alliance member using their **Player Name** or **Player ID**.\n' +
          'Displays in-game rank, active strikes, status, attendance percentage, and last 5 battles.',
        inline: false,
      },
      {
        name: '🏆 Leaderboard',
        value:
          '`/leaderboard [limit] [sort_by]` — View top warriors ranked by attendance rate or total battles joined.\n' +
          'Default shows top 10 members with medal standings.',
        inline: false,
      },
      {
        name: '📋 Attendance Ledger',
        value:
          '`/attendance <player>` — Detailed battle history showing which slots the player voted for and attended.',
        inline: false,
      },
      {
        name: '⚔️ Battle Events & Bear Traps',
        value:
          '`/events [status]` — View scheduled Bear Traps, Swordsland, and Tri Alliance battles along with slot times (BT1/BT2).',
        inline: false,
      },
      {
        name: '⚠️ Inactives & Discipline',
        value:
          '`/inactives [filter]` — Check list of inactive players or members with active strikes.',
        inline: false,
      }
    );

  await interaction.reply({ embeds: [embed] });
}
