import { SlashCommandBuilder } from 'discord.js';
import * as rankCmd from './rank.js';

export const data = new SlashCommandBuilder()
  .setName('myrank')
  .setDescription('View your alliance leaderboard rank and stats');

export async function execute(interaction) {
  return await rankCmd.execute(interaction);
}
