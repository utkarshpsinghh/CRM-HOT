import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { createBaseEmbed, COLORS } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('rollcall')
  .setDescription('Launch an interactive battle RSVP roll call with live buttons')
  .addStringOption(opt =>
    opt
      .setName('battle')
      .setDescription('Battle title (e.g. Bear Trap #47 or SvS Sunfire Castle)')
      .setRequired(false)
  )
  .addIntegerOption(opt =>
    opt
      .setName('duration_hours')
      .setDescription('How many hours to keep roll call active (default: 4 hours)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const battleTitle = interaction.options.getString('battle') || 'Bear Trap Battle';
  const durationHours = interaction.options.getInteger('duration_hours') || 4;
  const durationMs = durationHours * 60 * 60 * 1000;
  const expiresAtUnix = Math.floor((Date.now() + durationMs) / 1000);

  // In-memory squads for this active roll call
  const squads = {
    bt1: new Map(), // userId -> displayName
    bt2: new Map(),
    afk: new Map(),
  };

  const buildEmbed = (isClosed = false) => {
    const bt1List = Array.from(squads.bt1.values());
    const bt2List = Array.from(squads.bt2.values());
    const afkList = Array.from(squads.afk.values());
    const totalReady = bt1List.length + bt2List.length;

    const embed = createBaseEmbed(`📢 [HOT] Battle Roll Call: ${battleTitle}`, isClosed ? COLORS.STONE : COLORS.GOLD)
      .setDescription(
        isClosed
          ? `🔒 **Roll Call Concluded!** Total combatants confirmed: **${totalReady}** warriors.`
          : `**Kingdom #1391 • House of Titans [HOT]**\n` +
            `All warriors sound off! Click a button below to confirm your battle readiness.\n` +
            `⏱️ **Active until:** <t:${expiresAtUnix}:R>`
      )
      .addFields(
        {
          name: `⚔️ BT1 Squad (16:00 UTC) [${bt1List.length}]`,
          value: bt1List.length > 0 ? bt1List.map(n => `• ${n}`).join('\n') : '*No fighters confirmed yet*',
          inline: true,
        },
        {
          name: `🛡️ BT2 Squad (00:30 UTC) [${bt2List.length}]`,
          value: bt2List.length > 0 ? bt2List.map(n => `• ${n}`).join('\n') : '*No fighters confirmed yet*',
          inline: true,
        },
        {
          name: `💤 Excused / AFK [${afkList.length}]`,
          value: afkList.length > 0 ? afkList.map(n => `• ${n}`).join('\n') : '*None reported*',
          inline: true,
        }
      )
      .setFooter({
        text: `Total Ready: ${totalReady} Warriors • Kingdom #1391 Command`,
      });

    return embed;
  };

  const buildButtons = (disabled = false) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rc_bt1')
        .setLabel('⚔️ Ready for BT1 (16:00 UTC)')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('rc_bt2')
        .setLabel('🛡️ Ready for BT2 (00:30 UTC)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('rc_afk')
        .setLabel('💤 Excused / AFK')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );
  };

  const response = await interaction.reply({
    embeds: [buildEmbed()],
    components: [buildButtons()],
    fetchReply: true,
  });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: durationMs,
  });

  collector.on('collect', async btnInteraction => {
    const userId = btnInteraction.user.id;
    const displayName = btnInteraction.member?.displayName || btnInteraction.user.username;

    // Remove user from all squads first
    squads.bt1.delete(userId);
    squads.bt2.delete(userId);
    squads.afk.delete(userId);

    let statusText = '';
    if (btnInteraction.customId === 'rc_bt1') {
      squads.bt1.set(userId, displayName);
      statusText = '⚔️ You are confirmed for **BT1 (16:00 UTC)**!';
    } else if (btnInteraction.customId === 'rc_bt2') {
      squads.bt2.set(userId, displayName);
      statusText = '🛡️ You are confirmed for **BT2 (00:30 UTC)**!';
    } else if (btnInteraction.customId === 'rc_afk') {
      squads.afk.set(userId, displayName);
      statusText = '💤 Marked as **Excused / AFK**. Thank you for letting the team know!';
    }

    await btnInteraction.update({
      embeds: [buildEmbed()],
      components: [buildButtons()],
    });

    await btnInteraction.followUp({
      content: statusText,
      ephemeral: true,
    }).catch(() => {});
  });

  collector.on('end', async () => {
    await response.edit({
      embeds: [buildEmbed(true)],
      components: [buildButtons(true)],
    }).catch(() => {});
  });
}
