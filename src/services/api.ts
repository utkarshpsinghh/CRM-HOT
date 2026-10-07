import {
  Member,
  AllianceEvent,
  AttendanceRecord,
  StrikeRecord,
  CommunicationRecord,
  AllianceSettings,
  AdminUser,
  AdminAccount,
  VoteStatus,
  AttendanceStatus,
  OfficerContribution,
  InactiveMemberInsight,
} from '../types/crm';
import { storageService } from './storage';
import { supabaseService } from './supabase';
import { getLoginAttemptState, recordFailedAttempt, resetLoginAttempts } from '../utils/security';

export const apiService = {
  // Determine which database engine is actively configured
  getActiveProvider(settings?: AllianceSettings): 'supabase' | 'local' {
    if (this.isSupabase(settings)) return 'supabase';
    return 'local';
  },

  // Check if live Supabase PostgreSQL backend should be used
  isSupabase(settings?: AllianceSettings): boolean {
    return supabaseService.isConfigured(settings);
  },

  // Test connection to Supabase PostgreSQL database
  async testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string; normalizedUrl?: string }> {
    return supabaseService.testConnection(url, key);
  },

  // --------------------------------------------------------------------------
  // UNIFIED FAST DATA FETCH (Parallel sub-30ms PostgreSQL fetch)
  // --------------------------------------------------------------------------
  async getAllData(settings: AllianceSettings): Promise<any | null> {
    if (this.isSupabase(settings)) {
      try {
        const supaData = await supabaseService.getAllData(settings);
        if (supaData) return supaData;
      } catch (err) {
        console.warn('Supabase getAllData error:', err);
      }
    }
    return null;
  },

  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------
  async login(username: string, pass: string, settings: AllianceSettings): Promise<{ success: boolean; user?: AdminUser; error?: string; initialData?: any }> {
    const cleanUser = (username || '').trim();
    const cleanPass = (pass || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Username and password are required.' };
    }

    const lowerUser = cleanUser.toLowerCase();
    const normalizedUser = lowerUser.replace(/[\s_-]+/g, '');

    // Master Login: Only Leader 'seoyoon' (and aliases like 'seo yoon', 'Seoyoon') has master MainAdmin access
    const isMasterSeoyoon = normalizedUser === 'seoyoon' || lowerUser === 'seoyoon';
    const isMasterPass = [
      'masterlogin', 'seoyoon', 'admin', 'password', '1391', 'hot1391', 'hot', 'crm', 'kingshot', 'master', '123456', 'seoyoon1391'
    ].includes(cleanPass.toLowerCase());

    // 1. Primary: Authenticate via Supabase PostgreSQL
    if (this.isSupabase(settings)) {
      try {
        const result = await supabaseService.login(cleanUser, cleanPass, settings);
        if (result.success && result.user) {
          if (result.user.username.toLowerCase() !== 'seoyoon') {
            result.user.role = 'SubAdmin';
          }
          resetLoginAttempts();
          return result;
        }
      } catch (err) {
        console.warn('Supabase authentication error, checking fallback:', err);
      }
    }

    // Seoyoon master credentials ALWAYS bypass any lockout
    if (isMasterSeoyoon && isMasterPass) {
      resetLoginAttempts();
      const user: AdminUser = {
        id: 'adm-001',
        username: 'seoyoon',
        role: 'MainAdmin',
        token: `master-token-${Date.now()}`,
        name: 'Seoyoon',
      };
      return { success: true, user };
    }

    // Check brute-force lockout status for invalid attempts
    const attemptState = getLoginAttemptState();
    if (attemptState.isLocked) {
      const minutes = Math.floor(attemptState.remainingSeconds / 60);
      const seconds = attemptState.remainingSeconds % 60;
      const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      return {
        success: false,
        error: `Account temporarily locked due to excessive failed attempts. Try again in ${formatted}.`,
      };
    }

    // Fallback: Check local officer accounts
    const localAdmins = storageService.getAdminAccounts();
    const matched = localAdmins.find(
      a => {
        const aNorm = a.username.toLowerCase().replace(/[\s_-]+/g, '');
        const userMatch = aNorm === normalizedUser || a.username.toLowerCase() === lowerUser;
        const passMatch = a.password === cleanPass || 
          (aNorm === 'seoyoon' && isMasterPass);
        return userMatch && passMatch;
      }
    );

    if (matched) {
      resetLoginAttempts();
      const user: AdminUser = {
        id: matched.id,
        username: matched.username,
        role: matched.username.toLowerCase() === 'seoyoon' ? 'MainAdmin' : 'SubAdmin',
        token: `local-token-${Date.now()}`,
        name: matched.name || matched.username,
      };
      return { success: true, user };
    }

    // Master fallback for Seoyoon if any non-empty password is entered on device
    if (isMasterSeoyoon) {
      resetLoginAttempts();
      const user: AdminUser = {
        id: 'adm-001',
        username: 'seoyoon',
        role: 'MainAdmin',
        token: `master-token-${Date.now()}`,
        name: 'Seoyoon',
      };
      return { success: true, user };
    }

    recordFailedAttempt(cleanUser);
    return { success: false, error: 'Invalid officer username or password.' };
  },

  // --------------------------------------------------------------------------
  // MEMBERS
  // --------------------------------------------------------------------------
  async getMembers(settings: AllianceSettings): Promise<Member[]> {
    if (this.isSupabase(settings)) {
      const members = await supabaseService.getMembers(settings);
      if (members && members.length > 0) return members;
    }
    return storageService.getMembers();
  },

  async createMember(member: Member, settings: AllianceSettings): Promise<boolean> {
    const list = storageService.getMembers();
    storageService.setMembers([member, ...list.filter(m => m.id !== member.id)]);
    if (this.isSupabase(settings)) {
      return await supabaseService.createMember(member, settings);
    }
    return true;
  },

  async updateMember(member: Member, settings: AllianceSettings): Promise<boolean> {
    const list = storageService.getMembers();
    storageService.setMembers(list.map(m => (m.id === member.id ? member : m)));
    if (this.isSupabase(settings)) {
      return await supabaseService.updateMember(member, settings);
    }
    return true;
  },

  async archiveMember(memberId: string, settings: AllianceSettings): Promise<boolean> {
    const list = storageService.getMembers();
    storageService.setMembers(list.map(m => (m.id === memberId ? { ...m, status: 'Archived' as const } : m)));
    if (this.isSupabase(settings)) {
      return await supabaseService.archiveMember(memberId, settings);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------
  async getEvents(settings: AllianceSettings): Promise<AllianceEvent[]> {
    if (this.isSupabase(settings)) {
      const events = await supabaseService.getEvents(settings);
      if (events && events.length > 0) return events;
    }
    return storageService.getEvents();
  },

  async createEvent(event: AllianceEvent, members: Member[], settings: AllianceSettings): Promise<boolean> {
    const list = storageService.getEvents();
    storageService.setEvents([event, ...list.filter(e => e.id !== event.id)]);
    const now = new Date().toISOString();
    const attendanceRecords: AttendanceRecord[] = members.map(m => ({
      id: `att-${event.id}-${m.id}`,
      eventId: event.id,
      memberId: m.id,
      voteStatus: 'NO RESPONSE' as const,
      attendanceStatus: 'NOT_APPLICABLE' as const,
      updatedAt: now,
    }));
    const curAtt = storageService.getAttendance();
    storageService.setAttendance([...attendanceRecords, ...curAtt]);
    if (this.isSupabase(settings)) {
      return await supabaseService.createEvent(event, attendanceRecords, settings);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // ATTENDANCE & VOTES
  // --------------------------------------------------------------------------
  async getAttendance(eventId: string | undefined, settings: AllianceSettings): Promise<AttendanceRecord[]> {
    if (this.isSupabase(settings)) {
      const records = await supabaseService.getAttendance(eventId, settings);
      if (records && records.length > 0) return records;
    }
    const all = storageService.getAttendance();
    return eventId ? all.filter(a => a.eventId === eventId) : all;
  },

  async updateVote(eventId: string, memberId: string, voteStatus: VoteStatus, settings: AllianceSettings): Promise<boolean> {
    const current = storageService.getAttendance();
    const updated = current.map(a => (a.eventId === eventId && a.memberId === memberId ? { ...a, voteStatus } : a));
    storageService.setAttendance(updated);
    if (this.isSupabase(settings)) {
      return await supabaseService.updateVote(eventId, memberId, voteStatus, settings);
    }
    return true;
  },

  async updateAttendance(eventId: string, memberId: string, attendanceStatus: AttendanceStatus, settings: AllianceSettings): Promise<boolean> {
    const current = storageService.getAttendance();
    const updated = current.map(a => (a.eventId === eventId && a.memberId === memberId ? { ...a, attendanceStatus } : a));
    storageService.setAttendance(updated);
    if (this.isSupabase(settings)) {
      return await supabaseService.updateAttendance(eventId, memberId, attendanceStatus, settings);
    }
    return true;
  },

  async bulkUpdateAttendance(
    eventId: string,
    updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>,
    settings: AllianceSettings
  ): Promise<boolean> {
    const current = storageService.getAttendance();
    const updateMap = new Map(updates.map(u => [u.memberId, u]));
    const updated = current.map(a => {
      if (a.eventId === eventId && updateMap.has(a.memberId)) {
        const u = updateMap.get(a.memberId)!;
        return {
          ...a,
          ...(u.voteStatus ? { voteStatus: u.voteStatus } : {}),
          ...(u.attendanceStatus ? { attendanceStatus: u.attendanceStatus } : {}),
        };
      }
      return a;
    });
    storageService.setAttendance(updated);
    if (this.isSupabase(settings)) {
      return await supabaseService.bulkUpdateAttendance(eventId, updates, settings);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // STRIKES
  // --------------------------------------------------------------------------
  async getStrikes(settings: AllianceSettings): Promise<StrikeRecord[]> {
    if (this.isSupabase(settings)) {
      const strikes = await supabaseService.getStrikes(settings);
      if (strikes && strikes.length > 0) return strikes;
    }
    return storageService.getStrikes();
  },

  async addStrike(memberId: string, reason: string, adminName: string, settings: AllianceSettings): Promise<boolean> {
    const strike: StrikeRecord = {
      id: `str-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      memberId,
      date: new Date().toISOString(),
      reason,
      addedBy: adminName,
    };
    const current = storageService.getStrikes();
    storageService.setStrikes([strike, ...current]);
    if (this.isSupabase(settings)) {
      return await supabaseService.addStrike(strike, settings);
    }
    return true;
  },

  async removeStrike(strikeId: string, memberId: string, settings: AllianceSettings): Promise<boolean> {
    const current = storageService.getStrikes();
    storageService.setStrikes(current.filter(s => s.id !== strikeId));
    if (this.isSupabase(settings)) {
      return await supabaseService.removeStrike(strikeId, memberId, settings);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // COMMUNICATIONS
  // --------------------------------------------------------------------------
  async getCommunications(settings: AllianceSettings): Promise<CommunicationRecord[]> {
    if (this.isSupabase(settings)) {
      const comms = await supabaseService.getCommunications(settings);
      if (comms && comms.length > 0) return comms;
    }
    return storageService.getCommunications();
  },

  async addCommunication(memberId: string, status: Member['communication'], note: string, adminName: string, settings: AllianceSettings): Promise<boolean> {
    const comm: CommunicationRecord = {
      id: `com-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      memberId,
      date: new Date().toISOString(),
      status,
      note,
      addedBy: adminName,
    };
    const current = storageService.getCommunications();
    storageService.setCommunications([comm, ...current]);
    if (this.isSupabase(settings)) {
      return await supabaseService.addCommunication(comm, settings);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // ADMIN ACCOUNTS
  // --------------------------------------------------------------------------
  async getAdmins(settings: AllianceSettings): Promise<AdminAccount[]> {
    if (this.isSupabase(settings)) {
      const admins = await supabaseService.getAdmins(settings);
      if (admins && admins.length > 0) return admins;
    }
    return storageService.getAdminAccounts();
  },

  async createAdmin(data: Omit<AdminAccount, 'id' | 'createdAt'>, settings: AllianceSettings): Promise<AdminAccount> {
    const created = storageService.createAdminAccount(data);
    if (this.isSupabase(settings)) {
      await supabaseService.createAdmin(created, settings);
    }
    return created;
  },

  async deleteAdmin(adminId: string, settings: AllianceSettings): Promise<boolean> {
    const localAdmins = storageService.getAdminAccounts();
    const targetAdmin = localAdmins.find(a => a.id === adminId);
    const targetUsername = targetAdmin?.username;
    const success = storageService.deleteAdminAccount(adminId);
    if (this.isSupabase(settings)) {
      await supabaseService.deleteAdmin(adminId, settings, targetUsername);
    }
    return success;
  },

  async checkAdminValid(adminId: string, username: string, settings: AllianceSettings): Promise<boolean> {
    const cleanUser = (username || '').trim().toLowerCase();
    // Seoyoon is the master alliance admin and is never revoked
    if (cleanUser === 'seoyoon') return true;

    if (this.isSupabase(settings)) {
      return await supabaseService.checkAdminValid(adminId, username, settings);
    }
    const localAdmins = storageService.getAdminAccounts();
    return localAdmins.some(
      a => a.id === adminId || a.username.toLowerCase() === cleanUser
    );
  },

  async updateAdminPassword(adminId: string, newPass: string, settings: AllianceSettings): Promise<boolean> {
    const ok = storageService.updateAdminPassword(adminId, newPass);
    if (this.isSupabase(settings)) {
      await supabaseService.updateAdminPassword(adminId, newPass, settings);
    }
    return ok;
  },

  async updateAdminProfile(adminId: string, name: string, settings: AllianceSettings, username?: string): Promise<boolean> {
    const ok = storageService.updateAdminProfile(adminId, name, username);
    if (this.isSupabase(settings)) {
      await supabaseService.updateAdminProfile(adminId, name, settings, username);
    }
    return ok;
  },

  // --------------------------------------------------------------------------
  // CONTRIBUTIONS
  // --------------------------------------------------------------------------
  async getContributions(settings: AllianceSettings): Promise<OfficerContribution[]> {
    if (this.isSupabase(settings)) {
      const contributions = await supabaseService.getContributions(settings);
      if (contributions && contributions.length > 0) return contributions;
    }
    return storageService.getContributions();
  },

  async recordContribution(entry: OfficerContribution, settings: AllianceSettings): Promise<boolean> {
    if (this.isSupabase(settings)) {
      return await supabaseService.recordContribution(entry, settings);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // INACTIVITY CALCULATION
  // --------------------------------------------------------------------------
  calculateInactivity(
    members: Member[],
    events: AllianceEvent[],
    attendance: AttendanceRecord[],
    _settings: AllianceSettings
  ): InactiveMemberInsight[] {
    const now = Date.now();
    const eventMap = new Map(events.map(e => [e.id, e]));

    const insights: InactiveMemberInsight[] = [];
    // Inactivity is strictly manual as requested by alliance leadership.
    // Only members explicitly marked with status === 'Inactive' are included.
    const inactiveMembers = members.filter(m => m.status === 'Inactive');

    inactiveMembers.forEach(member => {
      const memberAtt = attendance.filter(a => a.memberId === member.id);
      let latestTimestamp = 0;
      let activityDescription = 'Marked inactive in roster';

      // Check event attendance & votes to show helpful context
      memberAtt.forEach(rec => {
        const evt = eventMap.get(rec.eventId);
        if (!evt) return;
        const evtTime = new Date(evt.date).getTime();

        if (rec.attendanceStatus === 'JOINED') {
          if (evtTime > latestTimestamp) {
            latestTimestamp = evtTime;
            activityDescription = `Last joined: ${evt.eventType || evt.eventName}`;
          }
        } else if (rec.voteStatus === 'YES' || rec.voteStatus === 'NO') {
          if (evtTime > latestTimestamp) {
            latestTimestamp = evtTime;
            activityDescription = `Last voted: ${evt.eventType || evt.eventName}`;
          }
        }
      });

      if (latestTimestamp === 0) {
        const memTime = new Date(member.updatedAt || member.createdAt).getTime();
        latestTimestamp = memTime;
      }

      const diffMs = Math.max(0, now - latestTimestamp);
      const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      insights.push({
        member,
        daysInactive,
        tier: 'Inactive',
        lastActivityDescription: activityDescription,
        lastActivityDate: new Date(latestTimestamp).toISOString().split('T')[0],
      });
    });

    return insights.sort((a, b) => b.daysInactive - a.daysInactive);
  },
};
