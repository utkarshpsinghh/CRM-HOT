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
import * as voteCmd from './commands/vote.js';
import * as strikeCmd from './commands/strike.js';
import * as compareCmd from './commands/compare.js';
import * as mvpCmd from './commands/mvp.js';
import * as inactivesCmd from './commands/inactives.js';
import * as helpCmd from './commands/help.js';
import * as rankCmd from './commands/rank.js';
import * as myrankCmd from './commands/myrank.js';

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
  voteCmd.data.toJSON(),
  strikeCmd.data.toJSON(),
  compareCmd.data.toJSON(),
  mvpCmd.data.toJSON(),
  inactivesCmd.data.toJSON(),
  helpCmd.data.toJSON(),
  rankCmd.data.toJSON(),
  myrankCmd.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function deploy() {
  try {
    console.log(`[DEPLOY] Started refreshing ${commands.length} application (/) commands...`);

    if (config.guildIds && config.guildIds.length > 0) {
      for (const gId of config.guildIds) {
        console.log(`[DEPLOY] Registering commands to Guild: ${gId}`);
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, gId),
          { body: commands }
        );
        console.log(`[DEPLOY] Successfully registered ${commands.length} commands to Guild: ${gId}`);
      }
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
