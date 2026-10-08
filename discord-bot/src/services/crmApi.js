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
    let clean = query.trim();
    // Strip alliance tag e.g. [HOT]Sage or HOT Sage
    const tagStripped = clean.replace(/^\[.*?\]\s*/, '').replace(/^HOT\s+/i, '').trim();
    if (tagStripped) clean = tagStripped;
    const sanitized = clean.replace(/[,%()\[\]]/g, '').trim();
    if (!sanitized) return null;

    try {
      const { data: members, error } = await this.supabase
        .from('members')
        .select('*')
        .or(`name.ilike.%${sanitized}%,communication_note.ilike.%${sanitized}%,id.eq.${sanitized}`)
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
  /**
   * Fetch ranked leaderboard matching the CRM website calculation and date filters exactly
   * 6 events occurred in October, 8 events in total overall
   */
  async getLeaderboard(limit = 10, sortBy = 'attendanceRate', timeframe = 'month') {
    try {
      const [membersRes, settingsRes, dbEventsRes] = await Promise.all([
        this.supabase
          .from('members')
          .select('id, name, current_rank, status, strikes, communication_note')
          .neq('status', 'Archived'),
        this.supabase
          .from('settings')
          .select('*')
          .in('key', ['crm_event_participations_cache']),
        this.supabase
          .from('events')
          .select('id, event_name, event_type, date, status'),
      ]);

      const members = membersRes.data || [];

      // Parse verified participations
      let participations = [];
      (settingsRes.data || []).forEach(r => {
        if (r.key === 'crm_event_participations_cache') {
          try { participations = JSON.parse(r.value); } catch {}
        }
      });

      // Canonical 8 parent battle events (2 in Sep, 6 in Oct)
      const parentEvents = [
        { id: 'evt-parent-8-bear-trap-2026-10-07', eventName: 'Bear Trap #47', eventType: 'Bear Trap', date: '2026-10-07T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-7-bear-trap-2026-10-05', eventName: 'Bear Trap #46', eventType: 'Bear Trap', date: '2026-10-05T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-6-swordsland-2026-10-04', eventName: 'Swordsland War', eventType: 'Swordsland', date: '2026-10-04T02:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-5-bear-trap-2026-10-03', eventName: 'Bear Trap #45', eventType: 'Bear Trap', date: '2026-10-03T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-4-tri-alliance-2026-10-03', eventName: 'Tri Alliance Clash', eventType: 'Tri Alliance', date: '2026-10-03T02:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-3-bear-trap-2026-10-01', eventName: 'Bear Trap #44', eventType: 'Bear Trap', date: '2026-10-01T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-2-bear-trap-2026-09-29', eventName: 'Bear Trap #43', eventType: 'Bear Trap', date: '2026-09-29T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-1-bear-trap-2026-09-27', eventName: 'Bear Trap #42', eventType: 'Bear Trap', date: '2026-09-27T16:00:00.000Z', status: 'Completed' },
      ];

      const legacyChildIds = new Set([
        'evt-185df6f0', 'evt-c233df90', 'evt-b7b108e7', 'evt-a7c586d3', 'evt-6f6a9d3a',
        'evt-61922e28', 'evt-c031d684', 'evt-f9234e34', 'evt-4eee1101', 'evt-e4448cc6',
        'evt-6f769167', 'evt-d9a52459', 'evt-de673b18', 'evt-41fb9613',
        'evt-1791372900265-foen', 'evt-1791369322863-f6fw',
      ]);

      const dynamicCompleted = (dbEventsRes.data || []).filter(e => {
        if (legacyChildIds.has(e.id)) return false;
        if (e.status === 'Completed') return true;
        if (e.date) {
          const t = new Date(e.date).getTime();
          return !isNaN(t) && t < Date.now();
        }
        return false;
      });

      const allCanonicalEvents = [...dynamicCompleted, ...parentEvents];

      // Timeframe filter: 'month' (October 2026 -> 6 events) or 'all' (8 events in total)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let eligibleEvents = allCanonicalEvents;
      if (timeframe === 'month') {
        const thisMonthEvents = allCanonicalEvents.filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        if (thisMonthEvents.length >= 2) {
          eligibleEvents = thisMonthEvents;
        }
      }

      const eligibleEventIds = new Set(eligibleEvents.map(e => e.id));
      const totalEventsCount = eligibleEvents.length;

      const stats = members.map(m => {
        const mParts = participations.filter(p => p.memberId === m.id && eligibleEventIds.has(p.eventId));
        const attendedCount = mParts.filter(p => p.attendanceStatus === 'ATTENDED').length;
        const votedCount = mParts.filter(p => p.voteStatus === 'VOTED').length;

        const attendanceRate = totalEventsCount > 0
          ? Math.round((attendedCount / totalEventsCount) * 1000) / 10
          : 0;

        const voteRate = totalEventsCount > 0
          ? Math.round((votedCount / totalEventsCount) * 1000) / 10
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
          totalEvents: totalEventsCount,
          attendedCount,
          missedCount: Math.max(0, totalEventsCount - attendedCount),
          attendanceRate,
          voteRate,
          reliabilityScore,
          strikes: m.strikes || 0,
        };
      });

      // Sorting matching CRM LeaderboardView
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
        if (b.voteRate !== a.voteRate) {
          return b.voteRate - a.voteRate;
        }
        return (a.strikes || 0) - (b.strikes || 0);
      });

      const ranked = stats.map((item, idx) => ({ rank: idx + 1, ...item }));
      const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      return {
        success: true,
        timeframe,
        timeframeLabel: timeframe === 'month' ? `This Month (${monthLabel})` : 'All-Time',
        count: limit ? Math.min(limit, ranked.length) : ranked.length,
        total: stats.length,
        totalCompletedEvents: totalEventsCount,
        data: limit ? ranked.slice(0, limit) : ranked,
      };
    } catch (err) {
      console.error('[getLeaderboard ERROR]:', err.message);
      return { success: false, data: [] };
    }
  }

  /**
   * Fetch battle events with dual slot details (BT1 & BT2), integrating real-time events from Supabase
   */
  async getEvents(status = '', limit = 10) {
    try {
      const [{ participations, slots }, dbEventsRes] = await Promise.all([
        this.getCachedParentData(),
        this.supabase
          .from('events')
          .select('*')
          .order('date', { ascending: false }),
      ]);

      const dbEvents = dbEventsRes.data || [];

      // Historical parent battle definitions matching the CRM
      const parentEvents = [
        { id: 'evt-parent-8-bear-trap-2026-10-07', eventName: 'Bear Trap #47', eventType: 'Bear Trap', date: '2026-10-07T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-7-bear-trap-2026-10-05', eventName: 'Bear Trap #46', eventType: 'Bear Trap', date: '2026-10-05T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-6-swordsland-2026-10-04', eventName: 'Swordsland War', eventType: 'Swordsland', date: '2026-10-04T02:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-5-bear-trap-2026-10-03', eventName: 'Bear Trap #45', eventType: 'Bear Trap', date: '2026-10-03T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-4-tri-alliance-2026-10-03', eventName: 'Tri Alliance Clash', eventType: 'Tri Alliance', date: '2026-10-03T02:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-3-bear-trap-2026-10-01', eventName: 'Bear Trap #44', eventType: 'Bear Trap', date: '2026-10-01T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-2-bear-trap-2026-09-29', eventName: 'Bear Trap #43', eventType: 'Bear Trap', date: '2026-09-29T16:00:00.000Z', status: 'Completed' },
        { id: 'evt-parent-1-bear-trap-2026-09-27', eventName: 'Bear Trap #42', eventType: 'Bear Trap', date: '2026-09-27T16:00:00.000Z', status: 'Completed' },
      ];

      // Known legacy child event IDs from the original dual-event migration
      const legacyChildIds = new Set([
        'evt-185df6f0', 'evt-c233df90', 'evt-b7b108e7', 'evt-a7c586d3', 'evt-6f6a9d3a',
        'evt-61922e28', 'evt-c031d684', 'evt-f9234e34', 'evt-4eee1101', 'evt-e4448cc6',
        'evt-6f769167', 'evt-d9a52459', 'evt-de673b18', 'evt-41fb9613',
        'evt-1791372900265-foen', 'evt-1791369322863-f6fw',
      ]);

      const dynamicEvents = [];
      let slotsUpdated = false;
      const allSlots = [...slots];

      // Helper to generate BT1 (16:00 UTC) and BT2 (00:30 UTC next day) slots
      const getSlotsForBearTrap = (event) => {
        const eventDate = new Date(event.date);
        const bt1Date = new Date(eventDate);
        bt1Date.setUTCHours(16, 0, 0, 0);

        const bt2Date = new Date(bt1Date);
        bt2Date.setUTCDate(bt2Date.getUTCDate() + 1);
        bt2Date.setUTCHours(0, 30, 0, 0);

        const formatUtc = (d) => {
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          const hours = String(d.getUTCHours()).padStart(2, '0');
          const minutes = String(d.getUTCMinutes()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
        };

        return [
          {
            id: `slot-${event.id}-1`,
            eventId: event.id,
            slotNumber: 1,
            slotName: 'BT1',
            startTime: formatUtc(bt1Date),
            createdAt: event.created_at || new Date().toISOString(),
          },
          {
            id: `slot-${event.id}-2`,
            eventId: event.id,
            slotNumber: 2,
            slotName: 'BT2',
            startTime: formatUtc(bt2Date),
            createdAt: event.created_at || new Date().toISOString(),
          },
        ];
      };

      for (const row of dbEvents) {
        if (legacyChildIds.has(row.id)) continue;

        const isBearTrap =
          row.event_type === 'Bear Trap' ||
          (row.event_name && row.event_name.toLowerCase().includes('bear')) ||
          (row.type && row.type.toLowerCase().includes('bear'));

        const eventType = isBearTrap ? 'Bear Trap' : (row.event_type || 'Custom Event');
        let eventName = row.event_name || row.name || 'Alliance Event';

        // Auto-assign numbering if named generically "Bear Trap"
        if (eventName.toLowerCase() === 'bear trap') {
          eventName = 'Bear Trap #48';
        }

        let eventSlots = allSlots.filter(s => s.eventId === row.id);
        if (isBearTrap && eventSlots.length === 0) {
          const generated = getSlotsForBearTrap(row);
          eventSlots = generated;
          allSlots.push(...generated);
          slotsUpdated = true;
        }

        let eventStatus = row.status || 'Scheduled';
        if (eventStatus === 'Scheduled') {
          const s2 = eventSlots.find(s => s.slotNumber === 2);
          const d2 = s2?.startTime ? new Date(s2.startTime) : new Date(row.date);
          if (!isNaN(d2.getTime()) && d2.getTime() < Date.now()) {
            eventStatus = 'Completed';
          }
        }

        dynamicEvents.push({
          id: row.id,
          eventName,
          eventType,
          date: row.date,
          status: eventStatus,
          slots: eventSlots,
        });
      }

      if (slotsUpdated) {
        try {
          await this.supabase
            .from('settings')
            .upsert({ key: 'crm_event_slots_cache', value: JSON.stringify(allSlots) }, { onConflict: 'key' });
        } catch (err) {
          console.warn('[CRM SLOTS UPSERT ERROR]:', err.message);
        }
      }

      // Merge dynamic events with historical events (newest first)
      const allEvents = [...dynamicEvents, ...parentEvents];

      let filtered = allEvents;
      if (status) {
        filtered = filtered.filter(e => e.status.toLowerCase() === status.toLowerCase());
      }

      const formatted = filtered.slice(0, limit).map(e => {
        const eventSlots = (e.slots && e.slots.length > 0)
          ? e.slots
          : allSlots.filter(s => s.eventId === e.id);

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
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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
   * Fetch full roster (all 80 active/non-archived alliance members)
   */
  async getAllMembers(status = '') {
    try {
      let query = this.supabase.from('members').select('*').limit(500);
      if (status) {
        query = query.ilike('status', status);
      } else {
        query = query.neq('status', 'Archived');
      }
      const { data } = await query;

      // Deduplicate by name (handling any double-entry rows)
      const seen = new Map();
      for (const row of (data || [])) {
        if (!row || !row.name) continue;
        const key = row.name.trim().toLowerCase();
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, row);
        } else {
          // Keep the row that has communication_note (Game ID) or recent timestamp
          if (row.communication_note && !existing.communication_note) {
            seen.set(key, row);
          }
        }
      }

      const formatted = Array.from(seen.values()).map(row => {
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

  /**
   * Generic key-value store in Supabase settings table
   */
  async getSetting(key, defaultValue = null) {
    try {
      const { data } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
      if (!data || !data.value) return defaultValue;
      try { return JSON.parse(data.value); } catch { return data.value; }
    } catch {
      return defaultValue;
    }
  }

  async setSetting(key, val) {
    try {
      const value = typeof val === 'string' ? val : JSON.stringify(val);
      await this.supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });
      return true;
    } catch (err) {
      console.error('[setSetting ERROR]:', err.message);
      return false;
    }
  }

  /**
   * Link Discord user ID to an Alliance Member
   */
  async linkDiscordUser(discordUserId, member, screenshotUrl = null) {
    try {
      const { data } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', 'discord_member_links')
        .single();

      let links = {};
      if (data && data.value) {
        try { links = JSON.parse(data.value); } catch {}
      }

      // Check if this member or gameId is ALREADY linked to another Discord user
      const existingDiscordId = Object.keys(links).find(dId => {
        if (dId === discordUserId) return false;
        const link = links[dId];
        if (!link) return false;
        const sameMemberId = link.memberId === member.id;
        const sameGameId = member.gameId && link.gameId && String(link.gameId).trim() === String(member.gameId).trim();
        return sameMemberId || sameGameId;
      });

      if (existingDiscordId) {
        return {
          success: false,
          alreadyBound: true,
          existingDiscordId,
          message: `Governor **${member.name}** (ID: \`${member.gameId || 'N/A'}\`) is already linked to another Discord user (<@${existingDiscordId}>).\n\nTo prevent account duplication, each in-game identity can only be bound to one Discord account. If this is an error, please ask an Alliance Officer to unlink it.`,
        };
      }

      links[discordUserId] = {
        memberId: member.id,
        memberName: member.name,
        gameId: member.gameId,
        screenshotUrl: screenshotUrl || null,
        linkedAt: new Date().toISOString(),
      };

      await this.supabase
        .from('settings')
        .upsert({ key: 'discord_member_links', value: JSON.stringify(links) }, { onConflict: 'key' });

      return { success: true };
    } catch (err) {
      console.error('[linkDiscordUser ERROR]:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Cast a slot vote for an event and directly sync it into the attendance ledger
   */
  async castVote(memberId, eventId, slotId) {
    try {
      const now = new Date().toISOString();

      const legacyPairs = {
        'evt-parent-8-bear-trap-2026-10-07': {
          slot1LegacyId: 'evt-1791372900265-foen', // BT1
          slot2LegacyId: 'evt-1791369322863-f6fw', // BT2
        },
        'evt-parent-7-bear-trap-2026-10-05': {
          slot1LegacyId: 'evt-4eee1101',
          slot2LegacyId: 'evt-e4448cc6',
        },
        'evt-parent-5-bear-trap-2026-10-03': {
          slot1LegacyId: 'evt-c031d684',
          slot2LegacyId: 'evt-f9234e34',
        },
        'evt-parent-3-bear-trap-2026-10-01': {
          slot1LegacyId: 'evt-6f6a9d3a',
          slot2LegacyId: 'evt-61922e28',
        },
        'evt-parent-2-bear-trap-2026-09-29': {
          slot1LegacyId: 'evt-b7b108e7',
          slot2LegacyId: 'evt-a7c586d3',
        },
        'evt-parent-1-bear-trap-2026-09-27': {
          slot1LegacyId: 'evt-185df6f0',
          slot2LegacyId: 'evt-c233df90',
        },
      };

      const legacyPair = legacyPairs[eventId] || {
        slot1LegacyId: 'evt-1791372900265-foen',
        slot2LegacyId: 'evt-1791369322863-f6fw',
      };

      const isBt1 = slotId.endsWith('-1');

      // 1. Dual-write to Supabase attendance table
      if (eventId.startsWith('evt-parent-')) {
        const votedLegacyId = isBt1 ? legacyPair.slot1LegacyId : legacyPair.slot2LegacyId;
        const otherLegacyId = isBt1 ? legacyPair.slot2LegacyId : legacyPair.slot1LegacyId;

        if (votedLegacyId) {
          await this.supabase.from('attendance').upsert({
            id: `att-${votedLegacyId}-${memberId}`,
            event_id: votedLegacyId,
            member_id: memberId,
            vote_status: 'YES',
            attendance_status: 'NOT_APPLICABLE',
            updated_at: now,
          }, { onConflict: 'id' });
        }

        if (otherLegacyId) {
          await this.supabase.from('attendance').upsert({
            id: `att-${otherLegacyId}-${memberId}`,
            event_id: otherLegacyId,
            member_id: memberId,
            vote_status: 'NO RESPONSE',
            attendance_status: 'NOT_APPLICABLE',
            updated_at: now,
          }, { onConflict: 'id' });
        }
      } else {
        // Direct dynamic event created in CRM
        await this.supabase.from('attendance').upsert({
          id: `att-${eventId}-${memberId}`,
          event_id: eventId,
          member_id: memberId,
          vote_status: isBt1 ? 'YES' : 'NO RESPONSE',
          attendance_status: 'NOT_APPLICABLE',
          updated_at: now,
        }, { onConflict: 'id' });
      }

      // 2. Dual-write to crm_event_participations_cache in settings table
      const { data: cacheRow } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', 'crm_event_participations_cache')
        .single();

      let participations = [];
      if (cacheRow && cacheRow.value) {
        try { participations = JSON.parse(cacheRow.value); } catch {}
      }

      let found = false;
      for (let i = 0; i < participations.length; i++) {
        const p = participations[i];
        if (p.eventId === eventId && p.memberId === memberId) {
          p.voteStatus = 'VOTED';
          p.selectedSlotId = slotId;
          p.updatedAt = now;
          found = true;
          break;
        }
      }

      if (!found) {
        participations.push({
          id: `part-${eventId}-${memberId}`,
          eventId,
          memberId,
          selectedSlotId: slotId,
          voteStatus: 'VOTED',
          attendanceStatus: 'NOT_MARKED',
          attendanceSlotId: null,
          penaltyStatus: 'NONE',
          penaltyNote: null,
          createdAt: now,
          updatedAt: now,
        });
      }

      await this.supabase
        .from('settings')
        .upsert({ key: 'crm_event_participations_cache', value: JSON.stringify(participations) }, { onConflict: 'key' });

      return { success: true };
    } catch (err) {
      console.error('[castVote ERROR]:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Unlink Discord user ID from an Alliance Member
   */
  async unlinkDiscordUser(discordUserId) {
    try {
      const { data } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', 'discord_member_links')
        .single();

      if (!data || !data.value) return { success: false, message: 'No links found.' };

      let links = {};
      try { links = JSON.parse(data.value); } catch {}

      const existing = links[discordUserId];
      if (!existing) {
        return { success: false, message: 'Account is not currently linked to any in-game profile.' };
      }

      delete links[discordUserId];

      await this.supabase
        .from('settings')
        .upsert({ key: 'discord_member_links', value: JSON.stringify(links) }, { onConflict: 'key' });

      return {
        success: true,
        memberName: existing.memberName || 'Warrior',
        gameId: existing.gameId,
      };
    } catch (err) {
      console.error('[unlinkDiscordUser ERROR]:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Retrieve member linked to a Discord user ID
   */
  async getLinkedMember(discordUserId) {
    try {
      const { data } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', 'discord_member_links')
        .single();

      if (!data || !data.value) return null;
      const links = JSON.parse(data.value);
      const link = links[discordUserId];
      if (!link || !link.memberId) return null;

      return await this.searchMember(link.memberId);
    } catch (err) {
      console.error('[getLinkedMember ERROR]:', err.message);
      return null;
    }
  }

  /**
   * Issue a strike to a player (Officer action)
   */
  async addStrike(memberId, reason, officerName = 'Officer') {
    try {
      // 1. Fetch current member strikes
      const { data: member } = await this.supabase
        .from('members')
        .select('id, name, strikes')
        .eq('id', memberId)
        .single();

      if (!member) return { success: false, message: 'Member not found.' };

      const newStrikeCount = (member.strikes || 0) + 1;

      // 2. Insert into strikes table
      const strikeId = `strk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await this.supabase.from('strikes').insert({
        id: strikeId,
        member_id: memberId,
        reason: reason || 'Alliance violation',
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // 3. Update members table
      await this.supabase
        .from('members')
        .update({ strikes: newStrikeCount, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      // 4. Log officer contribution
      try {
        await this.supabase.from('contributions').insert({
          id: `cnt-${Date.now()}`,
          admin_id: 'discord-bot',
          admin_username: officerName.toLowerCase().replace(/\s+/g, '_'),
          admin_name: officerName,
          admin_role: 'SubAdmin',
          action: 'STRIKE_ADDED',
          description: `Issued penalty strike to ${member.name}: ${reason}`,
          target_name: member.name,
          count: 1,
          timestamp: new Date().toISOString(),
        });
      } catch {}

      return {
        success: true,
        memberName: member.name,
        newStrikes: newStrikeCount,
      };
    } catch (err) {
      console.error('[addStrike ERROR]:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Remove a strike from a player (Officer action)
   */
  async removeStrike(memberId, officerName = 'Officer') {
    try {
      const { data: member } = await this.supabase
        .from('members')
        .select('id, name, strikes')
        .eq('id', memberId)
        .single();

      if (!member) return { success: false, message: 'Member not found.' };

      const currentStrikes = member.strikes || 0;
      if (currentStrikes <= 0) {
        return { success: false, message: `${member.name} has 0 strikes.` };
      }

      const newStrikeCount = Math.max(0, currentStrikes - 1);

      // Delete latest strike record
      const { data: latestStrike } = await this.supabase
        .from('strikes')
        .select('id')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestStrike && latestStrike.length > 0) {
        await this.supabase.from('strikes').delete().eq('id', latestStrike[0].id);
      }

      await this.supabase
        .from('members')
        .update({ strikes: newStrikeCount, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      // Log officer contribution
      try {
        await this.supabase.from('contributions').insert({
          id: `cnt-${Date.now()}`,
          admin_id: 'discord-bot',
          admin_username: officerName.toLowerCase().replace(/\s+/g, '_'),
          admin_name: officerName,
          admin_role: 'SubAdmin',
          action: 'STRIKE_REMOVED',
          description: `Removed penalty strike from ${member.name}`,
          target_name: member.name,
          count: 1,
          timestamp: new Date().toISOString(),
        });
      } catch {}

      return {
        success: true,
        memberName: member.name,
        newStrikes: newStrikeCount,
      };
    } catch (err) {
      console.error('[removeStrike ERROR]:', err.message);
      return { success: false, message: err.message };
    }
  }
}

export const crmApi = new CrmApiClient();
