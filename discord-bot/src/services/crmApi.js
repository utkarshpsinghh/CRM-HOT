import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

class CrmApiClient {
  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Internal fetch wrapper calling REST API with x-api-key
   */
  async request(endpoint, queryParams = {}) {
    const url = new URL(`${config.crmBaseUrl}${endpoint}`);
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.append(key, String(val));
      }
    });

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
      let errMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (typeof parsed?.error === 'string') errMsg = parsed.error;
        else if (typeof parsed?.message === 'string') errMsg = parsed.message;
      } catch {
        if (errorText && errorText.length < 150) errMsg = errorText;
      }
      throw new Error(errMsg);
    }

    return await response.json();
  }

  /**
   * Search member by name or Player ID (gameId) with seamless database fallback
   */
  async searchMember(query) {
    if (!query) return null;
    const clean = query.trim();

    // 1. Try REST API first
    try {
      const res = await this.request('/members', { search: clean, limit: 10 });
      if (res && res.data && res.data.length > 0) {
        return res.data[0];
      }
    } catch (apiErr) {
      console.warn(`[CRM API] REST search failed (${apiErr.message}), falling back to direct DB`);
    }

    // 2. Direct Supabase Query (Instant & 100% resilient)
    try {
      const { data, error } = await this.supabase
        .from('members')
        .select('*')
        .or(`name.ilike.%${clean}%,communication_note.ilike.%${clean}%,id.eq.${clean}`)
        .limit(5);

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];
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
        formerRank: row.former_rank || null,
        strikes: row.strikes || 0,
        status: row.status || 'Active',
        communication: row.communication || 'Good',
        note: cleanNote || null,
        updatedAt: row.updated_at,
      };
    } catch (dbErr) {
      console.error('[DB FALLBACK ERROR] searchMember:', dbErr.message);
      return null;
    }
  }

  /**
   * Fetch ranked leaderboard with seamless database fallback
   */
  async getLeaderboard(limit = 10, sortBy = 'attendanceRate') {
    try {
      const res = await this.request('/leaderboard', { limit, sortBy });
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        return res;
      }
    } catch (apiErr) {
      console.warn(`[CRM API] REST leaderboard failed (${apiErr.message}), computing via direct DB`);
    }

    // Direct Supabase Computation
    try {
      const [membersRes, eventsRes, participationsRes, legacyRes] = await Promise.all([
        this.supabase.from('members').select('id, name, current_rank, status, strikes, communication_note'),
        this.supabase.from('events').select('id, event_name, event_type, date, status'),
        this.supabase.from('event_participations').select('event_id, member_id, attendance_status, vote_status'),
        this.supabase.from('attendance').select('event_id, member_id, attendance_status, vote_status'),
      ]);

      const members = (membersRes.data || []).filter(m => m.status !== 'Archived');
      const allEvents = eventsRes.data || [];
      const completedEvents = allEvents.filter(e => {
        if (e.status === 'Completed') return true;
        if (e.date) return new Date(e.date).getTime() < Date.now();
        return false;
      });

      const completedIds = new Set(completedEvents.map(e => e.id));
      const partMap = new Map();

      (legacyRes.data || []).forEach(r => {
        if (!completedIds.has(r.event_id)) return;
        partMap.set(`${r.event_id}_${r.member_id}`, {
          attended: r.attendance_status === 'JOINED' || r.attendance_status === 'ATTENDED',
          voted: r.vote_status === 'YES' || r.vote_status === 'VOTED',
        });
      });

      (participationsRes.data || []).forEach(p => {
        if (!completedIds.has(p.event_id)) return;
        partMap.set(`${p.event_id}_${p.member_id}`, {
          attended: p.attendance_status === 'ATTENDED',
          voted: p.vote_status === 'VOTED',
        });
      });

      const totalCompleted = completedEvents.length;
      const stats = members.map(m => {
        let attended = 0;
        let voted = 0;
        for (const evt of completedEvents) {
          const r = partMap.get(`${evt.id}_${m.id}`);
          if (r) {
            if (r.attended) attended++;
            if (r.voted) voted++;
          }
        }
        const attendanceRate = totalCompleted > 0 ? Math.round((attended / totalCompleted) * 1000) / 10 : 0;
        const voteRate = totalCompleted > 0 ? Math.round((voted / totalCompleted) * 1000) / 10 : 0;
        const reliabilityScore = Math.round((attendanceRate * 0.7 + voteRate * 0.3) * 10) / 10;

        return {
          memberId: m.id,
          name: m.name,
          allianceRank: m.current_rank || 'R1',
          status: m.status || 'Active',
          totalEvents: totalCompleted,
          attendedCount: attended,
          missedCount: Math.max(0, totalCompleted - attended),
          attendanceRate,
          reliabilityScore,
          strikes: m.strikes || 0,
        };
      });

      stats.sort((a, b) => {
        if (sortBy === 'attended') return b.attendedCount - a.attendedCount || b.attendanceRate - a.attendanceRate;
        return b.attendanceRate - a.attendanceRate || b.attendedCount - a.attendedCount;
      });

      const ranked = stats.map((item, idx) => ({ rank: idx + 1, ...item })).slice(0, limit);

      return {
        success: true,
        count: ranked.length,
        total: stats.length,
        totalCompletedEvents: totalCompleted,
        data: ranked,
      };
    } catch (dbErr) {
      console.error('[DB FALLBACK ERROR] getLeaderboard:', dbErr.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch battle events with database fallback
   */
  async getEvents(status = '', limit = 10) {
    try {
      const res = await this.request('/events', { status, limit });
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        return res;
      }
    } catch (apiErr) {
      console.warn(`[CRM API] REST getEvents failed (${apiErr.message}), querying direct DB`);
    }

    try {
      let query = this.supabase
        .from('events')
        .select('id, event_name, event_type, date, status, notes, created_at')
        .order('date', { ascending: false })
        .limit(limit);

      if (status) query = query.ilike('status', status);

      const { data: events, error } = await query;
      if (error) throw error;

      const eventIds = (events || []).map(e => e.id);
      let slotsByEvent = {};

      if (eventIds.length > 0) {
        const { data: slots } = await this.supabase
          .from('event_slots')
          .select('*')
          .in('event_id', eventIds);

        (slots || []).forEach(s => {
          if (!slotsByEvent[s.event_id]) slotsByEvent[s.event_id] = [];
          slotsByEvent[s.event_id].push({
            id: s.id,
            slotNumber: s.slot_number,
            slotName: s.slot_name,
            startTime: s.start_time,
          });
        });
      }

      const formatted = (events || []).map(e => ({
        id: e.id,
        eventName: e.event_name,
        eventType: e.event_type,
        date: e.date,
        status: e.status,
        notes: e.notes || null,
        slots: slotsByEvent[e.id] || [],
      }));

      return { success: true, count: formatted.length, data: formatted };
    } catch (dbErr) {
      console.error('[DB FALLBACK ERROR] getEvents:', dbErr.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch attendance history records for a member with database fallback
   */
  async getAttendance(memberId = '', eventId = '', limit = 10) {
    try {
      const res = await this.request('/attendance', { memberId, eventId, limit });
      if (res && Array.isArray(res.data)) {
        return res;
      }
    } catch (apiErr) {
      console.warn(`[CRM API] REST getAttendance failed (${apiErr.message}), querying direct DB`);
    }

    try {
      const [eventsRes, slotsRes] = await Promise.all([
        this.supabase.from('events').select('id, event_name, event_type, date'),
        this.supabase.from('event_slots').select('id, slot_number, slot_name'),
      ]);

      const eventMap = new Map((eventsRes.data || []).map(e => [e.id, e]));
      const slotMap = new Map((slotsRes.data || []).map(s => [s.id, s.slot_name]));

      let query = this.supabase
        .from('event_participations')
        .select('*')
        .limit(limit);

      if (memberId) query = query.eq('member_id', memberId);
      if (eventId) query = query.eq('event_id', eventId);

      const { data: parts } = await query;

      if (parts && parts.length > 0) {
        const records = parts.map(p => {
          const evt = eventMap.get(p.event_id);
          return {
            id: p.id,
            eventId: p.event_id,
            eventName: evt?.event_name || evt?.event_type || 'Battle Event',
            eventDate: evt?.date || null,
            memberId: p.member_id,
            voteStatus: p.vote_status,
            votedSlot: p.selected_slot_id ? slotMap.get(p.selected_slot_id) || p.selected_slot_id : null,
            attendanceStatus: p.attendance_status,
            attendedSlot: p.attendance_slot_id ? slotMap.get(p.attendance_slot_id) || p.attendance_slot_id : null,
          };
        });
        return { success: true, count: records.length, data: records };
      }

      // Fallback to legacy attendance
      let legQuery = this.supabase.from('attendance').select('*').limit(limit);
      if (memberId) legQuery = legQuery.eq('member_id', memberId);
      if (eventId) legQuery = legQuery.eq('event_id', eventId);
      const { data: legacy } = await legQuery;

      const records = (legacy || []).map(r => {
        const evt = eventMap.get(r.event_id);
        const isAttended = r.attendance_status === 'JOINED' || r.attendance_status === 'ATTENDED';
        return {
          id: r.id,
          eventId: r.event_id,
          eventName: evt?.event_name || evt?.event_type || 'Battle Event',
          eventDate: evt?.date || null,
          memberId: r.member_id,
          voteStatus: r.vote_status === 'YES' ? 'VOTED' : 'NO_VOTE',
          votedSlot: null,
          attendanceStatus: isAttended ? 'ATTENDED' : 'ABSENT',
          attendedSlot: null,
        };
      });

      return { success: true, count: records.length, data: records };
    } catch (dbErr) {
      console.error('[DB FALLBACK ERROR] getAttendance:', dbErr.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch full roster to compute statistics or detect inactives
   */
  async getAllMembers(status = '') {
    try {
      const res = await this.request('/members', { status, limit: 500 });
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        return res;
      }
    } catch {}

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
      console.error('[DB FALLBACK ERROR] getAllMembers:', err.message);
      return { success: false, data: [] };
    }
  }
}

export const crmApi = new CrmApiClient();
