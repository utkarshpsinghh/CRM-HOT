import { Client, Collection, GatewayIntentBits, ActivityType } from 'discord.js';
import { config, validateConfig } from './config.js';
import * as profileCmd from './commands/profile.js';
import * as linkCmd from './commands/link.js';
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
  profileCmd,
  linkCmd,
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
        name: 'Kingdom #1391 [HOT] Roster • /help',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
});

// Interaction handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[WARN] Unknown command requested: ${interaction.commandName}`);
    return;
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
