import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

const TRIVIA_QUESTIONS = [
  {
    q: 'In Kingshot combat, which troop type serves as the frontline shield absorbing enemy damage?',
    options: ['Infantry', 'Archers / Marksmen', 'Cavalry', 'Catapults'],
    correct: 0,
    fact: 'Infantry acts as the heavy frontline shield absorbing incoming damage while protecting backline DPS troops!',
  },
  {
    q: 'How often does Bear Trap battle cycle reset in Kingdom #1391 [HOT]?',
    options: ['Every 24 hours', 'Every 48 hours', 'Every 72 hours', 'Once a week'],
    correct: 1,
    fact: 'Bear Trap operates on a strict 48-hour cycle with dual time slots (16:00 UTC and 00:30 UTC)!',
  },
  {
    q: 'In Kingshot, what combat stat provides the highest boost to alliance rally damage against Bear Trap?',
    options: ['Troop Defense', 'Lethality', 'Gathering Speed', 'Healing Speed'],
    correct: 1,
    fact: 'Lethality directly amplifies damage per strike against the Bear Trap boss monster!',
  },
  {
    q: 'What are the two official battle slot times (UTC) for Bear Trap in Kingdom #1391?',
    options: ['12:00 & 18:00 UTC', '16:00 & 00:30 UTC', '08:00 & 20:00 UTC', '14:00 & 02:00 UTC'],
    correct: 1,
    fact: 'Slot 1 (BT1) runs at 16:00 UTC and Slot 2 (BT2) runs at 00:30 UTC to cover all global time zones!',
  },
  {
    q: 'In Kingshot alliance combat, who determines the overall march capacity and speed of an alliance rally?',
    options: ['The highest VIP player', 'The Rally Leader who initiated the rally', 'The last joiner', 'The alliance R5 leader'],
    correct: 1,
    fact: 'The Rally Leader’s hero skills, gear, and rally capacity dictate the entire rally’s stats and maximum capacity!',
  },
  {
    q: 'In Kingshot, what troop formation deals the highest burst damage against Bear Trap boss?',
    options: ['100% Infantry', '100% Archers / Highest DPS Troops', 'Mixed Equal Ratios', 'Gathering wagons'],
    correct: 1,
    fact: 'Archers output maximum single-target DPS in Bear Trap because the boss does not counterattack troops!',
  },
  {
    q: 'What is the maximum number of disciplinary strikes in [HOT] before leadership review for dismissal?',
    options: ['1 Strike', '2 Strikes', '3 Strikes', '5 Strikes'],
    correct: 2,
    fact: 'Under [HOT] Alliance rules, reaching 3/3 strikes triggers an immediate leadership review for demotion or expulsion.',
  },
  {
    q: 'In Kingshot, what item allows an alliance to expand its borders and connect resource shrines?',
    options: ['Alliance Banners / Flags', 'Kingdom Portals', 'Watchtowers', 'Shield Generators'],
    correct: 0,
    fact: 'Alliance Banners expand sovereign territory to claim resource pits and tactical combat shrines!',
  },
  {
    q: 'What primary benefit do rally joiners contribute to an alliance rally in Kingshot?',
    options: ['March speed boost only', 'Troops to fill the leader’s rally capacity cap', 'Resource donations', 'Shield regeneration'],
    correct: 1,
    fact: 'Rally joiners pack the leader’s rally capacity with high-tier troops to maximize destructive impact!',
  },
  {
    q: 'In Kingshot Kingdom vs Kingdom (KvK) war, what happens if your city is attacked unshielded on enemy kingdom soil?',
    options: ['Troops cannot be healed', 'Troops suffer severe casualties and city can be zeroed', 'Only wood is lost', 'Peace shield auto-activates'],
    correct: 1,
    fact: 'Fighting on enemy kingdom soil causes permanent casualties; bubble / peace shield discipline is critical!',
  },
  {
    q: 'In Kingshot, what building upgrade expands the capacity of wounded soldiers you can treat simultaneously?',
    options: ['Hospital', 'Embassy', 'Hall of War', 'Warehouse'],
    correct: 0,
    fact: 'Upgrading the Hospital increases medical capacity so troops do not perish when wounded in battle!',
  },
  {
    q: 'In Kingshot, what teleport type allows precision jumping directly to target coordinates next to the alliance hive?',
    options: ['Random Teleport', 'Advanced / Precision Teleport', 'Territory Recall', 'Kingdom Jump'],
    correct: 1,
    fact: 'Advanced Teleports allow exact coordinate placement anywhere on the kingdom map!',
  },
  {
    q: 'In Kingshot Swordsland War, what is the key objective to earn alliance victory points?',
    options: ['Gathering wood', 'Controlling central strongholds, shrines, and armories', 'Hunting neutral beasts', 'Sending alliance mail'],
    correct: 1,
    fact: 'Occupying tactical strongholds and scoring combat eliminations during the window yields maximum victory points!',
  },
  {
    q: 'In Kingdom #1391 [HOT], what minimum battle attendance per cycle is required from warriors?',
    options: ['At least 1 slot per Bear Trap cycle', 'Both slots mandatory every time', 'Only once per month', 'No attendance needed'],
    correct: 0,
    fact: 'Warriors must attend at least 1 slot (BT1 or BT2) per 48-hour cycle to maintain good standing!',
  },
  {
    q: 'In Kingshot, which core building level dictates unlocking higher troop tiers and maximum building limits?',
    options: ['Stronghold / Castle Center', 'Wall', 'Barracks', 'Embassy'],
    correct: 0,
    fact: 'The Stronghold / Central Castle level dictates maximum troop tier unlocks and overall combat power!',
  },
];

