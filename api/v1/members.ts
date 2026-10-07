import { getSupabase, handleCors, validateApiKey } from '../_lib';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  const isValid = await validateApiKey(req, res, 'members');
  if (!isValid) return;

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('members')
      .select('id, name, current_rank, former_rank, strikes, communication, communication_note, status, created_at, updated_at', { count: 'exact' });

    // Optional status filter
    const statusParam = req.query?.status;
    if (typeof statusParam === 'string' && statusParam.trim()) {
      query = query.ilike('status', statusParam.trim());
    }

    // Optional rank filter
    const rankParam = req.query?.rank;
    if (typeof rankParam === 'string' && rankParam.trim()) {
      query = query.ilike('current_rank', rankParam.trim());
    }

    // Optional search filter
    const searchParam = req.query?.search;
    if (typeof searchParam === 'string' && searchParam.trim()) {
      query = query.ilike('name', `%${searchParam.trim()}%`);
    }

    // Pagination
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 200, 1), 1000);
    const offset = Math.max(parseInt(req.query?.offset, 10) || 0, 0);

    query = query.order('name', { ascending: true }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Sanitize and format member records
    const members = (data || []).map(row => {
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
    });

    return res.status(200).json({
      success: true,
      count: members.length,
      total: count ?? members.length,
      limit,
      offset,
      data: members,
    });
  } catch (err: any) {
    console.error('API /v1/members error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing members roster.' });
  }
}
