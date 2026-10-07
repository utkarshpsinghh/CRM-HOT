import { REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
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

const commands = [
  startCmd.data.toJSON(),
  profileCmd.data.toJSON(),
  linkCmd.data.toJSON(),
  unlinkCmd.data.toJSON(),
  meCmd.data.toJSON(),
  leaderboardCmd.data.toJSON(),
  attendanceCmd.data.toJSON(),
  eventsCmd.data.toJSON(),
  beartrapCmd.data.toJSON(),
  strikeCmd.data.toJSON(),
  compareCmd.data.toJSON(),
  rosterCmd.data.toJSON(),
  mvpCmd.data.toJSON(),
  inactivesCmd.data.toJSON(),
  helpCmd.data.toJSON(),
  rollcallCmd.data.toJSON(),
  checkinCmd.data.toJSON(),
  streaksCmd.data.toJSON(),
  saluteCmd.data.toJSON(),
  duelCmd.data.toJSON(),
  triviaCmd.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function deploy() {
  try {
    console.log(`[DEPLOY] Started refreshing ${commands.length} application (/) commands...`);

    if (config.guildId) {
      console.log(`[DEPLOY] Registering commands to Guild: ${config.guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`[DEPLOY] Successfully registered ${commands.length} commands to Guild: ${config.guildId}`);
    } else {
      console.log(`[DEPLOY] Registering commands globally...`);
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`[DEPLOY] Successfully registered ${commands.length} commands globally!`);
    }
  } catch (error) {
    console.error('[DEPLOY ERROR] Failed to deploy commands:', error);
  }
}

deploy();
