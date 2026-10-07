import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';
import { createLinkButton } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List all available Kingdom #1391 [HOT] Alliance bot commands');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const linkedMember = await crmApi.getLinkedMember(interaction.user.id);

    const embed = createBaseEmbed('🛡️ [HOT] Alliance Bot — Command Directory', COLORS.GOLD);

    if (linkedMember) {
      embed.setDescription(
        `Welcome back, **${linkedMember.name}** [${linkedMember.rank}]!\n` +
        `Here is your full access command console for **Kingdom #1391 [HOT]**:`
      );
    } else {
      embed.setDescription(
        `Welcome to the official **Kingdom #1391 House of Titans [HOT] Bot**!\n\n` +
        `⚠️ **Step 1: Link Your Account**\n` +
        `You have not linked your Discord identity yet. Click the button below to link and unlock personal combat features!`
      );
    }

    embed.addFields(
      {
        name: '👤 Identity & Personal Dossier',
        value: [
          '• `/start` — Interactive onboarding portal & quick action console.',
          '• `/link <player>` — Link your Discord account to your in-game Name or Player ID.',
          '• `/unlink [user]` — Disconnect your linked in-game identity (or an officer unlinks a member).',
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
    );

    embed.setFooter({
      text: 'Kingdom #1391 • House of Titans • Powered by HOT Alliance Command',
    });

    const replyOptions = { embeds: [embed] };
    if (!linkedMember) {
      replyOptions.components = [createLinkButton()];
    }

    await interaction.editReply(replyOptions);
  } catch (err) {
    console.error('Execute /help error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load command directory: \`${err.message}\``
        ),
      ],
    });
  }
}
