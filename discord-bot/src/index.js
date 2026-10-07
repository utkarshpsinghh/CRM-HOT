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
    // 1A. Link Modal Trigger
    if (interaction.customId === 'btn_open_link_modal') {
      const modal = new ModalBuilder()
        .setCustomId('modal_link_account')
        .setTitle('Link Kingdom #1391 In-Game ID')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('input_player_query')
              .setLabel('In-Game Name or Player ID (e.g. 202703263)')
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

    // 1B. Automated Broadcast Vote Buttons (vote_bt1_<eventId> and vote_bt2_<eventId>)
    if (interaction.customId.startsWith('vote_bt1_') || interaction.customId.startsWith('vote_bt2_')) {
      const isBt1 = interaction.customId.startsWith('vote_bt1_');
      const eventId = interaction.customId.replace('vote_bt1_', '').replace('vote_bt2_', '');

      // Check if user is linked
      const linked = await crmApi.getLinkedMember(interaction.user.id);
      if (!linked) {
        return await interaction.reply({
          content: '⛔ You must link your in-game identity first using `/link` before you can cast a vote!',
          ephemeral: true,
        });
      }

      const { slots } = await crmApi.getCachedParentData();
      const eventSlots = slots.filter(s => s.eventId === eventId);
      const targetSlot = isBt1
        ? eventSlots.find(s => s.slotName === 'BT1' || s.slotNumber === 1)
        : eventSlots.find(s => s.slotName === 'BT2' || s.slotNumber === 2);

      if (!targetSlot) {
        return await interaction.reply({
          content: '⚠️ Battle slot is not available or event not found.',
          ephemeral: true,
        });
      }

      const result = await crmApi.castVote(linked.id, eventId, targetSlot.id);
      if (!result.success) {
        return await interaction.reply({
          content: `❌ Failed to save vote to CRM: ${result.message}`,
          ephemeral: true,
        });
      }

      const slotLabel = isBt1 ? 'BT1 (16:00 UTC)' : 'BT2 (00:30 UTC)';
      return await interaction.reply({
        content: `✅ **Vote Synchronized!** **${linked.name}** has voted for **${slotLabel}** and directly updated the official CRM database!`,
        ephemeral: true,
      });
    }
  }

  // 2. MODAL SUBMISSION
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
              `*Tip: Please check spelling or use your exact numeric in-game Player ID.*`
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
              '• Type **/vote** to cast your Bear Trap slot vote',
              '• Type **/beartrap** to view live countdown to the next trap',
              '• Type **/help** to browse all alliance commands',
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({ text: 'Tip: For full profile security, upload your Governor Profile screenshot with /link.' });

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
