import { SlashCommandBuilder } from 'discord.js';
import { crmApi } from '../services/crmApi.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';
import { createLinkButton, createWarRoomButtons } from '../utils/authCheck.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Alliance command manual and verification portal');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const linkedMember = await crmApi.getLinkedMember(interaction.user.id);

    // 1. UNLINKED USER: CLEAN STEP 1 ONBOARDING
    if (!linkedMember) {
      const embed = createBaseEmbed('🛡️ Step 1: Verification Required', COLORS.GOLD)
        .setDescription(
          `**Welcome to Kingdom #1391 • House of Titans [HOT] Bot!**\n\n` +
          `To keep alliance operations secure, all commands are structured and unlock in sequence.\n\n` +
          `### 📸 Step 1: Verify Your In-Game Account\n` +
          `1. Open King's Shot and tap your avatar to open your **Governor Profile** screen.\n` +
          `2. Take a screenshot (showing name, ID, and bottom **Settings** tab).\n` +
          `3. Click the button below or tap **</link:1557524738736267364>** to upload your screenshot.\n\n` +
          `*(Once verified, type \`/help\` or \`/start\` to unlock the full command console!)*`
        )
        .setFooter({
          text: 'Kingdom #1391 • House of Titans • Identity Verification',
        });

      return await interaction.editReply({
        embeds: [embed],
        components: [createLinkButton()],
      });
    }

    // 2. VERIFIED USER: STRUCTURED & SEQUENTIAL COMMAND DIRECTORY
    const embed = createBaseEmbed('🛡️ [HOT] Alliance Bot — Command Directory', COLORS.GOLD)
      .setDescription(
        `Welcome back, **${linkedMember.name}** [${linkedMember.rank}]!\n` +
        `Your identity is verified. Here are your alliance commands grouped in sequence:`
      )
      .addFields(
        {
          name: '⚔️ 1. Battle Coordination & Voting',
          value: [
            '`/vote` — Cast your Bear Trap battle deployment slot vote.',
            '`/beartrap` — Next battle countdown, live dual slot status, and turnouts.',
            '`/attendance [player]` — Detailed battle ledger showing voted and attended slots.',
            '`/events [status]` — Schedule for Bear Traps, Swordsland War, and Tri Alliance.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '👤 2. Personal Dossiers & Records',
          value: [
            '`/myrank` — Instantly check your personal alliance leaderboard rank & tier.',
            '`/rank [player]` — Check your own standing or inspect any member rank.',
            '`/me` — View your personal combat dossier, strikes, and battle turnout.',
            '`/profile <player>` — Look up any alliance member dossier by Name or Player ID.',
            '`/start` — War Room quick-action portal.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🏰 3. Alliance Intel & Leaderboards',
          value: [
            '`/leaderboard [limit] [sort_by]` — Global attendance leaderboard and rankings.',
            '`/mvp` — Spotlight the #1 reigning battle MVP and top contenders.',
            '`/compare <player1> <player2>` — Head-to-head attendance and rank showdown.',
            '`/inactives [filter]` — Spot inactive members or players with warning strikes.',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚙️ 4. Identity & Officer Admin',
          value: [
            '`/link [screenshot] [player]` — Link account with Governor Profile verification.',
            '`/unlink [user]` — Disconnect linked profile (or officer unlinks a member).',
            '`/strike <add|remove>` — *(Officers only)* Issue or waive disciplinary strikes.',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({
        text: 'Kingdom #1391 • House of Titans • Powered by HOT Alliance Command',
      });

    await interaction.editReply({
      embeds: [embed],
      components: [createWarRoomButtons()],
    });
  } catch (err) {
    console.error('Execute /help error:', err);
    await interaction.editReply({
      embeds: [
        createBaseEmbed('Command Error', COLORS.CRIMSON).setDescription(
          `Failed to load command directory: \`${err.message}\``
        ),
      ],
    });
  }
}
