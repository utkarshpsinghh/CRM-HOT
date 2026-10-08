import {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  REST,
  Routes,
} from 'discord.js';
import { config, validateConfig } from './config.js';
import { crmApi } from './services/crmApi.js';
import { createBaseEmbed, COLORS, formatRank } from './utils/embedBuilder.js';
import { createUnlinkedEmbed, createLinkButton } from './utils/authCheck.js';
import { startBearTrapVoteMonitor } from './services/voteMonitor.js';

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

// Global error handlers to prevent unexpected process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

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
  voteCmd,
  strikeCmd,
  compareCmd,
  mvpCmd,
  inactivesCmd,
  helpCmd,
  rankCmd,
  myrankCmd,
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
        name: 'Kingdom #1391 • [HOT] OneForAll • /help',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });

  // Start automated CRM Bear Trap vote monitor
  startBearTrapVoteMonitor(client);
});

// Auto-register slash commands when bot joins any new guild
client.on('guildCreate', async (guild) => {
  console.log(`[GUILD JOIN] Joined new server: ${guild.name} (${guild.id})`);
  try {
    const rest = new REST({ version: '10' }).setToken(config.discordToken);
    const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, guild.id),
      { body: commandsData }
    );
    console.log(`[GUILD JOIN] Registered ${commandsData.length} commands to ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error(`[GUILD JOIN ERROR] Failed to deploy commands to ${guild.name}:`, err.message);
  }
});

/**
 * Verifies if an interaction is executed in an authorized channel:
 * - bot-commands (or boy-commands)
 * - council-chat (or council)
 * - events (or bear-hunt / voting)
 */
function isChannelAllowed(channel, guild) {
  if (!guild) return true;
  if (!channel || !channel.name) return true;

  let target = channel;
  if (typeof channel.isThread === 'function' && channel.isThread() && channel.parent) {
    target = channel.parent;
  }

  const cleanName = (target.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

  const isBotCommands =
    cleanName.includes('bot-command') ||
    cleanName.includes('boy-command') ||
    cleanName.includes('botcommand') ||
    cleanName.includes('commands');
  const isCouncil = cleanName.includes('council');
  const isEvents =
    cleanName.includes('event') ||
    cleanName.includes('bear-hunt') ||
    cleanName.includes('beartrap') ||
    cleanName.includes('voting');

  if (isBotCommands || isCouncil || isEvents) {
    return true;
  }

  // Fallback: If guild does not have any of these channels configured, allow
  const hasDesignatedChannels = guild.channels.cache.some(c => {
    if (!c.isTextBased()) return false;
    const cClean = c.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return (
      cClean.includes('bot-command') ||
      cClean.includes('boy-command') ||
      cClean.includes('commands') ||
      cClean.includes('council') ||
      cClean.includes('event') ||
      cClean.includes('bear-hunt')
    );
  });

  if (!hasDesignatedChannels) {
    return true;
  }

  return false;
}

function getAllowedChannelsMention(guild) {
  if (!guild) return 'designated bot channels';
  const matches = guild.channels.cache.filter(c => {
    if (!c.isTextBased()) return false;
    const clean = c.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return (
      clean.includes('bot-command') ||
      clean.includes('boy-command') ||
      clean.includes('commands') ||
      clean.includes('council') ||
      clean.includes('event') ||
      clean.includes('bear-hunt')
    );
  });

  if (matches.size > 0) {
    return matches.map(c => `<#${c.id}>`).join(', ');
  }
  return '#bot-commands, #council-chat, or #events';
}

