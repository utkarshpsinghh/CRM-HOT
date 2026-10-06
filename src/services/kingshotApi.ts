/**
 * ============================================================================
 * KINGSHOT ALLIANCE MEMBER AUTOMATION — KINGDOM #1391 [HOT] ALLIANCE
 * ============================================================================
 * Capabilities:
 * 1. Live Kingshot API / Webhook Integration:
 *    Fetches live members from custom Kingshot bot endpoints, discord bots, or APIs.
 * 2. Universal In-Game & Discord Roster Parser:
 *    Parses in-game player lists, discord bot exports (/roster), CSV, or OCR text.
 * 3. Supabase & Local Database Synchronization:
 *    Performs clean replacement or smart merging of members.
 * ============================================================================
 */

import { Member, AllianceRank, AllianceSettings } from '../types/crm';
import { supabaseService } from './supabase';
import { storageService } from './storage';

export const KINGDOM_ID = '1391';
export const ALLIANCE_TAG = 'HOT';
export const ALLIANCE_NAME = 'HOT Alliance';

export interface KingshotFetchResult {
  success: boolean;
  message: string;
  source: 'api' | 'parser' | 'sync';
  members: Member[];
  unparsedLines?: string[];
  newCount?: number;
  updatedCount?: number;
}

// Clean baseline — no hardcoded fake/mock members
export const KINGDOM_1391_HOT_ROSTER_DEFAULTS: Array<{ name: string; rank: AllianceRank }> = [];

export function generateKingdom1391HOTMembers(): Member[] {
  return [];
}

