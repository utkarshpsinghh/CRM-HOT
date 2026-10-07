import { config } from '../config.js';

class CrmApiClient {
  /**
   * Internal fetch wrapper attaching x-api-key header
   */
  async request(endpoint, queryParams = {}) {
    const url = new URL(`${config.crmBaseUrl}${endpoint}`);
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.append(key, String(val));
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': config.crmApiKey,
          'Accept': 'application/json',
          'User-Agent': 'HOT-Alliance-Discord-Bot/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try { errorJson = JSON.parse(errorText); } catch {}
        throw new Error(errorJson?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`[CRM API ERROR] ${endpoint}:`, err.message);
      throw err;
    }
  }

  /**
   * Search member by name or Player ID (gameId)
   */
  async searchMember(query) {
    if (!query) return null;
    const clean = query.trim().toLowerCase();

    // 1. Search via CRM search query param
    const res = await this.request('/members', { search: clean, limit: 20 });
    const list = res.data || [];

    if (list.length === 0) {
      // 2. Fetch full roster and do local fuzzy match
      const allRes = await this.request('/members', { limit: 500 });
      const all = allRes.data || [];

      // Exact match on gameId
      const byId = all.find(m => m.gameId && m.gameId.toLowerCase() === clean);
      if (byId) return byId;

      // Exact match on name
      const byName = all.find(m => m.name && m.name.toLowerCase() === clean);
      if (byName) return byName;

      // Partial match
      return all.find(m => m.name && m.name.toLowerCase().includes(clean)) || null;
    }

    // Exact gameId match first
    const exactId = list.find(m => m.gameId && m.gameId.toLowerCase() === clean);
    if (exactId) return exactId;

    // Exact name match
    const exactName = list.find(m => m.name && m.name.toLowerCase() === clean);
    if (exactName) return exactName;

    return list[0] || null;
  }

  /**
   * Fetch ranked leaderboard
   */
  async getLeaderboard(limit = 10, sortBy = 'attendanceRate') {
    return await this.request('/leaderboard', { limit, sortBy });
  }

  /**
   * Fetch alliance battle events
   */
  async getEvents(status = '', limit = 10) {
    return await this.request('/events', { status, limit });
  }

  /**
   * Fetch attendance history records for a member or event
   */
  async getAttendance(memberId = '', eventId = '', limit = 10) {
    return await this.request('/attendance', { memberId, eventId, limit });
  }

  /**
   * Fetch full roster to compute statistics or detect inactives
   */
  async getAllMembers(status = '') {
    return await this.request('/members', { status, limit: 500 });
  }
}

export const crmApi = new CrmApiClient();
