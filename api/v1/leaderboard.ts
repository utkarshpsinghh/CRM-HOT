import { getSupabase, handleCors, validateApiKey } from '../_lib.ts';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  const isValid = await validateApiKey(req, res, 'leaderboard');
  if (!isValid) return;

  try {
    const supabase = getSupabase();

    // Fetch members, settings cache, and dynamic events
    const [membersRes, settingsRes, dbEventsRes] = await Promise.all([
      supabase
        .from('members')
        .select('id, name, current_rank, status, strikes, communication_note, created_at')
        .neq('status', 'Archived')
        .order('created_at', { ascending: false }),
      supabase.from('settings').select('*').in('key', ['crm_event_participations_cache']),
      supabase.from('events').select('id, event_name, event_type, date, status'),
    ]);

    if (membersRes.error) {
      return res.status(500).json({ success: false, error: membersRes.error.message });
    }

    const members = membersRes.data || [];

    // Parse participations from verified cache
    let participations: any[] = [];
    (settingsRes.data || []).forEach(r => {
      if (r.key === 'crm_event_participations_cache') {
        try { participations = JSON.parse(r.value); } catch {}
      }
    });

    // Canonical 8 parent battle events (each cycle has dual slots BT1/BT2, but is 1 event)
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

    // Timeframe handling: 'month' (October 2026 -> 6 events) or 'all' (8 events in total)
    const timeframe = req.query?.timeframe === 'all' ? 'all' : 'month';
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
    const sortBy = req.query?.sortBy || 'attendanceRate';
    stats.sort((a, b) => {
      if (sortBy === 'attended') {
        return b.attendedCount - a.attendedCount || b.attendanceRate - a.attendanceRate;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
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
    const limit = parseInt(req.query?.limit, 10);
    const finalData = (!isNaN(limit) && limit > 0) ? ranked.slice(0, limit) : ranked;

    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    res.status(200).json({
      success: true,
      timeframe,
      timeframeLabel: timeframe === 'month' ? `This Month (${monthLabel})` : 'All-Time',
      totalCompletedEvents: totalEventsCount,
      count: finalData.length,
      total: stats.length,
      data: finalData,
    });
  } catch (error: any) {
    console.error('API /v1/leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