export const kingshotApiService = {
  getKingdomInfo() {
    return {
      kingdomId: KINGDOM_ID,
      allianceTag: ALLIANCE_TAG,
      allianceName: ALLIANCE_NAME,
    };
  },

  /**
   * Universal Roster Parser: Converts raw copied game text, discord bot exports,
   * CSV, JSON, or OCR text from Kingdom #1391 into valid CRM Member records.
   */
  parseRosterText(rawText: string, allianceTag: string = ALLIANCE_TAG): KingshotFetchResult {
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        message: 'No roster text provided.',
        source: 'parser',
        members: [],
      };
    }

    const trimmed = rawText.trim();
    const now = new Date().toISOString();
    const parsedMembers: Member[] = [];
    const unparsedLines: string[] = [];

    // 1. Try parsing as JSON first (in case user pasted JSON from API/bot)
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const json = JSON.parse(trimmed);
        const list: any[] = Array.isArray(json) ? json : json.members || json.players || json.data || [];
        if (list.length > 0) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const rawName = typeof item === 'string'
              ? item
              : item.name || item.player || item.username || item.nickname;
            if (rawName && String(rawName).trim().length > 0) {
              const clean = String(rawName).trim();
              const formattedName = clean.startsWith('[') ? clean : `[${allianceTag}] ${clean}`;
              const rawRank = typeof item === 'object' ? (item.rank || item.currentRank || 'R1') : 'R1';
              const validRank: AllianceRank = ['R5', 'R4', 'R3', 'R2', 'R1'].includes(String(rawRank).toUpperCase())
                ? (String(rawRank).toUpperCase() as AllianceRank)
                : 'R1';
              const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
              parsedMembers.push({
                id: (typeof item === 'object' && item.id) ? String(item.id) : `ks-1391-hot-${slug || i + 1}`,
                name: formattedName,
                currentRank: validRank,
                formerRank: 'None',
                strikes: Number(item?.strikes) || 0,
                communication: item?.communication || 'Good',
                status: item?.status || 'Active',
                createdAt: item?.createdAt || now,
                updatedAt: now,
              });
            }
          }
          if (parsedMembers.length > 0) {
            return {
              success: true,
              message: `Successfully parsed ${parsedMembers.length} members from JSON.`,
              source: 'parser',
              members: parsedMembers,
            };
          }
        }
      } catch {
        // Not valid JSON, continue with line-by-line parsing
      }
    }

    // 2. Line-by-line parsing (Handles in-game copy, Discord bots, CSV, OCR)
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Ignore header or separator lines
      if (/^(name|rank|player|member|power|troops|level|#|---|kingdom|total)/i.test(line)) {
        continue;
      }

      let detectedRank: AllianceRank = 'R1';

      // Detect rank R1..R5, Leader, Officer
      const rankMatch = line.match(/\b(R[1-5]|r[1-5]|Leader|Officer|Recruit|Warrior|Elite)\b/i);
      if (rankMatch) {
        const raw = rankMatch[1].toUpperCase();
        if (raw === 'LEADER') detectedRank = 'R5';
        else if (raw === 'OFFICER') detectedRank = 'R4';
        else if (raw === 'ELITE') detectedRank = 'R3';
        else if (raw === 'WARRIOR') detectedRank = 'R2';
        else if (raw === 'RECRUIT') detectedRank = 'R1';
        else if (['R1', 'R2', 'R3', 'R4', 'R5'].includes(raw)) detectedRank = raw as AllianceRank;
      }

      // Clean the line to isolate player name
      let cleanLine = line
        // Remove leading numbering like "1.", "1 -", "#1", "•", etc.
        .replace(/^(\d+[\.\)\-:]|\#\d+|[•\-\*])\s*/, '')
        // Remove power indicators like "(Power: 45,200,000)" or "45.2M Power"
        .replace(/\bpower\s*[:=]?\s*[\d,\.mkb]+/gi, '')
        .replace(/\b[\d,\.mkb]+\s*power\b/gi, '')
        // Remove rank indicators
        .replace(/\b(R[1-5]|r[1-5]|Leader|Officer|Recruit|Warrior|Elite)\b/gi, '')
        // Remove brackets around rank e.g. (R4) or [R4]
        .replace(/[\(\[\{]\s*[\)\]\}]/g, '')
        // Remove unwanted punctuation
        .replace(/[-•:;|,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract existing tag or clean name
      let finalName = '';
      if (cleanLine.length >= 2) {
        // If line has multiple tokens, first token or everything before spaces might be name
        // Strip existing tags like [HOT] or [1391] to get raw name
        const tagMatch = cleanLine.match(/^\[([^\]]+)\]\s*(.*)$/);
        let playerName = '';
        if (tagMatch) {
          playerName = tagMatch[2].trim() || tagMatch[1].trim();
        } else {
          playerName = cleanLine.split(/\s{2,}|\t/)[0].trim();
          // If still contains spaces, take first 1-2 words if short
          if (playerName.split(' ').length > 3) {
            playerName = playerName.split(' ').slice(0, 2).join(' ');
          }
        }

        playerName = playerName.replace(/[\[\]]/g, '').trim();

        if (playerName.length >= 2) {
          finalName = `[${allianceTag}] ${playerName}`;
          const slug = playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const id = `ks-1391-hot-${slug || Date.now().toString(36)}`;

          // Deduplicate within the batch
          if (!parsedMembers.some(m => m.name.toLowerCase() === finalName.toLowerCase())) {
            parsedMembers.push({
              id,
              name: finalName,
              currentRank: detectedRank,
              formerRank: 'None',
              strikes: 0,
              communication: 'Good',
              status: 'Active',
              createdAt: now,
              updatedAt: now,
            });
          }
        } else {
          unparsedLines.push(line);
        }
      } else {
        unparsedLines.push(line);
      }
    }

    return {
      success: parsedMembers.length > 0,
      message: parsedMembers.length > 0
        ? `Successfully parsed ${parsedMembers.length} members for Kingdom #${KINGDOM_ID} [${allianceTag}].`
        : 'Could not extract valid member names from the provided text.',
      source: 'parser',
      members: parsedMembers,
      unparsedLines,
    };
  },

  /**
   * Fetches live alliance members from an external Kingshot API or Webhook endpoint.
   * If no API endpoint is supplied, returns clear guidance.
   */
  async fetchAllianceMembers(
    kingdomId: string = KINGDOM_ID,
    allianceTag: string = ALLIANCE_TAG,
    apiUrl?: string,
    apiKey?: string
  ): Promise<KingshotFetchResult> {
    if (apiUrl && apiUrl.trim().startsWith('http')) {
      try {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (apiKey && apiKey.trim()) {
          headers['Authorization'] = `Bearer ${apiKey.trim()}`;
          headers['x-api-key'] = apiKey.trim();
        }

        const resp = await fetch(apiUrl.trim(), {
          method: 'GET',
          headers,
        });

        if (!resp.ok) {
          return {
            success: false,
            message: `API endpoint returned HTTP ${resp.status} (${resp.statusText}).`,
            source: 'api',
            members: [],
          };
        }

        const data = await resp.json();
        const memberList: any[] = Array.isArray(data)
          ? data
          : data.members || data.players || data.data || data.roster || [];

        if (memberList.length === 0) {
          return {
            success: false,
            message: `API responded successfully, but returned 0 member records for Kingdom #${kingdomId} [${allianceTag}].`,
            source: 'api',
            members: [],
          };
        }

        const now = new Date().toISOString();
        const mapped: Member[] = memberList.map((item, idx) => {
          const rawName = typeof item === 'string'
            ? item
            : item.name || item.player || item.username || item.nickname || `Member_${idx + 1}`;
          const cleanName = String(rawName).trim();
          const formattedName = cleanName.startsWith('[') ? cleanName : `[${allianceTag}] ${cleanName}`;
          const rawRank = typeof item === 'object' ? (item.rank || item.currentRank || 'R1') : 'R1';
          const validRank: AllianceRank = ['R5', 'R4', 'R3', 'R2', 'R1'].includes(String(rawRank).toUpperCase())
            ? (String(rawRank).toUpperCase() as AllianceRank)
            : 'R1';
          const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const id = (typeof item === 'object' && item.id)
            ? String(item.id)
            : `ks-${kingdomId}-${allianceTag.toLowerCase()}-${slug || idx + 1}`;

          return {
            id,
            name: formattedName,
            currentRank: validRank,
            formerRank: 'None',
            strikes: Number(item?.strikes) || 0,
            communication: item?.communication || 'Good',
            status: item?.status || 'Active',
            createdAt: item?.createdAt || now,
            updatedAt: now,
          };
        });

        return {
          success: true,
          message: `Successfully fetched ${mapped.length} real members from API for Kingdom #${kingdomId} [${allianceTag}].`,
          source: 'api',
          members: mapped,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          message: `Failed to connect to Kingshot API endpoint: ${msg}`,
          source: 'api',
          members: [],
        };
      }
    }

    return {
      success: false,
      message: 'No Kingshot API URL configured. Please enter your bot / API endpoint or paste your alliance roster.',
      source: 'api',
      members: [],
    };
  },

  /**
   * Synchronizes members directly into Supabase PostgreSQL and local storage.
   * When `replaceExisting` is true (default), wipes all previous manual/mock members
   * and populates the database strictly with the new roster.
   */
  async syncMembersToDatabase(
    newMembers: Member[],
    settings: AllianceSettings,
    replaceExisting: boolean = true
  ): Promise<{ success: boolean; message: string; added: number; updated: number; total: number }> {
    if (!newMembers || newMembers.length === 0) {
      return { success: false, message: 'No members to sync.', added: 0, updated: 0, total: 0 };
    }

    let finalRoster: Member[];
    let addedCount = 0;
    let updatedCount = 0;

    if (replaceExisting) {
      // Clean refresh: Replace entire roster with the newly provided members
      finalRoster = [...newMembers];
      addedCount = newMembers.length;
      updatedCount = 0;
    } else {
      // Smart merge: Update ranks of existing members, add new ones
      const currentMembers = storageService.getMembers().filter(m => !/^mem-\d+$/.test(m.id));
      const existingMap = new Map(currentMembers.map(m => [m.name.toLowerCase(), m]));
      finalRoster = [...currentMembers];

      for (const member of newMembers) {
        const existing = existingMap.get(member.name.toLowerCase());
        if (existing) {
          if (existing.currentRank !== member.currentRank) {
            existing.formerRank = existing.currentRank;
            existing.currentRank = member.currentRank;
            existing.updatedAt = new Date().toISOString();
            updatedCount++;
          }
        } else {
          finalRoster.push(member);
          existingMap.set(member.name.toLowerCase(), member);
          addedCount++;
        }
      }
    }

    // Persist to local storage
    storageService.setMembers(finalRoster);

    // Persist to Supabase if configured
    if (supabaseService.isConfigured(settings)) {
      try {
        const client = supabaseService.getClient(settings);
        if (client) {
          if (replaceExisting) {
            // Delete all previous members from Supabase for a clean refresh
            try {
              await client.from('members').delete().neq('id', '___empty___');
            } catch (delErr) {
              console.warn('Supabase cleanup notice:', delErr);
            }
          }

          // Upsert new members in chunks of 100
          const rows = finalRoster.map(supabaseService.mapMemberToRow);
          for (let i = 0; i < rows.length; i += 100) {
            const chunk = rows.slice(i, i + 100);
            await client.from('members').upsert(chunk, { onConflict: 'id' });
          }
        }
      } catch (err) {
        console.warn('Supabase member sync warning:', err);
      }
    }

    return {
      success: true,
      message: `HOT Alliance Roster Synchronized: ${finalRoster.length} real members updated.`,
      added: addedCount,
      updated: updatedCount,
      total: finalRoster.length,
    };
  },
};