// Interaction handling
client.on('interactionCreate', async interaction => {
  // Channel whitelist enforcement: Only allow in bot-commands, council-chat, and events
  if (interaction.guild && !isChannelAllowed(interaction.channel, interaction.guild)) {
    const allowedText = getAllowedChannelsMention(interaction.guild);
    return await interaction.reply({
      content: `⚠️ The bot can only be used in ${allowedText}.`,
      ephemeral: true,
    });
  }

  // 1. BUTTON INTERACTIONS
  if (interaction.isButton()) {
    // 1A. Link Button Trigger (Direct user to upload screenshot with /link)
    if (interaction.customId === 'btn_open_link_modal') {
      let linkTag = '`/link`';
      try {
        const guildCmds = await interaction.guild?.commands?.fetch();
        const linkCmd = guildCmds?.find(c => c.name === 'link');
        if (linkCmd) {
          linkTag = `</link:${linkCmd.id}>`;
        }
      } catch (err) {
        // Fallback to default tag
      }

      return await interaction.reply({
        content: `Click here to link: ${linkTag}`,
        embeds: [
          createBaseEmbed('Profile Verification', COLORS.GOLD).setDescription(
            `Click **${linkTag}** to verify your account:\n\n` +
            `• Attach your in-game **Governor Profile** screenshot.\n` +
            `• The bot will confirm your name and Player ID.`
          ),
        ],
        ephemeral: true,
      });
    }

    // 1B. War Room Quick-Action Navigation Buttons
    if (interaction.customId === 'btn_action_vote') {
      return await voteCmd.execute(interaction);
    }
    if (interaction.customId === 'btn_action_beartrap') {
      return await beartrapCmd.execute(interaction);
    }
    if (interaction.customId === 'btn_action_me') {
      return await meCmd.execute(interaction);
    }
    if (interaction.customId === 'btn_action_rank') {
      return await rankCmd.execute(interaction);
    }

    // 1C. Automated Broadcast Vote Buttons (vote_bt1_<eventId> and vote_bt2_<eventId>)
    if (interaction.customId.startsWith('vote_bt1_') || interaction.customId.startsWith('vote_bt2_')) {
      await interaction.deferReply({ ephemeral: true });

      const isBt1 = interaction.customId.startsWith('vote_bt1_');
      const eventId = interaction.customId.replace('vote_bt1_', '').replace('vote_bt2_', '');

      // Check if user is linked
      const linked = await crmApi.getLinkedMember(interaction.user.id);
      if (!linked) {
        return await interaction.editReply({
          content: 'You must link your in-game account first using `/link` before you can vote.',
        });
      }

      const eventsRes = await crmApi.getEvents();
      const targetEvent = eventsRes.data.find(e => e.id === eventId);
      const eventSlots = targetEvent?.slots || [];
      const targetSlot = isBt1
        ? eventSlots.find(s => s.slotName === 'BT1' || s.slotNumber === 1)
        : eventSlots.find(s => s.slotName === 'BT2' || s.slotNumber === 2);

      if (!targetSlot) {
        return await interaction.editReply({
          content: 'Battle slot is not available or event not found.',
        });
      }

      // Check if slot has already completed
      if (targetSlot.startTime) {
        const slotDate = new Date(targetSlot.startTime);
        if (!isNaN(slotDate.getTime()) && slotDate.getTime() <= Date.now()) {
          return await interaction.editReply({
            content: `**${targetSlot.slotName}** has ended. No more entries allowed for this slot.`,
          });
        }
      }

      const result = await crmApi.castVote(linked.id, eventId, targetSlot.id);
      if (!result.success) {
        return await interaction.editReply({
          content: `Failed to record vote: ${result.message}`,
        });
      }

      const slotLabel = isBt1 ? 'BT1 (16:00 UTC)' : 'BT2 (00:30 UTC)';
      return await interaction.editReply({
        content: `Vote confirmed: **${linked.name}** is registered for **${slotLabel}**.`,
      });
    }
  }

  // 2. MODAL SUBMISSION
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_link_account') {
      return await interaction.reply({
        embeds: [
          createBaseEmbed('Profile Verification', COLORS.GOLD).setDescription(
            'Please run **/link** and attach your in-game Governor Profile screenshot to verify your account.'
          ),
        ],
        ephemeral: true,
      });
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
