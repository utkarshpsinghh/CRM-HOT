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

    // Fetch members, events, and participations
    const [membersRes, eventsRes, participationsRes] = await Promise.all([
      supabase.from('members').select('id, name, current_rank, status, strikes, communication_note'),
      supabase.from('events').select('id, event_name, event_type, date, status'),
      supabase.from('event_participations').select('event_id, member_id, attendance_status, vote_status'),
    ]);

    if (membersRes.error) {
      return res.status(500).json({ success: false, error: membersRes.error.message });
    }

    // Fetch all attendance records with full pagination
    let allAttendance: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('attendance')
        .select('event_id, member_id, attendance_status, vote_status')
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      allAttendance = allAttendance.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }

    const members = membersRes.data || [];
    const allEvents = eventsRes.data || [];

    // Filter completed or past events
    const completedEvents = allEvents.filter(e => {
      if (e.status === 'Completed') return true;
      if (e.date) {
        const evtTime = new Date(e.date).getTime();
        return !isNaN(evtTime) && evtTime < Date.now();
      }
      return false;
    });

    // Timeframe handling (default: 'month', matching CRM website LeaderboardView)
    const timeframe = req.query?.timeframe === 'all' ? 'all' : 'month';
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let eligibleEvents = completedEvents;
    if (timeframe === 'month') {
      const thisMonthEvents = completedEvents.filter(e => {
        const d = new Date(e.date);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      if (thisMonthEvents.length >= 2) {
        eligibleEvents = thisMonthEvents;
      }
    }

    const eligibleEventIds = new Set(eligibleEvents.map(e => e.id));

    // Combine participations and legacy attendance (participations take priority)
    const participationMap = new Map<string, { attended: boolean; voted: boolean }>();

    allAttendance.forEach(row => {
      if (!eligibleEventIds.has(row.event_id)) return;
      const key = `${row.event_id}_${row.member_id}`;
      const attended = row.attendance_status === 'JOINED' || row.attendance_status === 'ATTENDED';
      const voted = row.vote_status === 'YES' || row.vote_status === 'VOTED';
      participationMap.set(key, { attended, voted });
    });

    (participationsRes.data || []).forEach(row => {
      if (!eligibleEventIds.has(row.event_id)) return;
      const key = `${row.event_id}_${row.member_id}`;
      const attended = row.attendance_status === 'ATTENDED';
      const voted = row.vote_status === 'VOTED';
      participationMap.set(key, { attended, voted });
    });

    const totalEventsCount = eligibleEvents.length;

    const stats = members.map(m => {
      let attendedCount = 0;
      let votedCount = 0;

      for (const evt of eligibleEvents) {
        const record = participationMap.get(`${evt.id}_${m.id}`);
        if (record) {
          if (record.attended) attendedCount++;
          if (record.voted) votedCount++;
        }
      }

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

    // Optional status filter (default excludes Archived)
    const statusFilter = req.query?.status;
    let filtered = stats;
    if (typeof statusFilter === 'string' && statusFilter.trim()) {
      filtered = filtered.filter(s => s.status.toLowerCase() === statusFilter.trim().toLowerCase());
    } else {
      filtered = filtered.filter(s => s.status !== 'Archived');
    }

    // Sorting matching CRM LeaderboardView
    const sortBy = req.query?.sortBy || 'attendanceRate';
    filtered.sort((a, b) => {
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

    // Assign ranking positions
    const ranked = filtered.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

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
