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
import * as rosterCmd from './commands/roster.js';
import * as mvpCmd from './commands/mvp.js';
import * as inactivesCmd from './commands/inactives.js';
import * as helpCmd from './commands/help.js';

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
  rosterCmd,
  mvpCmd,
  inactivesCmd,
  helpCmd,
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

  // Start automated CRM Bear Trap vote monitor
  startBearTrapVoteMonitor(client);
});

// Interaction handling
client.on('interactionCreate', async interaction => {
  // 1. BUTTON INTERACTIONS
  if (interaction.isButton()) {
    // 1A. Link Button Trigger (Direct user to upload screenshot with /link)
    if (interaction.customId === 'btn_open_link_modal') {
      return await interaction.reply({
        content: `👉 **Click here to link immediately:** </link:1557524738736267364>`,
        embeds: [
          createBaseEmbed('🛡️ Profile Security Verification', COLORS.GOLD).setDescription(
            `Click the command pill above to launch **\`/link\`** automatically:\n\n` +
            `👉 **</link:1557524738736267364>**\n\n` +
            `• Simply attach your in-game **Governor Profile** screenshot and press enter.\n` +
            `• The scanner will automatically detect your Player ID and verify profile ownership!`
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
    if (interaction.customId === 'btn_action_roster') {
      return await rosterCmd.execute(interaction);
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
          content: '⛔ You must link your in-game identity first using `/link` before you can cast a vote!',
        });
      }

      const { slots } = await crmApi.getCachedParentData();
      const eventSlots = slots.filter(s => s.eventId === eventId);
      const targetSlot = isBt1
        ? eventSlots.find(s => s.slotName === 'BT1' || s.slotNumber === 1)
        : eventSlots.find(s => s.slotName === 'BT2' || s.slotNumber === 2);

      if (!targetSlot) {
        return await interaction.editReply({
          content: '⚠️ Battle slot is not available or event not found.',
        });
      }

      // Check if slot has already completed
      if (targetSlot.startTime) {
        const slotDate = new Date(targetSlot.startTime);
        if (!isNaN(slotDate.getTime()) && slotDate.getTime() <= Date.now()) {
          return await interaction.editReply({
            content: `⛔ **${targetSlot.slotName}** is completed! No more entries allowed for this slot.`,
          });
        }
      }

      const result = await crmApi.castVote(linked.id, eventId, targetSlot.id);
      if (!result.success) {
        return await interaction.editReply({
          content: `❌ Failed to record vote: ${result.message}`,
        });
      }

      const slotLabel = isBt1 ? 'BT1 (16:00 UTC)' : 'BT2 (00:30 UTC)';
      return await interaction.editReply({
        content: `✅ **Vote Confirmed!** **${linked.name}** is registered for **${slotLabel}**. Prepare for battle!`,
      });
    }
  }

  // 2. MODAL SUBMISSION
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_link_account') {
      return await interaction.reply({
        embeds: [
          createBaseEmbed('🛡️ Screenshot Verification Required', COLORS.GOLD).setDescription(
            'To protect players from account impersonation, all account linking requires an in-game Governor Profile screenshot.\n\n' +
            'Please run **`/link player:<name_or_id> screenshot:<file>`** to verify and link your account.'
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
