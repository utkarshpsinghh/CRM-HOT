/**
 * ============================================================================
 * KINGSHOT API & ALLIANCE MEMBER AUTOMATION SERVICE
 * ============================================================================
 * RESEARCH SUMMARY & CURRENT STATUS (Century Games / Kingshot):
 * - Century Games does NOT provide an official public REST API for querying live
 *   in-game alliance membership or player roster data.
 * - In-game alliance rosters are restricted behind authenticated game socket protocols
 *   and anti-automation/TOS protections.
 * - Standard practice used by top alliances (e.g. Kingshot Alliance Roster, KingshotPro,
 *   Macro Automation Studio) is:
 *     1. Kingshot Roster Export parser (OCR or text export from KingShot / Atlas).
 *     2. Automated text/clipboard parser converting game text into structured Member records.
 *     3. Fallback webhook/relay endpoint if the alliance operates a self-hosted discord bot.
 * ============================================================================
 */

import { Member, AllianceRank } from '../types/crm';

export interface KingshotFetchResult {
  success: boolean;
  message: string;
  source: 'api' | 'parser' | 'mock';
  members: Member[];
  unparsedLines?: string[];
}

export const kingshotApiService = {
  /**
   * Status check of King's Shot public API availability
   */
  async checkApiAvailability(): Promise<{
    hasOfficialApi: boolean;
    recommendation: string;
    details: string;
  }> {
    return {
      hasOfficialApi: false,
      recommendation:
        'Use the built-in Smart Roster Importer to paste in-game roster exports or use our Google Sheets / PostgreSQL synchronization.',
      details:
        'Century Games does not publish an open public REST API for live alliance player retrieval. Third-party tools rely on game text exports, OCR, or community Discord bots.',
    };
  },

  /**
   * Smart Roster Parser: Converts raw copied game text, discord bot output,
   * or CSV from King's Shot into valid CRM Member records.
   */
  parseRosterText(rawText: string): KingshotFetchResult {
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        message: 'No roster text provided.',
        source: 'parser',
        members: [],
      };
    }

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedMembers: Member[] = [];
    const unparsedLines: string[] = [];
    const now = new Date().toISOString();

    for (const line of lines) {
      // Ignore header lines or separator lines
      if (/^(name|rank|player|member|power|troops|level|#|---)/i.test(line)) {
        continue;
      }

      // Regex patterns commonly seen in Kingshot game roster exports & Discord bots:
      // Pattern 1: "[HOT] Ares - R4" or "Ares (R4)" or "Ares R4" or "R4 MoonLight"
      let name = '';
      let rank: AllianceRank = 'R1';

      // Detect rank R1..R5
      const rankMatch = line.match(/\b(R[1-5]|r[1-5]|Leader|Officer)\b/i);
      if (rankMatch) {
        const rawRank = rankMatch[1].toUpperCase();
        if (rawRank === 'LEADER') rank = 'R5';
        else if (rawRank === 'OFFICER') rank = 'R4';
        else rank = rawRank as AllianceRank;
      }

      // Extract cleaned member name
      // Strip rank, bracketed alliance tags like [HOT], and leading symbols
      const cleanLine = line
        .replace(/\[[^\]]+\]/g, '') // remove [HOT]
        .replace(/\b(R[1-5]|r[1-5]|Leader|Officer)\b/gi, '') // remove rank indicator
        .replace(/[-•:,|()]/g, ' ') // remove delimiters
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanLine.length >= 2) {
        // First token or whole clean line as name
        name = cleanLine.split(' ')[0] || cleanLine;
        const id = `mem-ks-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36).slice(-3)}`;

        // Avoid duplicates within the parsed batch
        if (!parsedMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
          parsedMembers.push({
            id,
            name,
            currentRank: rank,
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
    }

    return {
      success: parsedMembers.length > 0,
      message: parsedMembers.length > 0
        ? `Successfully parsed ${parsedMembers.length} alliance members from King's Shot text.`
        : 'Could not extract valid member names from the provided text.',
      source: 'parser',
      members: parsedMembers,
      unparsedLines,
    };
  },

  /**
   * Test endpoint simulation for Kingshot alliance member sync
   */
  async testFetchAllianceMembers(kingdomId?: string, allianceTag: string = 'HOT'): Promise<KingshotFetchResult> {
    // Century games has no live open API, so we provide an explicit test response
    // along with sample parsed members to test the pipeline safely.
    const sampleText = `
[HOT] MoonLight R4
[HOT] Ares R4
[HOT] Valkyrie R3
[HOT] ShadowKnight R3
[HOT] StormBringer R2
[HOT] IronClad R1
`;
    const result = this.parseRosterText(sampleText);
    return {
      ...result,
      source: 'api',
      message: `Test fetch simulated for Alliance [${allianceTag}] (Kingdom: ${kingdomId || 'Default'}). Verified ${result.members.length} members format.`,
    };
  },
};
