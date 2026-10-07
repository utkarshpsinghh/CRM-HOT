import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

class CrmApiClient {
  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Helper to load cached parent event participations & slots from Supabase
   */
  async getCachedParentData() {
    try {
      const { data } = await this.supabase
        .from('settings')
        .select('key, value')
        .in('key', ['crm_event_participations_cache', 'crm_event_slots_cache']);

      let participations = [];
      let slots = [];

      (data || []).forEach(row => {
        try {
          if (row.key === 'crm_event_participations_cache') {
            participations = JSON.parse(row.value);
          } else if (row.key === 'crm_event_slots_cache') {
            slots = JSON.parse(row.value);
          }
        } catch {}
      });

      return { participations, slots };
    } catch (err) {
      console.warn('[CRM CACHE] Failed to fetch settings cache:', err.message);
      return { participations: [], slots: [] };
    }
  }

  /**
   * Search member by name or Player ID (gameId) with accurate attendance metrics
   */
  async searchMember(query) {
    if (!query) return null;
    const clean = query.trim();

    try {
      const { data: members, error } = await this.supabase
        .from('members')
        .select('*')
        .or(`name.ilike.%${clean}%,communication_note.ilike.%${clean}%,id.eq.${clean}`)
        .limit(5);

      if (error || !members || members.length === 0) {
        return null;
      }

      // Pick exact match if available
      let matched = members[0];
      const exactName = members.find(m => m.name.toLowerCase() === clean.toLowerCase());
      if (exactName) matched = exactName;
      const exactId = members.find(m => m.communication_note && m.communication_note.includes(`[GID:${clean}]`));
      if (exactId) matched = exactId;

      let gameId = '';
      let cleanNote = matched.communication_note || '';
      if (cleanNote) {
        const match = cleanNote.match(/\[GID:([a-zA-Z0-9_-]+)\]/);
        if (match) {
          gameId = match[1];
          cleanNote = cleanNote.replace(/\[GID:[a-zA-Z0-9_-]+\]/, '').trim();
        }
      }

      return {
        id: matched.id,
        name: matched.name,
        gameId: gameId || null,
        rank: matched.current_rank || 'R1',
        formerRank: matched.former_rank || null,
        strikes: matched.strikes || 0,
        status: matched.status || 'Active',
        communication: matched.communication || 'Good',
        note: cleanNote || null,
        updatedAt: matched.updated_at,
      };
    } catch (err) {
      console.error('[searchMember ERROR]:', err.message);
      return null;
    }
  }

