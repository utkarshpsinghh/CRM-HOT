import { EmbedBuilder } from 'discord.js';

export const COLORS = {
  GOLD: 0xD97706,      // Primary Alliance Gold / Amber
  CRIMSON: 0xDC2626,   // Strike / Alert / Battle
  EMERALD: 0x10B981,   // Active / Attended / Success
  BRONZE: 0x78350F,    // Neutral / Defense
  STONE: 0x292524,     // Dark background
};

/**
 * Creates visual text progress bar: [████████░░] 80%
 */
export function renderProgressBar(percentage, length = 10) {
  const safePercent = Math.min(Math.max(percentage || 0, 0), 100);
  const filledCount = Math.round((safePercent / 100) * length);
  const emptyCount = length - filledCount;
  const bar = '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  return `\`[${bar}]\` **${safePercent.toFixed(1)}%**`;
}

/**
 * Formats in-game rank with corresponding badges
 */
export function formatRank(rank) {
  switch (rank?.toUpperCase()) {
    case 'R5': return '👑 **R5 (Leader)**';
    case 'R4': return '🛡️ **R4 (Officer)**';
    case 'R3': return '⚔️ **R3 (Elite)**';
    case 'R2': return '🏹 **R2 (Warrior)**';
    case 'R1': return '🗡️ **R1 (Member)**';
    default: return rank || 'Unknown';
  }
}

/**
 * Standard base embed with Alliance branding
 */
export function createBaseEmbed(title = '', color = COLORS.GOLD) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .setFooter({
      text: 'Kingdom #1391 • HOT Alliance Command Center',
    });
}
