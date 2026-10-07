import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  crmBaseUrl: (process.env.CRM_API_BASE_URL || 'https://crm.1391.online/api/v1').replace(/\/$/, ''),
  crmApiKey: process.env.CRM_API_KEY || '',
  officerRoleName: process.env.OFFICER_ROLE_NAME || 'R4 Officer',
};

// Validate critical configuration on startup
export function validateConfig() {
  const missing = [];
  if (!config.discordToken) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.crmApiKey) missing.push('CRM_API_KEY');

  if (missing.length > 0) {
    console.warn(`[CONFIG WARNING] Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please configure these in discord-bot/.env file.');
  }
}
