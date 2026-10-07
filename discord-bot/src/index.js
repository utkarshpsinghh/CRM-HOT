import {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { config, validateConfig } from './config.js';
import { crmApi } from './services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from './utils/embedBuilder.js';
import { createUnlinkedEmbed, createLinkButton } from './utils/authCheck.js';

import * as startCmd from './commands/start.js';
import * as profileCmd from './commands/profile.js';
import * as linkCmd from './commands/link.js';
import * as unlinkCmd from './commands/unlink.js';
import * as meCmd from './commands/me.js';
import * as leaderboardCmd from './commands/leaderboard.js';
import * as attendanceCmd from './commands/attendance.js';
import * as eventsCmd from './commands/events.js';
import * as beartrapCmd from './commands/beartrap.js';
import * as strikeCmd from './commands/strike.js';
import * as compareCmd from './commands/compare.js';
import * as rosterCmd from './commands/roster.js';
import * as mvpCmd from './commands/mvp.js';
import * as inactivesCmd from './commands/inactives.js';
import * as helpCmd from './commands/help.js';
import * as rollcallCmd from './commands/rollcall.js';
import * as checkinCmd from './commands/checkin.js';
import * as streaksCmd from './commands/streaks.js';
import * as saluteCmd from './commands/salute.js';
import * as duelCmd from './commands/duel.js';
import * as triviaCmd from './commands/trivia.js';

validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Map commands
client.commands = new Collection();
const commandModules = [
  startCmd,
  profileCmd,
  linkCmd,
  unlinkCmd,
  meCmd,
  leaderboardCmd,
  attendanceCmd,
  eventsCmd,
  beartrapCmd,
  strikeCmd,
  compareCmd,
  rosterCmd,
  mvpCmd,
  inactivesCmd,
  helpCmd,
  rollcallCmd,
  checkinCmd,
  streaksCmd,
  saluteCmd,
  duelCmd,
  triviaCmd,
];

commandModules.forEach(mod => {
  if (mod.data?.name) {
    client.commands.set(mod.data.name, mod);
  }
});

// Client ready event
client.once('ready', () => {
  console.log(`=======================================================`);
  console.log(`🤖 HOT Alliance Bot is ONLINE!`);
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`Connected to CRM: ${config.crmBaseUrl}`);
  console.log(`Registered Commands (${client.commands.size}): ${Array.from(client.commands.keys()).join(', ')}`);
  console.log(`=======================================================`);

  client.user.setPresence({
    activities: [
      {
        name: 'Kingdom #1391 [HOT] Roster • /start',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
});

// Interaction handling
client.on('interactionCreate', async interaction => {
  // 1. BUTTON INTERACTIONS (e.g. "Link In-Game Account" Modal Trigger)
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_open_link_modal') {
      const modal = new ModalBuilder()
        .setCustomId('modal_link_account')
        .setTitle('Link Kingdom #1391 In-Game ID')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_player_query')
              .setLabel('In-Game Name or Player ID (e.g. 205063171)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Enter your exact in-game name or numeric Player ID')
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(50)
          )
        );

      await interaction.showModal(modal);
      return;
    }
  }

  // 2. MODAL SUBMISSION (Handling instant in-game account link)
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_link_account') {
      await interaction.deferReply({ ephemeral: true });

      const query = interaction.fields.getTextInputValue('input_player_query');
      const member = await crmApi.searchMember(query);

      if (!member) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Player Not Found', COLORS.CRIMSON).setDescription(
              `Could not find any member matching **"${query}"** in the [HOT] roster.\n\n` +
              `*Tip: Please check spelling or use your exact numeric in-game Player ID (e.g. \`205063171\`).*`
            ),
          ],
        });
      }

      const success = await crmApi.linkDiscordUser(interaction.user.id, member);
      if (!success) {
        return await interaction.editReply({
          embeds: [
            createBaseEmbed('Linking Failed', COLORS.CRIMSON).setDescription(
              'Unable to store your account link right now. Please try again later.'
            ),
          ],
        });
      }

      const embed = createBaseEmbed('🎉 Account Successfully Linked!', COLORS.EMERALD)
        .setDescription(
          `Hail **${member.name}**! Your Discord identity <@${interaction.user.id}> is now securely bound to your in-game profile.`
        )
        .addFields(
          { name: '👤 In-Game Name', value: member.name, inline: true },
          { name: '🆔 Player ID', value: `\`${member.gameId || 'Not Linked'}\``, inline: true },
          { name: '🛡️ Alliance Rank', value: formatRank(member.rank), inline: true },
          {
            name: '🚀 What to do next?',
            value: [
              '• Type **/me** to view your personal combat dossier',
              '• Type **/checkin** to start your daily war room battle streak',
              '• Type **/beartrap** to view live countdown to the next trap',
              '• Type **/duel <opponent>** to challenge an alliance comrade',
              '• Type **/help** to browse all 20 alliance commands',
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({ text: 'Kingdom #1391 • House of Titans • Welcome to the Ranks!' });

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }

  // 3. CHAT INPUT COMMANDS
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[WARN] Unknown command requested: ${interaction.commandName}`);
    return;
  }

  // GLOBAL IDENTITY VERIFICATION GATE:
  // If the user is unlinked, they can ONLY run /start, /link, or /help.
  // All other commands are intercepted and blocked until they link their in-game account.
  const unlinkedAllowed = ['start', 'link', 'help'];
  if (!unlinkedAllowed.includes(interaction.commandName)) {
    const linkedMember = await crmApi.getLinkedMember(interaction.user.id);
    if (!linkedMember) {
      return await interaction.reply({
        embeds: [createUnlinkedEmbed(interaction.commandName)],
        components: [createLinkButton()],
        ephemeral: true,
      });
    }
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[COMMAND ERROR] /${interaction.commandName}:`, error);

    const errorMessage = {
      content: '⚠️ An unexpected error occurred while processing this command.',
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorMessage).catch(() => {});
    } else {
      await interaction.reply(errorMessage).catch(() => {});
    }
  }
});

// Connect to Discord
client.login(config.discordToken).catch(err => {
  console.error('[LOGIN ERROR] Failed to connect to Discord:', err.message);
  console.error('Make sure DISCORD_TOKEN is properly set in discord-bot/.env');
});
