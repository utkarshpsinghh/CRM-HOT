import { getSupabase, handleCors, validateApiKey } from '../_lib';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  const isValid = await validateApiKey(req, res, 'attendance');
  if (!isValid) return;

  try {
    const supabase = getSupabase();

    const eventIdParam = req.query?.eventId || req.query?.event_id;
    const memberIdParam = req.query?.memberId || req.query?.member_id;
    const statusParam = req.query?.status || req.query?.attendanceStatus;
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 200, 1), 1000);

    // Fetch members and events for enrichment
    const [membersRes, eventsRes, slotsRes] = await Promise.all([
      supabase.from('members').select('id, name, current_rank'),
      supabase.from('events').select('id, event_name, event_type, date'),
      supabase.from('event_slots').select('id, slot_number, slot_name'),
    ]);

    const memberMap = new Map((membersRes.data || []).map(m => [m.id, m]));
    const eventMap = new Map((eventsRes.data || []).map(e => [e.id, e]));
    const slotMap = new Map((slotsRes.data || []).map(s => [s.id, s.slot_name]));

    // Query modern event_participations first
    let partQuery = supabase
      .from('event_participations')
      .select('id, event_id, member_id, selected_slot_id, vote_status, attendance_status, attendance_slot_id, penalty_status, penalty_note, updated_at');

    if (eventIdParam) partQuery = partQuery.eq('event_id', eventIdParam);
    if (memberIdParam) partQuery = partQuery.eq('member_id', memberIdParam);
    if (statusParam) partQuery = partQuery.ilike('attendance_status', statusParam);

    const { data: participations, error: partErr } = await partQuery.limit(limit);

    if (partErr) {
      console.warn('event_participations query error, falling back to legacy attendance:', partErr.message);
    }

    let records: any[] = [];

    if (participations && participations.length > 0) {
      records = participations.map(p => {
        const mem = memberMap.get(p.member_id);
        const evt = eventMap.get(p.event_id);
        return {
          id: p.id,
          eventId: p.event_id,
          eventName: evt?.event_name || null,
          eventType: evt?.event_type || null,
          eventDate: evt?.date || null,
          memberId: p.member_id,
          memberName: mem?.name || 'Unknown',
          memberRank: mem?.current_rank || 'R1',
          voteStatus: p.vote_status,
          votedSlot: p.selected_slot_id ? slotMap.get(p.selected_slot_id) || p.selected_slot_id : null,
          attendanceStatus: p.attendance_status,
          attendedSlot: p.attendance_slot_id ? slotMap.get(p.attendance_slot_id) || p.attendance_slot_id : null,
          penaltyStatus: p.penalty_status,
          updatedAt: p.updated_at,
        };
      });
    } else {
      // Fallback to legacy attendance table
      let legQuery = supabase
        .from('attendance')
        .select('id, event_id, member_id, vote_status, attendance_status, updated_at');

      if (eventIdParam) legQuery = legQuery.eq('event_id', eventIdParam);
      if (memberIdParam) legQuery = legQuery.eq('member_id', memberIdParam);
      if (statusParam) legQuery = legQuery.ilike('attendance_status', statusParam);

      const { data: legacyRows, error: legErr } = await legQuery.limit(limit);
      if (legErr) {
        return res.status(500).json({ success: false, error: legErr.message });
      }

      records = (legacyRows || []).map(r => {
        const mem = memberMap.get(r.member_id);
        const evt = eventMap.get(r.event_id);
        const isAttended = r.attendance_status === 'JOINED' || r.attendance_status === 'ATTENDED';
        return {
          id: r.id,
          eventId: r.event_id,
          eventName: evt?.event_name || null,
          eventType: evt?.event_type || null,
          eventDate: evt?.date || null,
          memberId: r.member_id,
          memberName: mem?.name || 'Unknown',
          memberRank: mem?.current_rank || 'R1',
          voteStatus: r.vote_status === 'YES' ? 'VOTED' : 'NO_VOTE',
          votedSlot: null,
          attendanceStatus: isAttended ? 'ATTENDED' : 'ABSENT',
          attendedSlot: null,
          penaltyStatus: 'NONE',
          updatedAt: r.updated_at,
        };
      });
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      limit,
      data: records,
    });
  } catch (err: any) {
    console.error('API /v1/attendance error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing attendance.' });
  }
}
