import { getSupabase, handleCors, validateApiKey } from '../_lib.ts';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  const isValid = await validateApiKey(req, res, 'events');
  if (!isValid) return;

  try {
    const supabase = getSupabase();

    let query = supabase
      .from('events')
      .select('id, event_name, event_type, date, status, notes, created_at');

    const statusParam = req.query?.status;
    if (typeof statusParam === 'string' && statusParam.trim()) {
      query = query.ilike('status', statusParam.trim());
    }

    const typeParam = req.query?.type || req.query?.eventType;
    if (typeof typeParam === 'string' && typeParam.trim()) {
      query = query.ilike('event_type', `%${typeParam.trim()}%`);
    }

    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 50, 1), 200);
    query = query.order('date', { ascending: false }).limit(limit);

    const { data: events, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Fetch slots and participations to augment events with turnout metrics
    const eventIds = (events || []).map(e => e.id);
    let slotsByEvent: Record<string, any[]> = {};
    let participationsByEvent: Record<string, any[]> = {};

    if (eventIds.length > 0) {
      const [slotsRes, partsRes, legacyAttRes] = await Promise.all([
        supabase.from('event_slots').select('*').in('event_id', eventIds),
        supabase.from('event_participations').select('*').in('event_id', eventIds),
        supabase.from('attendance').select('*').in('event_id', eventIds),
      ]);

      (slotsRes.data || []).forEach(s => {
        if (!slotsByEvent[s.event_id]) slotsByEvent[s.event_id] = [];
        slotsByEvent[s.event_id].push({
          id: s.id,
          slotNumber: s.slot_number,
          slotName: s.slot_name,
          startTime: s.start_time,
        });
      });

      // Group participations (modern participations take priority)
      (legacyAttRes.data || []).forEach(r => {
        if (!participationsByEvent[r.event_id]) participationsByEvent[r.event_id] = [];
        participationsByEvent[r.event_id].push({
          attended: r.attendance_status === 'JOINED' || r.attendance_status === 'ATTENDED',
          voted: r.vote_status === 'YES' || r.vote_status === 'VOTED',
        });
      });

      (partsRes.data || []).forEach(p => {
        if (!participationsByEvent[p.event_id]) participationsByEvent[p.event_id] = [];
        participationsByEvent[p.event_id].push({
          attended: p.attendance_status === 'ATTENDED',
          voted: p.vote_status === 'VOTED',
        });
      });
    }

    const formatted = (events || []).map(e => {
      const parts = participationsByEvent[e.id] || [];
      const totalParticipants = parts.length;
      const attendedCount = parts.filter(p => p.attended).length;
      const votedCount = parts.filter(p => p.voted).length;
      const attendanceRate = totalParticipants > 0
        ? Math.round((attendedCount / totalParticipants) * 1000) / 10
        : 0;

      return {
        id: e.id,
        eventName: e.event_name,
        eventType: e.event_type,
        date: e.date,
        status: e.status,
        notes: e.notes || null,
        slots: slotsByEvent[e.id] || [],
        turnout: {
          totalRegistered: totalParticipants,
          votedCount,
          attendedCount,
          attendanceRate,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      limit,
      data: formatted,
    });
  } catch (err: any) {
    console.error('API /v1/events error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing events.' });
  }
}