export const data = new SlashCommandBuilder()
  .setName('trivia')
  .setDescription('Kingshot War Room trivia — test your game mechanics and kingdom lore!')
  .addSubcommand(sub =>
    sub.setName('play').setDescription('Start a rapid-fire Kingshot trivia question with clickable buttons')
  )
  .addSubcommand(sub =>
    sub.setName('leaderboard').setDescription('View top Trivia Masters of Kingdom #1391')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  // 1. LEADERBOARD
  if (sub === 'leaderboard') {
    await interaction.deferReply();
    const scores = await crmApi.getSetting('bot_trivia_scores', {});
    const entries = Object.entries(scores).map(([id, data]) => ({ id, ...data }));
    entries.sort((a, b) => (b.points || 0) - (a.points || 0));
    const topList = entries.slice(0, 10);

    if (topList.length === 0) {
      return await interaction.editReply({
        embeds: [
          createBaseEmbed('No Trivia Scores Yet', COLORS.GOLD).setDescription(
            'No players have earned Kingshot trivia points yet!\n\n👉 Type **`/trivia play`** to test your knowledge!'
          ),
        ],
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const lines = topList.map((u, i) => `${medals[i] || '🎖️'} **${u.name}** — **${u.points} Titan Points**`);

    const embed = createBaseEmbed('🧠 [HOT] Kingshot Trivia Champions', COLORS.GOLD)
      .setDescription('Alliance tacticians with the sharpest Kingshot knowledge and battle mastery!')
      .addFields({ name: '🏆 Top Trivia Masters', value: lines.join('\n'), inline: false });

    return await interaction.editReply({ embeds: [embed] });
  }

  // 2. PLAY TRIVIA
  const item = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
  const letters = ['A', 'B', 'C', 'D'];

  const buildEmbed = (winner = null, timedOut = false) => {
    let desc = `**${item.q}**\n\n`;
    item.options.forEach((opt, idx) => {
      desc += `**[${letters[idx]}]** ${opt}\n`;
    });

    if (winner) {
      desc += `\n🎉 **WINNER:** <@${winner.id}> answered correctly first!\n💡 *${item.fact}*`;
    } else if (timedOut) {
      desc += `\n⏰ **Time is up!** Correct answer was **[${letters[item.correct]}] ${item.options[item.correct]}**.\n💡 *${item.fact}*`;
    } else {
      desc += `\n*⚡ First warrior to press the correct button in 30 seconds wins +10 Titan Points!*`;
    }

    return createBaseEmbed('🧠 [HOT] Kingshot Tactical Trivia', winner ? COLORS.EMERALD : timedOut ? COLORS.CRIMSON : COLORS.GOLD)
      .setDescription(desc)
      .setFooter({ text: 'Kingdom #1391 • Kingshot Combat Mastery' });
  };

  const row = new ActionRowBuilder().addComponents(
    item.options.map((_, idx) =>
      new ButtonBuilder()
        .setCustomId(`trivia_${idx}`)
        .setLabel(letters[idx])
        .setStyle(ButtonStyle.Primary)
    )
  );

  const response = await interaction.reply({
    embeds: [buildEmbed()],
    components: [row],
    fetchReply: true,
  });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
  });

  let answered = false;

  collector.on('collect', async btnInteraction => {
    if (answered) return;

    const chosenIdx = parseInt(btnInteraction.customId.replace('trivia_', ''), 10);
    const isCorrect = chosenIdx === item.correct;

    if (!isCorrect) {
      await btnInteraction.reply({
        content: `❌ Incorrect, <@${btnInteraction.user.id}>! Think carefully and try on the next question!`,
        ephemeral: true,
      });
      return;
    }

    // Correct answer!
    answered = true;
    collector.stop('answered');

    const winnerUser = btnInteraction.user;
    const winnerName = btnInteraction.member?.displayName || winnerUser.username;

    // Award +10 points
    const scores = await crmApi.getSetting('bot_trivia_scores', {});
    const userScore = scores[winnerUser.id] || { name: winnerName, points: 0 };
    userScore.name = winnerName;
    userScore.points = (userScore.points || 0) + 10;
    scores[winnerUser.id] = userScore;
    await crmApi.setSetting('bot_trivia_scores', scores);

    // Disable buttons
    const disabledRow = new ActionRowBuilder().addComponents(
      item.options.map((_, idx) =>
        new ButtonBuilder()
          .setCustomId(`trivia_done_${idx}`)
          .setLabel(letters[idx])
          .setStyle(idx === item.correct ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true)
      )
    );

    await btnInteraction.update({
      embeds: [buildEmbed(winnerUser)],
      components: [disabledRow],
    });
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'answered') {
      const disabledRow = new ActionRowBuilder().addComponents(
        item.options.map((_, idx) =>
          new ButtonBuilder()
            .setCustomId(`trivia_done_${idx}`)
            .setLabel(letters[idx])
            .setStyle(idx === item.correct ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );

      await response.edit({
        embeds: [buildEmbed(null, true)],
        components: [disabledRow],
      }).catch(() => {});
    }
  });
}
