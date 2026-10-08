import { createWorker } from 'tesseract.js';

let ocrWorker = null;

async function getWorker() {
  if (!ocrWorker) {
    ocrWorker = await createWorker('eng');
  }
  return ocrWorker;
}

/**
 * Validates whether an uploaded screenshot is an authentic in-game Governor Profile
 * belonging to the specified member.
 * 
 * @param {string} imageUrl - The attachment URL or local file path
 * @param {object} member - The member being linked { id, name, gameId }
 * @returns {Promise<{ valid: boolean, reason?: string, details?: string }>}
 */
export async function verifyGovernorProfileScreenshot(imageUrl, member) {
  try {
    const worker = await getWorker();
    const ret = await worker.recognize(imageUrl);
    const rawText = ret.data.text || '';
    const text = rawText.toLowerCase();

    // 1. Check for Discord / Chat screenshots
    const discordTokens = [
      'hot alliance bot',
      'discord',
      'only you can see this',
      'dismiss message',
      '@everyone',
      'profile linked & verified',
      'bear trap scheduled',
      'vote synchronized',
      'vote confirmed',
    ];
    if (discordTokens.some(t => text.includes(t))) {
      return {
        valid: false,
        reason: 'The uploaded image is a screenshot of Discord or the bot, not an in-game screenshot.\n\nPlease upload a direct screenshot from inside the game showing your **Governor Profile** screen.',
      };
    }

    // 2. Check for authentic in-game Governor Profile UI elements
    const gameTokens = [
      'governor',
      'profile',
      'kingdom',
      '1391',
      'alliance',
      'hot',
      'skins',
      'squad',
      'leaderboard',
      'settings',
      'gear',
      'kills:',
      'healing',
    ];
    const matchedTokens = gameTokens.filter(t => text.includes(t));
    if (matchedTokens.length < 2) {
      return {
        valid: false,
        reason: 'The uploaded image does not appear to be an in-game Governor Profile screen.\n\nPlease ensure your screenshot is taken from inside the game by tapping your avatar in the top-left corner.',
      };
    }

    // 3. Verify Player ID or In-Game Name match
    const cleanId = (member.gameId || '').replace(/\D/g, '');
    const cleanMemberName = member.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const textAlphaNum = text.replace(/[^a-z0-9]/g, '');

    const hasId = Boolean(cleanId && (text.includes(cleanId) || textAlphaNum.includes(cleanId)));
    const hasName = Boolean(cleanMemberName && textAlphaNum.includes(cleanMemberName));

    if (!hasId && !hasName) {
      return {
        valid: false,
        reason: `The screenshot does not match Governor **${member.name}** (ID: \`${member.gameId || 'Unknown'}\`).\n\nPlease ensure your in-game name or numeric Player ID is clearly visible.`,
      };
    }

    // 4. Verify Ownership (Must be viewing OWN profile, not another player's profile)
    // Viewing your own profile displays 'Settings' and 'Skins' at the bottom
    const ownershipTokens = ['settings', 'skins', 'squad'];
    const hasOwnershipMarker = ownershipTokens.some(t => text.includes(t));
    if (!hasOwnershipMarker) {
      return {
        valid: false,
        reason: 'This screenshot appears to be another player\'s profile.\n\nPlease open your **own** profile (tap your avatar) where the **Settings** tab is visible at the bottom.',
      };
    }

    return {
      valid: true,
      matchedTokens,
      matchedId: hasId,
      matchedName: hasName,
    };
  } catch (err) {
    console.error('[OCR ERROR] Image verification failed:', err);
    return {
      valid: false,
      reason: `Could not analyze image: ${err.message}. Please try re-uploading a clear PNG or JPG.`,
    };
  }
}
