import { REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import * as profileCmd from './commands/profile.js';
import * as leaderboardCmd from './commands/leaderboard.js';
import * as eventsCmd from './commands/events.js';
import * as attendanceCmd from './commands/attendance.js';
import * as inactivesCmd from './commands/inactives.js';
import * as helpCmd from './commands/help.js';

validateConfig();

const commands = [
  profileCmd.data.toJSON(),
  leaderboardCmd.data.toJSON(),
  eventsCmd.data.toJSON(),
  attendanceCmd.data.toJSON(),
  inactivesCmd.data.toJSON(),
  helpCmd.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function deploy() {
  try {
    console.log(`[DEPLOY] Started refreshing ${commands.length} application (/) commands...`);

    if (config.guildId) {
      // Fast guild registration (instant update for testing in your specific server)
      console.log(`[DEPLOY] Registering commands to Guild: ${config.guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`[DEPLOY] Successfully registered commands to Guild: ${config.guildId}`);
    } else {
      // Global registration across all servers
      console.log(`[DEPLOY] Registering commands globally...`);
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`[DEPLOY] Successfully registered commands globally!`);
    }
  } catch (error) {
    console.error('[DEPLOY ERROR] Failed to deploy commands:', error);
  }
}

deploy();
