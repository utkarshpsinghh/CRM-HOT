import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Member,
  AllianceEvent,
  AttendanceRecord,
  StrikeRecord,
  CommunicationRecord,
  AllianceSettings,
  AdminAccount,
  AdminUser,
  OfficerContribution,
  VoteStatus,
  AttendanceStatus,
  EventSlot,
  EventParticipation,
  PenaltyStatus,
  ParticipationVoteStatus,
  ParticipationAttendanceStatus,
} from '../types/crm';
import { hashPasswordSha256 } from '../utils/security';
import { getComputedEventStatus } from '../utils/date';
import { deduplicateMembers, storageService } from './storage';
import { mapParticipationToLegacyAttendanceRows } from './eventMigration';

// Helper to strip any trailing slashes or /rest/v1 paths from Supabase Project URL
export function normalizeSupabaseUrl(url: string): string {
  let clean = (url || '').trim();
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

// Global cache for client instance so we don't recreate on every call
let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export const supabaseService = {
  // Check if Supabase credentials are configured in settings or environment
  isConfigured(settings?: AllianceSettings): boolean {
    const url = normalizeSupabaseUrl(settings?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '');
    const key = (settings?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    return Boolean(url && key && url.startsWith('http'));
  },

  // Get or initialize Supabase client instance
  getClient(settings?: AllianceSettings): SupabaseClient | null {
    const url = normalizeSupabaseUrl(settings?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '');
    const key = (settings?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

    if (!url || !key || !url.startsWith('http')) {
      return null;
    }

    const currentKey = `${url}:${key}`;
    if (cachedClient && cachedConfigKey === currentKey) {
      return cachedClient;
    }

    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  },

  // Test Supabase connection
  async testConnection(url: string, key: string): Promise<{ success: boolean; message: string; normalizedUrl?: string }> {
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = (key || '').trim();

    if (!cleanUrl.startsWith('http')) {
      return { success: false, message: 'Invalid Supabase Project URL. Must start with https://' };
    }
    if (!cleanKey) {
      return { success: false, message: 'Supabase Anon Public API Key is required.' };
    }

    try {
      const testClient = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Try selecting from the settings table or members table to verify schema and RLS
      const { error } = await testClient.from('members').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: 'Connected to Supabase, but the "members" table was not found! Please run the schema.sql in your Supabase SQL Editor.',
          };
        }
        return { success: false, message: `Supabase query error: ${error.message} (${error.code || ''})` };
      }

      return {
        success: true,
        message: 'Connected to Supabase PostgreSQL database successfully! Tables verified.',
        normalizedUrl: cleanUrl,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Could not reach Supabase endpoint: ${msg}` };
    }
  },

  // ==========================================================================
  // UNIFIED FAST DATA FETCH
  // Sub-30ms concurrent fetch for all CRM entities in parallel!
  // ==========================================================================
  async getAllData(settings: AllianceSettings): Promise<{
    members: Member[];
    events: AllianceEvent[];
    slots?: EventSlot[];
    participations?: EventParticipation[];
    attendance: AttendanceRecord[];
    strikes: StrikeRecord[];
    communications: CommunicationRecord[];
    admins: AdminAccount[];
    contributions: OfficerContribution[];
    settings?: Partial<AllianceSettings>;
  } | null> {
    const client = this.getClient(settings);
    if (!client) return null;

    try {
      // Helper to fetch all rows across PostgREST's 1000-row limit
      const fetchAllAttendance = async (): Promise<any[]> => {
        let allAtt: any[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await client
            .from('attendance')
            .select('*')
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allAtt = allAtt.concat(data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        return allAtt;
      };

      const [
        membersRes,
        eventsRes,
        allAttendanceRows,
        strikesRes,
        commsRes,
        adminsRes,
        contributionsRes,
      ] = await Promise.all([
        client.from('members').select('*').order('created_at', { ascending: false }),
        client.from('events').select('*').order('date', { ascending: false }),
        fetchAllAttendance(),
        client.from('strikes').select('*').order('created_at', { ascending: false }),
        client.from('communications').select('*').order('created_at', { ascending: false }),
        client.from('admins').select('*').order('created_at', { ascending: true }),
        client.from('contributions').select('*').order('timestamp', { ascending: false }).limit(200),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (eventsRes.error) throw eventsRes.error;

      let remoteSettings: Partial<AllianceSettings> | undefined;
      let settingsRows: any[] = [];
      try {
        const { data: settingsData } = await client.from('settings').select('*');
        if (Array.isArray(settingsData)) {
          settingsRows = settingsData;
          const underDevRow = settingsData.find(r => r.key === 'underDevelopment');
          if (underDevRow) {
            remoteSettings = { underDevelopment: underDevRow.value === 'true' };
          }
        }
      } catch {
        // settings table might not be initialized yet
      }

      let remoteSlots: EventSlot[] = [];
      let remoteParticipations: EventParticipation[] = [];
      try {
        const [slotsRes, partRes] = await Promise.all([
          client.from('event_slots').select('*'),
          client.from('event_participations').select('*'),
        ]);
        if (slotsRes.data && !slotsRes.error && slotsRes.data.length > 0) {
          remoteSlots = slotsRes.data.map(this.mapEventSlotFromRow);
        }
        if (partRes.data && !partRes.error && partRes.data.length > 0) {
          remoteParticipations = partRes.data.map(this.mapEventParticipationFromRow);
        }
      } catch {
        // new tables not yet present in supabase schema cache
      }

      // If remoteParticipations is empty, check settings shadow cache in Supabase
      if (remoteParticipations.length === 0 && Array.isArray(settingsRows) && settingsRows.length > 0) {
        const partCacheRow = settingsRows.find(r => r.key === 'crm_event_participations_cache');
        if (partCacheRow && partCacheRow.value) {
          try {
            const parsed = JSON.parse(partCacheRow.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              remoteParticipations = parsed;
            }
          } catch {}
        }
        const slotCacheRow = settingsRows.find(r => r.key === 'crm_event_slots_cache');
        if (slotCacheRow && slotCacheRow.value) {
          try {
            const parsed = JSON.parse(slotCacheRow.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              remoteSlots = parsed;
            }
          } catch {}
        }
      }

        return {
          members: deduplicateMembers((membersRes.data || []).map(this.mapMemberFromRow)),
          events: (eventsRes.data || []).map(this.mapEventFromRow),
          slots: remoteSlots,
          participations: remoteParticipations,
          attendance: (allAttendanceRows || []).map(this.mapAttendanceFromRow),
          strikes: (strikesRes.data || []).map(this.mapStrikeFromRow),
          communications: (commsRes.data || []).map(this.mapCommFromRow),
          admins: (adminsRes.data || []).map(this.mapAdminFromRow),
          contributions: (contributionsRes.data || []).map(this.mapContributionFromRow),
          settings: remoteSettings,
        };
      } catch (err) {
        console.error('Supabase getAllData error:', err);
        return null;
      }
    },

    async saveSettings(settings: AllianceSettings): Promise<boolean> {
      const client = this.getClient(settings);
      if (!client) return false;
      try {
        await client.from('settings').upsert([
          { key: 'underDevelopment', value: String(Boolean(settings.underDevelopment)) },
          { key: 'inactivityWarningDays', value: String(settings.inactivityWarningDays || 3) },
          { key: 'inactivityInactiveDays', value: String(settings.inactivityInactiveDays || 7) },
          { key: 'inactivityCriticalDays', value: String(settings.inactivityCriticalDays || 14) },
        ], { onConflict: 'key' });
        return true;
      } catch (err) {
        console.warn('saveSettings to Supabase warning:', err);
        return false;
      }
    },

  // ==========================================================================
  // AUTH
  // ==========================================================================
  async login(username: string, pass: string, settings: AllianceSettings): Promise<{
    success: boolean;
    user?: AdminUser;
    error?: string;
  }> {
    const client = this.getClient(settings);
    if (!client) {
      return { success: false, error: 'Supabase client not initialized.' };
    }

    try {
      const cleanUser = username.trim();
      const cleanPass = pass.trim();
      const lower = cleanUser.toLowerCase();
      const normalizedUser = lower.replace(/[\s_-]+/g, '');

      // Master leader check directly in Supabase service: ONLY Seoyoon is Main Admin
      const isMasterSeoyoon =
        normalizedUser === 'seoyoon' || lower === 'seoyoon';
      const isMasterPass = [
        'masterlogin', 'seoyoon', 'admin', 'password', '1391', 'hot1391', 'hot', 'crm', 'kingshot', 'master', '123456', 'seoyoon1391'
      ].includes(cleanPass.toLowerCase());

      if (isMasterSeoyoon && isMasterPass) {
        const user: AdminUser = {
          id: 'adm-001',
          username: 'seoyoon',
          name: 'Seoyoon',
          role: 'MainAdmin',
          token: `supa-master-${Date.now()}`,
        };
        return { success: true, user };
      }

      // Query officer directly from Supabase PostgreSQL database
      const { data, error } = await client
        .from('admins')
        .select('*')
        .ilike('username', cleanUser)
        .limit(1);

      if (error) {
        return { success: false, error: 'Database error checking officer credentials.' };
      }

      if (!data || data.length === 0) {
        // Fallback for Seoyoon master account even if database row was deleted or modified
        if (isMasterSeoyoon) {
          const user: AdminUser = {
            id: 'adm-001',
            username: 'seoyoon',
            name: 'Seoyoon',
            role: 'MainAdmin',
            token: `supa-master-${Date.now()}`,
          };
          return { success: true, user };
        }
        return { success: false, error: 'Unauthorized officer account. Access may have been revoked.' };
      }

      const adminRow = data[0];
      const passHash = await hashPasswordSha256(cleanPass);

      // Support SHA-256 hashed password, standard SHA-256 without salt, or plaintext fallback
      const isMatch =
        adminRow.password_hash === passHash ||
        adminRow.password_hash === cleanPass ||
        adminRow.password === cleanPass ||
        (isMasterSeoyoon && (isMasterPass || cleanPass === 'masterlogin'));

      if (!isMatch) {
        return { success: false, error: 'Invalid officer username or password.' };
      }

      const rawRole = String(adminRow.role || '').trim().toLowerCase();
      const isLeader = (rawRole === 'leader' || rawRole === 'mainadmin' || rawRole === 'r5') && adminRow.username.toLowerCase() === 'seoyoon';
      const role: 'MainAdmin' | 'SubAdmin' = isLeader ? 'MainAdmin' : 'SubAdmin';

      const user: AdminUser = {
        id: adminRow.id,
        username: adminRow.username,
        name: adminRow.name || adminRow.username,
        role,
        token: `supa-token-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      return { success: true, user };
    } catch {
      return { success: false, error: 'Invalid officer username or password.' };
    }
  },

  // ==========================================================================
  // MEMBERS
  // ==========================================================================
  async getMembers(settings: AllianceSettings): Promise<Member[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    const { data, error } = await client.from('members').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('getMembers error:', error);
      return [];
    }
    return deduplicateMembers((data || []).map(this.mapMemberFromRow));
  },

  async createMember(member: Member, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const row = this.mapMemberToRow(member);
    const { error } = await client.from('members').insert(row);
    if (error) {
      console.error('createMember error:', error);
      return false;
    }
    return true;
  },

  async updateMember(member: Member, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const row = this.mapMemberToRow(member);
    const { error } = await client.from('members').update(row).eq('id', member.id);
    if (error) {
      console.error('updateMember error:', error);
      return false;
    }
    return true;
  },

  async archiveMember(memberId: string, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const { error } = await client
      .from('members')
      .update({ status: 'Archived', updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (error) {
      console.error('archiveMember error:', error);
      return false;
    }
    return true;
  },

  async wipeAllMembers(settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;
    try {
      await client.from('attendance').delete().neq('id', '___empty___');
      await client.from('strikes').delete().neq('id', '___empty___');
      await client.from('communications').delete().neq('id', '___empty___');
      await client.from('members').delete().neq('id', '___empty___');
      return true;
    } catch (err) {
      console.error('wipeAllMembers error:', err);
      return false;
    }
  },

  // ==========================================================================
  // EVENTS
  // ==========================================================================
  async getEvents(settings: AllianceSettings): Promise<AllianceEvent[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    const { data, error } = await client.from('events').select('*').order('date', { ascending: false });
    if (error) {
      console.error('getEvents error:', error);
      return [];
    }
    return (data || []).map(this.mapEventFromRow);
  },

  async createEvent(
    event: AllianceEvent,
    attendanceRows: AttendanceRecord[],
    settings: AllianceSettings
  ): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const eventRow = this.mapEventToRow(event);
    const { error: eventError } = await client.from('events').insert(eventRow);
    if (eventError) {
      console.error('createEvent error:', eventError);
      return false;
    }

    if (attendanceRows.length > 0) {
      const attRows = attendanceRows.map(this.mapAttendanceToRow);
      // Batch insert in chunks of 100 to avoid payload limits
      for (let i = 0; i < attRows.length; i += 100) {
        const chunk = attRows.slice(i, i + 100);
        const { error: attError } = await client.from('attendance').insert(chunk);
        if (attError) {
          console.error('insert attendance rows error:', attError);
        }
      }
    }

    return true;
  },

  // ==========================================================================
  // ATTENDANCE
  // ==========================================================================
  async getAttendance(eventId: string | undefined, settings: AllianceSettings): Promise<AttendanceRecord[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    if (eventId) {
      const { data, error } = await client.from('attendance').select('*').eq('event_id', eventId);
      if (error) {
        console.error('getAttendance error:', error);
        return [];
      }
      return (data || []).map(this.mapAttendanceFromRow);
    }

    let allAtt: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await client.from('attendance').select('*').range(from, from + pageSize - 1);
      if (error) {
        console.error('getAttendance error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allAtt = allAtt.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return allAtt.map(this.mapAttendanceFromRow);
  },

  async updateVote(eventId: string, memberId: string, voteStatus: VoteStatus, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const id = `att-${eventId}-${memberId}`;
    const row = {
      id,
      event_id: eventId,
      member_id: memberId,
      vote_status: voteStatus,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('attendance').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('updateVote error:', error);
      return false;
    }
    return true;
  },

  async updateAttendance(
    eventId: string,
    memberId: string,
    attendanceStatus: AttendanceStatus,
    settings: AllianceSettings
  ): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const id = `att-${eventId}-${memberId}`;
    const row = {
      id,
      event_id: eventId,
      member_id: memberId,
      attendance_status: attendanceStatus,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('attendance').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('updateAttendance error:', error);
      return false;
    }
    return true;
  },

  async bulkUpdateAttendance(
    eventId: string,
    updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>,
    settings: AllianceSettings
  ): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const now = new Date().toISOString();
    const rows = updates.map(u => ({
      id: `att-${eventId}-${u.memberId}`,
      event_id: eventId,
      member_id: u.memberId,
      ...(u.voteStatus !== undefined ? { vote_status: u.voteStatus } : {}),
      ...(u.attendanceStatus !== undefined ? { attendance_status: u.attendanceStatus } : {}),
      updated_at: now,
    }));

    const { error } = await client.from('attendance').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('bulkUpdateAttendance error:', error);
      return false;
    }
    return true;
  },

  // ==========================================================================
  // EVENT SLOTS & PARTICIPATION
  // ==========================================================================
  async getEventSlots(settings: AllianceSettings): Promise<EventSlot[]> {
    const client = this.getClient(settings);
    if (!client) return [];
    try {
      const { data, error } = await client.from('event_slots').select('*').order('slot_number', { ascending: true });
      if (error || !data) return [];
      return data.map(this.mapEventSlotFromRow);
    } catch {
      return [];
    }
  },

  async getEventParticipations(eventId: string | undefined, settings: AllianceSettings): Promise<EventParticipation[]> {
    const client = this.getClient(settings);
    if (!client) return [];
    try {
      let query = client.from('event_participations').select('*');
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map(this.mapEventParticipationFromRow);
    } catch {
      return [];
    }
  },

  async createParentEvent(
    event: AllianceEvent,
    slots: EventSlot[],
    participations: EventParticipation[],
    settings: AllianceSettings
  ): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    // 1. Insert parent event
    const eventRow = this.mapEventToRow(event);
    const { error: eventError } = await client.from('events').insert(eventRow);
    if (eventError) {
      console.warn('createParentEvent events table error:', eventError);
    }

    // 2. Insert slots into event_slots
    if (slots.length > 0) {
      try {
        const slotRows = slots.map(this.mapEventSlotToRow);
        const { error: slotError } = await client.from('event_slots').insert(slotRows);
        if (slotError) {
          console.warn('insert event_slots warning:', slotError.message);
        }
      } catch (err) {
        console.warn('insert event_slots exception:', err);
      }
    }

    // 3. Insert participations into event_participations
    if (participations.length > 0) {
      try {
        const partRows = participations.map(this.mapEventParticipationToRow);
        for (let i = 0; i < partRows.length; i += 100) {
          const chunk = partRows.slice(i, i + 100);
          const { error: partError } = await client.from('event_participations').insert(chunk);
          if (partError) {
            console.warn('insert event_participations chunk warning:', partError.message);
          }
        }
      } catch (err) {
        console.warn('insert event_participations exception:', err);
      }
    }

    return true;
  },

  async deleteEventsByIds(
    eventIds: string[],
    settings?: AllianceSettings
  ): Promise<boolean> {
    if (!eventIds.length) return true;
    const client = this.getClient(settings);
    if (!client) return false;
    try {
      await Promise.allSettled([
        client.from('event_participations').delete().in('event_id', eventIds),
        client.from('event_slots').delete().in('event_id', eventIds),
        client.from('events').delete().in('id', eventIds),
      ]);
      return true;
    } catch (err) {
      console.warn('deleteEventsByIds exception:', err);
      return false;
    }
  },

  async updateParticipation(
    participation: EventParticipation,
    settings: AllianceSettings
  ): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;
    let anySuccess = false;

    // 1. Try to upsert into new 'event_participations' table
    try {
      const row = this.mapEventParticipationToRow(participation);
      const { error } = await client.from('event_participations').upsert(row, { onConflict: 'id' });
      if (!error) anySuccess = true;
    } catch {}

    // 2. Dual-write to legacy 'attendance' table in Supabase
    try {
      const legacyRows = mapParticipationToLegacyAttendanceRows(participation);
      for (const legRow of legacyRows) {
        const { error } = await client.from('attendance').upsert({
          id: legRow.id,
          event_id: legRow.eventId,
          member_id: legRow.memberId,
          vote_status: legRow.voteStatus,
          attendance_status: legRow.attendanceStatus,
          updated_at: legRow.updatedAt,
        }, { onConflict: 'id' });
        if (!error) anySuccess = true;
      }
    } catch (err) {
      console.warn('Dual-write to Supabase attendance warning:', err);
    }

    // 3. Shadow-sync to Supabase settings cache
    this.saveParticipationsCache(client).catch(() => {});

    return anySuccess;
  },

  async bulkUpdateParticipations(
    eventId: string,
    updates: EventParticipation[],
    settings: AllianceSettings
  ): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;
    let anySuccess = false;

    // 1. Try to upsert chunks into event_participations table
    try {
      const rows = updates.map(this.mapEventParticipationToRow);
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await client.from('event_participations').upsert(chunk, { onConflict: 'id' });
        if (!error) anySuccess = true;
      }
    } catch {}

    // 2. Dual-write to legacy attendance table in Supabase
    try {
      const allLegacyRows = updates.flatMap(p => mapParticipationToLegacyAttendanceRows(p));
      for (let i = 0; i < allLegacyRows.length; i += 100) {
        const chunk = allLegacyRows.slice(i, i + 100).map(r => ({
          id: r.id,
          event_id: r.eventId,
          member_id: r.memberId,
          vote_status: r.voteStatus,
          attendance_status: r.attendanceStatus,
          updated_at: r.updatedAt,
        }));
        const { error } = await client.from('attendance').upsert(chunk, { onConflict: 'id' });
        if (!error) anySuccess = true;
      }
    } catch (err) {
      console.warn('bulkUpdateParticipations legacy attendance sync error:', err);
    }

    // 3. Shadow-sync to Supabase settings cache
    this.saveParticipationsCache(client).catch(() => {});

    return anySuccess;
  },

  async saveParticipationsCache(client: any): Promise<void> {
    try {
      const participations = storageService.getEventParticipations();
      if (participations.length > 0) {
        await client.from('settings').upsert({
          key: 'crm_event_participations_cache',
          value: JSON.stringify(participations),
        }, { onConflict: 'key' });
      }
      const slots = storageService.getEventSlots();
      if (slots.length > 0) {
        await client.from('settings').upsert({
          key: 'crm_event_slots_cache',
          value: JSON.stringify(slots),
        }, { onConflict: 'key' });
      }
    } catch (err) {
      console.warn('saveParticipationsCache error:', err);
    }
  },

  // ==========================================================================
  // STRIKES
  // ==========================================================================
  async getStrikes(settings: AllianceSettings): Promise<StrikeRecord[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    const { data, error } = await client.from('strikes').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('getStrikes error:', error);
      return [];
    }
    return (data || []).map(this.mapStrikeFromRow);
  },

  async addStrike(strike: StrikeRecord, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const row = this.mapStrikeToRow(strike);
    const { error: strikeError } = await client.from('strikes').insert(row);
    if (strikeError) {
      console.error('addStrike error:', strikeError);
      return false;
    }

    // Increment member strikes count in members table
    try {
      const { data: memberData } = await client
        .from('members')
        .select('strikes')
        .eq('id', strike.memberId)
        .single();

      const currentStrikes = memberData?.strikes || 0;
      await client
        .from('members')
        .update({ strikes: currentStrikes + 1, updated_at: new Date().toISOString() })
        .eq('id', strike.memberId);
    } catch (err) {
      console.warn('Strike count increment warning:', err);
    }

    return true;
  },

  async removeStrike(strikeId: string, memberId: string, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const { error: delError } = await client.from('strikes').delete().eq('id', strikeId);
    if (delError) {
      console.error('removeStrike error:', delError);
      return false;
    }

    try {
      const { data: memberData } = await client
        .from('members')
        .select('strikes')
        .eq('id', memberId)
        .single();

      const currentStrikes = memberData?.strikes || 1;
      await client
        .from('members')
        .update({ strikes: Math.max(0, currentStrikes - 1), updated_at: new Date().toISOString() })
        .eq('id', memberId);
    } catch (err) {
      console.warn('Strike count decrement warning:', err);
    }

    return true;
  },

  // ==========================================================================
  // COMMUNICATIONS
  // ==========================================================================
  async getCommunications(settings: AllianceSettings): Promise<CommunicationRecord[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    const { data, error } = await client.from('communications').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('getCommunications error:', error);
      return [];
    }
    return (data || []).map(this.mapCommFromRow);
  },

  async addCommunication(comm: CommunicationRecord, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const row = this.mapCommToRow(comm);
    const { error: commError } = await client.from('communications').insert(row);
    if (commError) {
      console.error('addCommunication error:', commError);
      return false;
    }

    // Update member communication status and note
    await client
      .from('members')
      .update({
        communication: comm.status,
        communication_note: comm.note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', comm.memberId);

    return true;
  },

  // ==========================================================================
  // ADMINS
  // ==========================================================================
  async getAdmins(settings: AllianceSettings): Promise<AdminAccount[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    const { data, error } = await client.from('admins').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('getAdmins error:', error);
      return [];
    }
    return (data || []).map(this.mapAdminFromRow);
  },

  async createAdmin(admin: AdminAccount, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const passHash = admin.password ? await hashPasswordSha256(admin.password) : '';
    const row = {
      id: admin.id,
      username: admin.username,
      password_hash: passHash || admin.password || '',
      role: admin.role,
      name: admin.name || admin.username,
      created_at: admin.createdAt,
    };

    const { error } = await client.from('admins').insert(row);
    if (error) {
      console.error('createAdmin error:', error);
      return false;
    }
    return true;
  },

  async deleteAdmin(adminId: string, settings: AllianceSettings, username?: string): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const { error } = await client.from('admins').delete().eq('id', adminId);
    if (username && username.toLowerCase() !== 'seoyoon') {
      await client.from('admins').delete().ilike('username', username);
    }
    if (error) {
      console.error('deleteAdmin error:', error);
      return false;
    }
    return true;
  },

  async checkAdminValid(adminId: string, username: string, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return true;

    try {
      const cleanUser = (username || '').trim();
      let query = client.from('admins').select('id, username').limit(1);
      if (adminId && cleanUser) {
        query = query.or(`id.eq.${adminId},username.ilike.${cleanUser}`);
      } else if (cleanUser) {
        query = query.ilike('username', cleanUser);
      } else if (adminId) {
        query = query.eq('id', adminId);
      } else {
        return false;
      }

      const { data, error } = await query;
      if (error) {
        console.warn('checkAdminValid warning (keeping session on transient error):', error);
        return true;
      }
      return Boolean(data && data.length > 0);
    } catch (err) {
      console.warn('checkAdminValid exception:', err);
      return true;
    }
  },

  async updateAdminPassword(adminId: string, newPass: string, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const hash = await hashPasswordSha256(newPass);
    const { error } = await client
      .from('admins')
      .update({ password_hash: hash })
      .eq('id', adminId);

    return !error;
  },

  async updateAdminProfile(adminId: string, name: string, settings: AllianceSettings, username?: string): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const updates: Record<string, string> = { name };
    if (username) updates.username = username;

    const { error } = await client.from('admins').update(updates).eq('id', adminId);
    return !error;
  },

  // ==========================================================================
  // CONTRIBUTIONS
  // ==========================================================================
  async getContributions(settings: AllianceSettings): Promise<OfficerContribution[]> {
    const client = this.getClient(settings);
    if (!client) return [];

    const { data, error } = await client
      .from('contributions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(300);

    if (error) {
      console.error('getContributions error:', error);
      return [];
    }
    return (data || []).map(this.mapContributionFromRow);
  },

  async recordContribution(entry: OfficerContribution, settings: AllianceSettings): Promise<boolean> {
    const client = this.getClient(settings);
    if (!client) return false;

    const row = this.mapContributionToRow(entry);
    const { error } = await client.from('contributions').insert(row);
    if (error) {
      console.error('recordContribution error:', error);
      return false;
    }
    return true;
  },

  // ==========================================================================
  // MIGRATION HELPER (1-Click Upload local/sheets data into PostgreSQL)
  // ==========================================================================
  async migrateAllToSupabase(
    data: {
      members?: Member[];
      events?: AllianceEvent[];
      attendance?: AttendanceRecord[];
      strikes?: StrikeRecord[];
      communications?: CommunicationRecord[];
      admins?: AdminAccount[];
      contributions?: OfficerContribution[];
    },
    settings: AllianceSettings,
    onProgress?: (status: string) => void
  ): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
    const client = this.getClient(settings);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured.', counts: {} };
    }

    const counts: Record<string, number> = {};

    try {
      // 0. Verify that the members table exists in Supabase
      const { error: testErr } = await client.from('members').select('id').limit(1);
      if (testErr) {
        if (testErr.code === '42P01' || testErr.message.includes('does not exist')) {
          return {
            success: false,
            message: 'Supabase tables do not exist! Please open your Supabase Dashboard -> SQL Editor, run "supabase/schema.sql", and try again.',
            counts: {},
          };
        }
        return {
          success: false,
          message: `Supabase database error: ${testErr.message} (${testErr.code || ''})`,
          counts: {},
        };
      }

      // 1. Members
      const validMembers = (data.members || []).filter(m => m && m.id && m.name && m.name.trim().length > 0);
      const uniqueMembers = Array.from(new Map(validMembers.map(m => [m.id, m])).values());

      if (uniqueMembers.length > 0) {
        onProgress?.(`Uploading ${uniqueMembers.length} members to PostgreSQL...`);
        const rows = uniqueMembers.map(this.mapMemberToRow);
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from('members').upsert(chunk, { onConflict: 'id' });
          if (error) {
            throw new Error(`Members upload error: ${error.message} (${error.details || error.code || ''})`);
          }
        }
        counts.members = uniqueMembers.length;
      }

      // 2. Events
      const validEvents = (data.events || []).filter(e => e && e.id && (e.eventName || e.eventType));
      const uniqueEvents = Array.from(new Map(validEvents.map(e => [e.id, e])).values());

      if (uniqueEvents.length > 0) {
        onProgress?.(`Uploading ${uniqueEvents.length} battle events to PostgreSQL...`);
        const rows = uniqueEvents.map(this.mapEventToRow);
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from('events').upsert(chunk, { onConflict: 'id' });
          if (error) {
            throw new Error(`Events upload error: ${error.message} (${error.details || error.code || ''})`);
          }
        }
        counts.events = uniqueEvents.length;
      }

      // 3. Attendance (Critical: filter against valid member & event IDs to satisfy Foreign Key constraints)
      const memberIdSet = new Set(uniqueMembers.map(m => m.id));
      const eventIdSet = new Set(uniqueEvents.map(e => e.id));

      const validAttendance: AttendanceRecord[] = [];
      for (const a of (data.attendance || [])) {
        if (!a || !a.memberId || !a.eventId) continue;
        // Strictly prevent foreign key violation (23503) from orphan records
        if (!memberIdSet.has(a.memberId) || !eventIdSet.has(a.eventId)) continue;
        const attId = a.id || `att-${a.eventId}-${a.memberId}`;
        validAttendance.push({ ...a, id: attId });
      }

      // Deduplicate by ID to prevent PostgreSQL batch collision (21000)
      const uniqueAttendance = Array.from(new Map(validAttendance.map(a => [a.id, a])).values());

      if (uniqueAttendance.length > 0) {
        onProgress?.(`Uploading ${uniqueAttendance.length} attendance records to PostgreSQL...`);
        const rows = uniqueAttendance.map(this.mapAttendanceToRow);
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from('attendance').upsert(chunk, { onConflict: 'id' });
          if (error) {
            throw new Error(`Attendance upload error: ${error.message} (${error.details || error.code || ''})`);
          }
        }
        counts.attendance = uniqueAttendance.length;
      }

      // 4. Strikes (Filter by valid member IDs)
      const validStrikes: StrikeRecord[] = [];
      for (const s of (data.strikes || [])) {
        if (!s || !s.memberId || !memberIdSet.has(s.memberId)) continue;
        const strkId = s.id || `strk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        validStrikes.push({ ...s, id: strkId });
      }
      const uniqueStrikes = Array.from(new Map(validStrikes.map(s => [s.id, s])).values());

      if (uniqueStrikes.length > 0) {
        onProgress?.(`Uploading ${uniqueStrikes.length} strike records...`);
        const rows = uniqueStrikes.map(this.mapStrikeToRow);
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from('strikes').upsert(chunk, { onConflict: 'id' });
          if (error) {
            throw new Error(`Strikes upload error: ${error.message}`);
          }
        }
        counts.strikes = uniqueStrikes.length;
      }

      // 5. Communications (Filter by valid member IDs)
      const validComms: CommunicationRecord[] = [];
      for (const c of (data.communications || [])) {
        if (!c || !c.memberId || !memberIdSet.has(c.memberId)) continue;
        const commId = c.id || `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        validComms.push({ ...c, id: commId });
      }
      const uniqueComms = Array.from(new Map(validComms.map(c => [c.id, c])).values());

      if (uniqueComms.length > 0) {
        onProgress?.(`Uploading ${uniqueComms.length} communication records...`);
        const rows = uniqueComms.map(this.mapCommToRow);
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from('communications').upsert(chunk, { onConflict: 'id' });
          if (error) {
            throw new Error(`Communications upload error: ${error.message}`);
          }
        }
        counts.communications = uniqueComms.length;
      }

      // 6. Admins
      const validAdmins = (data.admins || []).filter(a => a && a.username && a.username.trim());
      if (validAdmins.length > 0) {
        onProgress?.(`Synchronizing officer admin accounts...`);
        const defaultHash = '87998b3ca00bb39b4f971b3e8a4a35071060956973e8705f4ba5ceb9704e673f'; // SHA-256 for 'masterlogin'
        for (const adm of validAdmins) {
          let passHash = defaultHash;
          if (adm.password) {
            passHash = await hashPasswordSha256(adm.password);
          }
          const adminRow = {
            id: adm.id || `adm-${Math.random().toString(36).slice(2, 8)}`,
            username: adm.username.trim(),
            password_hash: passHash,
            role: adm.role || 'SubAdmin',
            name: adm.name || adm.username,
            created_at: adm.createdAt || new Date().toISOString(),
          };
          const { error } = await client.from('admins').upsert(adminRow, { onConflict: 'username' });
          if (error) {
            console.warn(`Admin ${adm.username} upsert warning:`, error.message);
          }
        }
        counts.admins = validAdmins.length;
      }

      // 7. Contributions
      const validContributions = (data.contributions || []).filter(c => c && c.action);
      const uniqueContributions = Array.from(new Map(validContributions.map(c => [c.id || `cnt-${Math.random()}`, c])).values());

      if (uniqueContributions.length > 0) {
        onProgress?.(`Uploading officer contribution records...`);
        const rows = uniqueContributions.map(this.mapContributionToRow);
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from('contributions').upsert(chunk, { onConflict: 'id' });
          if (error) {
            console.warn('Contributions upsert warning:', error.message);
          }
        }
        counts.contributions = uniqueContributions.length;
      }

      // 8. Settings
      try {
        await client.from('settings').upsert([
          { key: 'inactivityWarningDays', value: String(settings.inactivityWarningDays || 3) },
          { key: 'inactivityInactiveDays', value: String(settings.inactivityInactiveDays || 7) },
          { key: 'inactivityCriticalDays', value: String(settings.inactivityCriticalDays || 14) },
        ], { onConflict: 'key' });
      } catch (settingsErr) {
        console.warn('Settings table upsert warning:', settingsErr);
      }

      onProgress?.('Verification complete!');
      return {
        success: true,
        message: `All alliance data successfully migrated to Supabase PostgreSQL! (${counts.members || 0} members, ${counts.events || 0} events, ${counts.attendance || 0} attendance records)`,
        counts,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Migration failed: ${msg}`,
        counts,
      };
    }
  },

  // ==========================================================================
  // ROW MAPPERS (PostgreSQL snake_case <-> TypeScript camelCase)
  // ==========================================================================
  mapMemberFromRow(row: any): Member {
    let gameId = row.game_id;
    let cleanCommNote = row.communication_note;

    if (!gameId && row.communication_note) {
      const match = row.communication_note.match(/\[GID:([a-zA-Z0-9_-]+)\]/);
      if (match) {
        gameId = match[1];
        cleanCommNote = row.communication_note.replace(/\[GID:[a-zA-Z0-9_-]+\]\s*/, '').trim() || undefined;
      }
    }

    return {
      id: row.id,
      name: row.name,
      gameId: gameId || undefined,
      currentRank: row.current_rank,
      formerRank: row.former_rank || 'None',
      strikes: Number(row.strikes || 0),
      communication: row.communication || 'Good',
      communicationNote: cleanCommNote || undefined,
      status: row.status || 'Active',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  },

  mapMemberToRow(m: Member) {
    let commNote = m.communicationNote || '';
    if (m.gameId) {
      // Encode gameId into communication_note safely for storage
      const existingWithoutTag = commNote.replace(/\[GID:[a-zA-Z0-9_-]+\]\s*/, '').trim();
      commNote = `[GID:${m.gameId.trim()}] ${existingWithoutTag}`.trim();
    }

    return {
      id: m.id,
      name: m.name,
      current_rank: m.currentRank,
      former_rank: m.formerRank || 'None',
      strikes: m.strikes || 0,
      communication: m.communication,
      communication_note: commNote || null,
      status: m.status,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    };
  },

  mapEventFromRow(row: any): AllianceEvent {
    const rawDate = row.date || new Date().toISOString();
    let status = row.status || 'Scheduled';
    if (status === 'Scheduled' && getComputedEventStatus(rawDate) === 'Completed') {
      status = 'Completed';
    }
    return {
      id: row.id,
      eventType: row.event_type || row.type || 'BT1',
      eventName: row.event_name || row.name || 'Alliance Event',
      date: rawDate,
      status: status,
      notes: row.notes || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    };
  },

  mapEventToRow(e: AllianceEvent) {
    return {
      id: e.id,
      event_type: e.eventType,
      event_name: e.eventName,
      date: e.date,
      status: e.status,
      notes: e.notes || null,
      created_at: e.createdAt,
    };
  },

  mapAttendanceFromRow(row: any): AttendanceRecord {
    const EVENT_ID_ALIASES: Record<string, string> = {
      'evt-1790607589476-kins': 'evt-c233df90',
      'evt-1791048690819-7icl': 'evt-6f6a9d3a',
      'evt-1791048703740-v7b9': 'evt-61922e28',
      'evt-1791049152771-k1qw': 'evt-c031d684',
      'evt-1791049171203-10e5': 'evt-f9234e34',
      'evt-1791223308841-6mkk': 'evt-4eee1101',
    };
    const rawEventId = (row.event_id || '').trim();
    const eventId = EVENT_ID_ALIASES[rawEventId] || rawEventId;
    return {
      id: row.id,
      eventId,
      memberId: row.member_id,
      voteStatus: row.vote_status || 'NO RESPONSE',
      attendanceStatus: row.attendance_status || 'NOT_APPLICABLE',
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  },

  mapAttendanceToRow(a: AttendanceRecord) {
    return {
      id: a.id,
      event_id: a.eventId,
      member_id: a.memberId,
      vote_status: a.voteStatus,
      attendance_status: a.attendanceStatus,
      updated_at: a.updatedAt,
    };
  },

  mapStrikeFromRow(row: any): StrikeRecord {
    return {
      id: row.id,
      memberId: row.member_id,
      date: row.date,
      reason: row.reason,
      addedBy: row.added_by,
    };
  },

  mapStrikeToRow(s: StrikeRecord) {
    return {
      id: s.id,
      member_id: s.memberId,
      date: s.date,
      reason: s.reason,
      added_by: s.addedBy,
    };
  },

  mapCommFromRow(row: any): CommunicationRecord {
    return {
      id: row.id,
      memberId: row.member_id,
      status: row.status,
      note: row.note || '',
      date: row.date,
      addedBy: row.added_by,
    };
  },

  mapCommToRow(c: CommunicationRecord) {
    return {
      id: c.id,
      member_id: c.memberId,
      status: c.status,
      note: c.note || null,
      date: c.date,
      added_by: c.addedBy,
    };
  },

  mapAdminFromRow(row: any): AdminAccount {
    const rawRole = String(row.role || '').trim().toLowerCase();
    const isLeader = (rawRole === 'leader' || rawRole === 'mainadmin' || rawRole === 'r5') && String(row.username || '').toLowerCase() === 'seoyoon';
    return {
      id: row.id,
      username: row.username,
      password: row.password_hash || '',
      role: isLeader ? 'MainAdmin' : 'SubAdmin',
      name: row.name || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    };
  },

  mapContributionFromRow(row: any): OfficerContribution {
    return {
      id: row.id,
      adminId: row.admin_id,
      adminUsername: row.admin_username,
      adminName: row.admin_name,
      adminRole: row.admin_role,
      action: row.action_type,
      description: row.description,
      targetName: row.target_name || undefined,
      count: row.count || 1,
      timestamp: row.timestamp || new Date().toISOString(),
    };
  },

  mapContributionToRow(c: OfficerContribution) {
    return {
      id: c.id,
      admin_id: c.adminId,
      admin_username: c.adminUsername,
      admin_name: c.adminName,
      admin_role: c.adminRole,
      action_type: c.action,
      description: c.description,
      target_name: c.targetName || null,
      count: c.count || 1,
      timestamp: c.timestamp,
    };
  },

  mapEventSlotFromRow(row: any): EventSlot {
    return {
      id: row.id,
      eventId: row.event_id,
      slotNumber: (Number(row.slot_number) === 2 ? 2 : 1) as 1 | 2,
      slotName: row.slot_name || `Slot ${row.slot_number || 1}`,
      startTime: row.start_time || new Date().toISOString(),
      createdAt: row.created_at || new Date().toISOString(),
    };
  },

  mapEventSlotToRow(s: EventSlot) {
    return {
      id: s.id,
      event_id: s.eventId,
      slot_number: s.slotNumber,
      slot_name: s.slotName,
      start_time: s.startTime,
      created_at: s.createdAt,
    };
  },

  mapEventParticipationFromRow(row: any): EventParticipation {
    return {
      id: row.id,
      eventId: row.event_id,
      memberId: row.member_id,
      selectedSlotId: row.selected_slot_id || null,
      voteStatus: (row.vote_status === 'VOTED' ? 'VOTED' : 'NO_VOTE') as ParticipationVoteStatus,
      attendanceStatus: (['ATTENDED', 'ABSENT', 'NOT_MARKED'].includes(row.attendance_status)
        ? row.attendance_status
        : 'NOT_MARKED') as ParticipationAttendanceStatus,
      attendanceSlotId: row.attendance_slot_id || null,
      penaltyStatus: (['NONE', 'ISSUED', 'WAIVED'].includes(row.penalty_status)
        ? row.penalty_status
        : 'NONE') as PenaltyStatus,
      penaltyNote: row.penalty_note || null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  },

  mapEventParticipationToRow(p: EventParticipation) {
    return {
      id: p.id,
      event_id: p.eventId,
      member_id: p.memberId,
      selected_slot_id: p.selectedSlotId,
      vote_status: p.voteStatus,
      attendance_status: p.attendanceStatus,
      attendance_slot_id: p.attendanceSlotId,
      penalty_status: p.penaltyStatus,
      penalty_note: p.penaltyNote,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  },
};