  /**
   * Fetch ranked leaderboard matching the CRM website calculation exactly
   */
  async getLeaderboard(limit = 10, sortBy = 'attendanceRate') {
    try {
      const [{ participations, slots }, membersRes] = await Promise.all([
        this.getCachedParentData(),
        this.supabase
          .from('members')
          .select('id, name, current_rank, status, strikes, communication_note')
          .neq('status', 'Archived'),
      ]);

      const members = membersRes.data || [];

      // Distinct parent battle event IDs from cache
      const distinctEventIds = Array.from(new Set(participations.map(p => p.eventId)));
      const totalBattles = distinctEventIds.length;

      const stats = members.map(m => {
        const mParts = participations.filter(p => p.memberId === m.id);
        const attended = mParts.filter(p => p.attendanceStatus === 'ATTENDED').length;
        const voted = mParts.filter(p => p.voteStatus === 'VOTED').length;

        const attendanceRate = totalBattles > 0
          ? Math.round((attended / totalBattles) * 1000) / 10
          : 0;

        const voteRate = totalBattles > 0
          ? Math.round((voted / totalBattles) * 1000) / 10
          : 0;

        const reliabilityScore = Math.round((attendanceRate * 0.7 + voteRate * 0.3) * 10) / 10;

        let gameId = '';
        if (m.communication_note) {
          const match = m.communication_note.match(/\[GID:([a-zA-Z0-9_-]+)\]/);
          if (match) gameId = match[1];
        }

        return {
          memberId: m.id,
          name: m.name,
          gameId: gameId || null,
          allianceRank: m.current_rank || 'R1',
          status: m.status || 'Active',
          totalEvents: totalBattles,
          attendedCount: attended,
          missedCount: Math.max(0, totalBattles - attended),
          attendanceRate,
          voteRate,
          reliabilityScore,
          strikes: m.strikes || 0,
        };
      });

      // Sorting
      stats.sort((a, b) => {
        if (sortBy === 'attended') {
          return b.attendedCount - a.attendedCount || b.attendanceRate - a.attendanceRate;
        }
        if (b.attendanceRate !== a.attendanceRate) {
          return b.attendanceRate - a.attendanceRate;
        }
        if (b.attendedCount !== a.attendedCount) {
          return b.attendedCount - a.attendedCount;
        }
        if (b.reliabilityScore !== a.reliabilityScore) {
          return b.reliabilityScore - a.reliabilityScore;
        }
        return (a.strikes || 0) - (b.strikes || 0);
      });

      const ranked = stats.map((item, idx) => ({ rank: idx + 1, ...item })).slice(0, limit);

      return {
        success: true,
        count: ranked.length,
        total: stats.length,
        totalCompletedEvents: totalBattles,
        data: ranked,
      };
    } catch (err) {
      console.error('[getLeaderboard ERROR]:', err.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch battle events with dual slot details (BT1 & BT2)
   */
  async getEvents(status = '', limit = 10) {
    try {
      const { participations, slots } = await this.getCachedParentData();

      // Parent battle definitions matching the CRM
      const parentEvents = [
        { id: 'evt-parent-8-bear-trap-2026-10-07', eventName: 'Bear Trap #47', eventType: 'Bear Trap', date: '2026-10-07T16:00:00.000Z', status: 'Scheduled' },
        { id: 'evt-parent-7-bear-trap-2026-10-05', eventName: 'Bear Trap #46', eventType: 'Bear Trap', date: '2026-10-05T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-6-swordsland-2026-10-04', eventName: 'Swordsland War', eventType: 'Swordsland', date: '2026-10-04T02:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-5-bear-trap-2026-10-03', eventName: 'Bear Trap #45', eventType: 'Bear Trap', date: '2026-10-03T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-4-tri-alliance-2026-10-03', eventName: 'Tri Alliance Clash', eventType: 'Tri Alliance', date: '2026-10-03T02:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-3-bear-trap-2026-10-01', eventName: 'Bear Trap #44', eventType: 'Bear Trap', date: '2026-10-01T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-2-bear-trap-2026-09-29', eventName: 'Bear Trap #43', eventType: 'Bear Trap', date: '2026-09-29T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-1-bear-trap-2026-09-27', eventName: 'Bear Trap #42', eventType: 'Bear Trap', date: '2026-09-27T16:00:00.000Z', status: 'Completed' },
      ];

      let filtered = parentEvents;
      if (status) {
        filtered = filtered.filter(e => e.status.toLowerCase() === status.toLowerCase());
      }

      const formatted = filtered.slice(0, limit).map(e => {
        const eventSlots = slots.filter(s => s.eventId === e.id);
        const eventParts = participations.filter(p => p.eventId === e.id);
        const attended = eventParts.filter(p => p.attendanceStatus === 'ATTENDED').length;
        const voted = eventParts.filter(p => p.voteStatus === 'VOTED').length;

        return {
          id: e.id,
          eventName: e.eventName,
          eventType: e.eventType,
          date: e.date,
          status: e.status,
          slots: eventSlots.map(s => ({
            id: s.id,
            slotNumber: s.slotNumber,
            slotName: s.slotName,
            startTime: s.startTime,
          })),
          turnout: {
            totalRegistered: eventParts.length,
            attendedCount: attended,
            votedCount: voted,
            attendanceRate: eventParts.length > 0 ? Math.round((attended / eventParts.length) * 1000) / 10 : 0,
          },
        };
      });

      return { success: true, count: formatted.length, data: formatted };
    } catch (err) {
      console.error('[getEvents ERROR]:', err.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch attendance history records for a member from parent battle ledger
   */
  async getAttendance(memberId = '', eventId = '', limit = 10) {
    try {
      const { participations, slots } = await this.getCachedParentData();
      const slotMap = new Map(slots.map(s => [s.id, s.slotName]));

      const eventNames = {
        'evt-parent-8-bear-trap-2026-10-07': { name: 'Bear Trap #47', date: '2026-10-07' },
        'evt-parent-7-bear-trap-2026-10-05': { name: 'Bear Trap #46', date: '2026-10-05' },
        'evt-parent-6-swordsland-2026-10-04': { name: 'Swordsland War', date: '2026-10-04' },
        'evt-parent-5-bear-trap-2026-10-03': { name: 'Bear Trap #45', date: '2026-10-03' },
        'evt-parent-4-tri-alliance-2026-10-03': { name: 'Tri Alliance Clash', date: '2026-10-03' },
        'evt-parent-3-bear-trap-2026-10-01': { name: 'Bear Trap #44', date: '2026-10-01' },
        'evt-parent-2-bear-trap-2026-09-29': { name: 'Bear Trap #43', date: '2026-09-29' },
        'evt-parent-1-bear-trap-2026-09-27': { name: 'Bear Trap #42', date: '2026-09-27' },
      };

      let filtered = participations;
      if (memberId) filtered = filtered.filter(p => p.memberId === memberId);
      if (eventId) filtered = filtered.filter(p => p.eventId === eventId);

      // Sort recent first
      filtered.reverse();

      const records = filtered.slice(0, limit).map(p => {
        const evt = eventNames[p.eventId] || { name: 'Battle Event', date: p.createdAt };
        return {
          id: p.id,
          eventId: p.eventId,
          eventName: evt.name,
          eventDate: evt.date,
          memberId: p.memberId,
          voteStatus: p.voteStatus,
          votedSlot: p.selectedSlotId ? slotMap.get(p.selectedSlotId) || p.selectedSlotId : null,
          attendanceStatus: p.attendanceStatus,
          attendedSlot: p.attendanceSlotId ? slotMap.get(p.attendanceSlotId) || p.attendanceSlotId : null,
        };
      });

      return { success: true, count: records.length, data: records };
    } catch (err) {
      console.error('[getAttendance ERROR]:', err.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch full roster
   */
  async getAllMembers(status = '') {
    try {
      let query = this.supabase.from('members').select('*').limit(500);
      if (status) query = query.ilike('status', status);
      const { data } = await query;

      const formatted = (data || []).map(row => {
        let gameId = '';
        let cleanNote = row.communication_note || '';
        if (cleanNote) {
          const match = cleanNote.match(/\[GID:([a-zA-Z0-9_-]+)\]/);
          if (match) {
            gameId = match[1];
            cleanNote = cleanNote.replace(/\[GID:[a-zA-Z0-9_-]+\]/, '').trim();
          }
        }
        return {
          id: row.id,
          name: row.name,
          gameId: gameId || null,
          rank: row.current_rank || 'R1',
          strikes: row.strikes || 0,
          status: row.status || 'Active',
          communication: row.communication || 'Good',
          note: cleanNote || null,
        };
      });

      return { success: true, count: formatted.length, data: formatted };
    } catch (err) {
      console.error('[getAllMembers ERROR]:', err.message);
      return { success: false, data: [] };
    }
  }
}

export const crmApi = new CrmApiClient();
