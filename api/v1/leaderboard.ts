import { getSupabase, handleCors, validateApiKey } from '../_lib';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  const isValid = await validateApiKey(req, res, 'leaderboard');
  if (!isValid) return;

  try {
    const supabase = getSupabase();

    // Fetch members, completed events, and participations concurrently
    const [membersRes, eventsRes, participationsRes, legacyAttendanceRes] = await Promise.all([
      supabase.from('members').select('id, name, current_rank, status, strikes, communication_note'),
      supabase.from('events').select('id, event_name, event_type, date, status'),
      supabase.from('event_participations').select('event_id, member_id, attendance_status, vote_status'),
      supabase.from('attendance').select('event_id, member_id, attendance_status, vote_status'),
    ]);

    if (membersRes.error) {
      return res.status(500).json({ success: false, error: membersRes.error.message });
    }

    const members = membersRes.data || [];
    const allEvents = eventsRes.data || [];
    // Only count completed events or past scheduled events
    const completedEvents = allEvents.filter(e => {
      if (e.status === 'Completed') return true;
      if (e.date) {
        const evtTime = new Date(e.date).getTime();
        return !isNaN(evtTime) && evtTime < Date.now();
      }
      return false;
    });

    const completedEventIds = new Set(completedEvents.map(e => e.id));

    // Combine participations and legacy attendance (participations take priority)
    const participationMap = new Map<string, { attended: boolean; voted: boolean }>();

    // Process legacy attendance rows
    (legacyAttendanceRes.data || []).forEach(row => {
      if (!completedEventIds.has(row.event_id)) return;
      const key = `${row.event_id}_${row.member_id}`;
      const attended = row.attendance_status === 'JOINED' || row.attendance_status === 'ATTENDED';
      const voted = row.vote_status === 'YES' || row.vote_status === 'VOTED';
      participationMap.set(key, { attended, voted });
    });

    // Override with modern participations if present
    (participationsRes.data || []).forEach(row => {
      if (!completedEventIds.has(row.event_id)) return;
      const key = `${row.event_id}_${row.member_id}`;
      const attended = row.attendance_status === 'ATTENDED';
      const voted = row.vote_status === 'VOTED';
      participationMap.set(key, { attended, voted });
    });

    // Build member stats
    const totalEventsCount = completedEvents.length;

    const stats = members.map(m => {
      let attendedCount = 0;
      let votedCount = 0;

      for (const evt of completedEvents) {
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
        reliabilityScore,
        strikes: m.strikes || 0,
      };
    });

    // Optional status filter (default excludes Archived unless specified)
    const statusFilter = req.query?.status;
    let filtered = stats;
    if (typeof statusFilter === 'string' && statusFilter.trim()) {
      filtered = filtered.filter(s => s.status.toLowerCase() === statusFilter.trim().toLowerCase());
    } else {
      filtered = filtered.filter(s => s.status !== 'Archived');
    }

    // Sorting
    const sortBy = req.query?.sortBy || 'attendanceRate';
    filtered.sort((a, b) => {
      if (sortBy === 'attended') {
        return b.attendedCount - a.attendedCount || b.attendanceRate - a.attendanceRate;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // Default: attendanceRate descending, then attendedCount, then name
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }
      if (b.attendedCount !== a.attendedCount) {
        return b.attendedCount - a.attendedCount;
      }
      return a.name.localeCompare(b.name);
    });

    // Assign ranking positions
    const ranked = filtered.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 100, 1), 500);
    const paginated = ranked.slice(0, limit);

    return res.status(200).json({
      success: true,
      count: paginated.length,
      total: ranked.length,
      totalCompletedEvents: totalEventsCount,
      limit,
      data: paginated,
    });
  } catch (err: any) {
    console.error('API /v1/leaderboard error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error computing leaderboard.' });
  }
}
