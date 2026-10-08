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

    let imageInput = imageUrl;
    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      try {
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          imageInput = Buffer.from(arrayBuf);
        }
      } catch (fetchErr) {
        console.warn('[OCR] Remote fetch fallback to direct URL:', fetchErr.message);
      }
    }

    const ret = await worker.recognize(imageInput);
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
      'skin',
      'squad',
      'leaderboard',
      'settings',
      'setting',
      'gear',
      'kills:',
      'healing',
      'mood',
    ];
    const matchedTokens = gameTokens.filter(t => text.includes(t));
    if (matchedTokens.length < 2) {
      return {
        valid: false,
        reason: 'The uploaded image does not appear to be an in-game Governor Profile screen.\n\nPlease ensure your screenshot is taken from inside the game by tapping your avatar in the top-left corner.',
      };
    }

    // 3. Extract Player ID from screenshot
    const idMatch = rawText.match(/(?:id|1d|ld)\s*[:;.\s]?\s*(\d{6,12})/i);
    const standaloneMatch = rawText.match(/\b\d{7,10}\b/);
    const extractedId = idMatch ? idMatch[1] : (standaloneMatch ? standaloneMatch[0] : null);

    // 4. If target member is provided, verify match
    let hasId = false;
    let hasName = false;

    if (member) {
      const cleanId = (member.gameId || '').replace(/\D/g, '');
      const cleanMemberName = member.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const textAlphaNum = text.replace(/[^a-z0-9]/g, '');

      hasId = Boolean(cleanId && (text.includes(cleanId) || textAlphaNum.includes(cleanId)));
      hasName = Boolean(cleanMemberName && textAlphaNum.includes(cleanMemberName));

      if (!hasId && !hasName) {
        return {
          valid: false,
          reason: `The screenshot does not match Governor **${member.name}** (ID: \`${member.gameId || 'Unknown'}\`).\n\nPlease ensure your in-game name or numeric Player ID is clearly visible.`,
        };
      }
    } else if (!extractedId) {
      return {
        valid: false,
        reason: 'Could not detect your numeric Player ID from the screenshot.\n\nPlease ensure your Governor Profile ID is clearly visible, or provide the `player` option.',
      };
    }

    // 5. Verify Ownership (Must be viewing OWN profile, not another player's profile)
    // Negative check: another player's profile has social action buttons
    const otherPlayerTokens = ['send message', 'blacklist', 'add friend', 'block governor'];
    const isOtherPlayerScreen = otherPlayerTokens.some(t => text.includes(t));

    // Positive check: Own profile displays Settings, Skins, Squad, Leaderboard, +Mood, Gear, stamina counter
    const ownershipTokens = [
      'settings',
      'setting',
      'settin',
      'sett',
      'skins',
      'skin',
      'squad',
      'leaderboard',
      'leader',
      'mood',
      'gear',
    ];
    const hasStaminaPattern = /\d+\s*\/\s*\d+/.test(rawText);
    const hasOwnershipToken = ownershipTokens.some(t => text.includes(t));
    const hasOwnershipMarker = !isOtherPlayerScreen && (hasOwnershipToken || hasStaminaPattern || matchedTokens.length >= 3);

    if (!hasOwnershipMarker) {
      return {
        valid: false,
        reason: 'This screenshot appears to be another player\'s profile.\n\nPlease open your **own** profile (tap your avatar) where the **Settings** and **Mood** buttons are visible at the bottom.',
      };
    }

    return {
      valid: true,
      extractedId,
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
