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
    q: 'In Whiteout Survival, what troop type counters Lancers?',
    options: ['Infantry', 'Marksmen', 'Shield Guards', 'Catapults'],
    correct: 0,
    fact: 'Infantry deals bonus damage and defends effectively against Lancers, while Lancers counter Marksmen!',
  },
  {
    q: 'How often does Bear Trap activate in Kingdom #1391 [HOT]?',
    options: ['Every 24 hours', 'Every 48 hours', 'Every 72 hours', 'Once a week'],
    correct: 1,
    fact: 'Bear Trap operates on a strict 48-hour cycle with dual slots (16:00 UTC and 00:30 UTC)!',
  },
  {
    q: 'What hero stat provides the highest boost to alliance rally damage in Bear Trap?',
    options: ['Troop Defense', 'Lethality', 'Gathering Speed', 'Healing Speed'],
    correct: 1,
    fact: 'Lethality directly amplifies damage per hit against the Bear Trap boss monster!',
  },
  {
    q: 'What is the main advantage of the BT2 slot (00:30 UTC) in Kingdom #1391?',
    options: ['More rewards', 'Accommodates Americas / night primetime', 'Boss has less health', 'Fewer traps'],
    correct: 1,
    fact: 'Dual slots ensure global coverage across EU, Asia (BT1), and the Americas (BT2)!',
  },
  {
    q: 'What troop formation should rally joiners prioritize sending to maximize Bear Trap damage?',
    options: ['100% Infantry', '100% Marksmen / Highest Damage DPS', 'Mixed Equal Ratios', 'Gathering wagons'],
    correct: 1,
    fact: 'Marksmen have the highest damage output in Bear Trap since the bear does not counterattack troops!',
  },
  {
    q: 'What is the maximum number of disciplinary strikes before a member faces leadership dismissal review?',
    options: ['1 Strike', '2 Strikes', '3 Strikes', '5 Strikes'],
    correct: 2,
    fact: 'Under [HOT] Alliance rules, reaching 3/3 strikes triggers a leadership review for demotion or dismissal.',
  },
  {
    q: 'In SvS Sunfire Castle battle, how many turrets surround the central castle?',
    options: ['2 Turrets', '3 Turrets', '4 Turrets', '6 Turrets'],
    correct: 2,
    fact: 'Sunfire Castle is fortified by 4 surrounding turrets which bombard occupying enemy forces.',
  },
  {
    q: 'Which hero type is best suited as a primary rally leader in rally attacks?',
    options: ['Growth / Economy Hero', 'Command / Attack Hero with high rally capacity', 'Gathering Hero', 'Garrison Defense Hero'],
    correct: 1,
    fact: 'Attack heroes with maximum rally capacity and lethality boosts lead the largest and hardest-hitting rallies!',
  },
];

export const data = new SlashCommandBuilder()
  .setName('trivia')
  .setDescription('Alliance War Room trivia — test your game mechanics and kingdom lore!')
  .addSubcommand(sub =>
    sub.setName('play').setDescription('Start a rapid-fire trivia question with clickable buttons')
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
            'No players have earned trivia points yet!\n\n👉 Type **`/trivia play`** to test your knowledge!'
          ),
        ],
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const lines = topList.map((u, i) => `${medals[i] || '🎖️'} **${u.name}** — **${u.points} Titan Points**`);

    const embed = createBaseEmbed('🧠 [HOT] War Room Trivia Champions', COLORS.GOLD)
      .setDescription('Alliance scholars with the sharpest strategic knowledge!')
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

    return createBaseEmbed('🧠 [HOT] War Room Trivia Challenge', winner ? COLORS.EMERALD : timedOut ? COLORS.CRIMSON : COLORS.GOLD)
      .setDescription(desc)
      .setFooter({ text: 'Kingdom #1391 • Arena of Knowledge' });
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
