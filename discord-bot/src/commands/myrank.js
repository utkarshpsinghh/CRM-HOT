import { SlashCommandBuilder } from 'discord.js';
import * as rankCmd from './rank.js';

export const data = new SlashCommandBuilder()
  .setName('myrank')
  .setDescription('Instantly view your personal alliance leaderboard rank and combat standing');

export async function execute(interaction) {
  return await rankCmd.execute(interaction);
}
