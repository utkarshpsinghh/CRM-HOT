import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List all available Kingdom #1391 [HOT] Alliance bot commands');

export async function execute(interaction) {
  const embed = createBaseEmbed('🛡️ [HOT] Alliance Bot — Command Directory', COLORS.GOLD)
    .setDescription(
      'Welcome to the official **Kingdom #1391 House of Titans [HOT] Bot**!\n' +
      'Here are all the slash commands available across the alliance:'
    )
    .addFields(
      {
        name: '👤 Identity & Personal Dossier',
        value: [
          '• `/link <player>` — Link your Discord account to your in-game Name or Player ID.',
          '• `/me` — View your own combat dossier, attendance, and strikes instantly.',
          '• `/profile <player>` — Inspect any alliance member by Name or Player ID.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🏆 Rankings & Competition',
        value: [
          '• `/leaderboard [limit] [sort_by]` — Global alliance leaderboard (attendance rate or battle count).',
          '• `/mvp` — Spotlight the #1 reigning battle MVP and top elite contenders.',
          '• `/compare <player1> <player2>` — Head-to-head combat and attendance showdown.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '⚔️ Battle Coordination & Bear Trap',
        value: [
          '• `/beartrap` — Next battle countdown, dual slot times (`16:00 UTC` / `00:30 UTC`), and turnouts.',
          '• `/rollcall [battle]` — Launch live interactive RSVP roll call buttons for upcoming battles.',
          '• `/events [status]` — Schedule for Bear Traps, Swordsland War, and Tri Alliance battles.',
          '• `/attendance <player>` — Detailed battle ledger showing voted & attended slots.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔥 Community Engagement & War Room Games',
        value: [
          '• `/checkin` — Daily war room roll call to build your consecutive attendance streak.',
          '• `/streaks` — Top 10 longest active streak leaders.',
          '• `/salute give <player>` — Commend a comrade for clutch rallies or great advice.',
          '• `/salute leaderboard` — Most respected warriors honor roll.',
          '• `/duel <opponent>` — Challenge an alliance brother or sister to a combat duel simulator!',
          '• `/trivia play` — Rapid-fire Whiteout Survival & Kingdom trivia with live buttons.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🏰 Alliance Roster & Discipline',
        value: [
          '• `/roster [rank]` — Alliance census summary & division lists (All 80 members, R5, R4, R3, R2, R1).',
          '• `/inactives [filter]` — Spot inactive members or players with warning strikes.',
          '• `/strike <add|remove>` — *(Officers only)* Issue or waive disciplinary strikes.',
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({
      text: 'Kingdom #1391 • House of Titans • Powered by HOT Alliance Command',
    });

  await interaction.reply({ embeds: [embed] });
}
