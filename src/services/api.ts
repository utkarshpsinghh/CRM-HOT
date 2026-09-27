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
  InactiveMemberInsight,
  OfficerContribution,
} from '../types/crm';
import { storageService } from './storage';
import { getLoginAttemptState, recordFailedAttempt, resetLoginAttempts, addSecurityLog } from '../utils/security';

// Helper to ensure Google Apps Script Web App URL ends with /exec
export function normalizeGasUrl(url: string): string {
  let clean = (url || '').trim();
  if (clean.includes('/macros/s/') && !clean.includes('/exec')) {
    clean = clean.replace(/\/?$/, '/exec');
  }
  return clean;
}

export const apiService = {
  // Check if live Google Sheets backend should be used
  isLiveSheets(settings: AllianceSettings): boolean {
    if (!settings) return false;
    const url = (settings.gasWebAppUrl || '').trim();
    if (!url.startsWith('http')) return false;
    return !settings.demoMode;
  },

  // Test connection to Google Apps Script Web App
  async testConnection(url: string): Promise<{ success: boolean; message: string; normalizedUrl?: string }> {
    const clean = normalizeGasUrl(url);
    if (!clean || !clean.startsWith('http')) {
      return { success: false, message: 'Invalid URL format. Must start with https://script.google.com' };
    }
    if (clean.includes('docs.google.com/spreadsheets')) {
      return {
        success: false,
        message: 'You entered a Google Sheet document link. Please enter the deployed Apps Script Web App URL (starts with https://script.google.com/macros/s/.../exec).',
      };
    }
    try {
      const pingUrl = clean.includes('?') ? `${clean}&action=ping` : `${clean}?action=ping`;
      const response = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
      });
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
          return {
            success: false,
            message: 'Server returned HTML instead of JSON. Ensure your Apps Script Web App URL ends with /exec and deployment access is set to "Anyone".',
          };
        }
        return { success: false, message: 'Could not parse response from server as JSON.' };
      }

      if (data && (data.status === 'success' || data.ok === true)) {
        return {
          success: true,
          message: 'Connected to HOT Alliance Google Sheets successfully!',
          normalizedUrl: clean,
        };
      }
      return { success: false, message: data?.message || 'Server returned non-success response.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Could not reach Apps Script endpoint: ${msg}. Make sure deployment access is set to "Anyone".` };
    }
  },

  // --------------------------------------------------------------------------
  // UNIFIED FAST DATA FETCH (1 single network round-trip instead of 7)
  // --------------------------------------------------------------------------
  async getAllData(settings: AllianceSettings): Promise<any | null> {
    if (!this.isLiveSheets(settings)) return null;
    try {
      const url = `${normalizeGasUrl(settings.gasWebAppUrl)}?action=getAllData`;
      const res = await fetch(url, { mode: 'cors' });
      const json = await res.json();
      if (json && (json.status === 'success' || json.ok === true) && json.data) {
        return json.data;
      }
    } catch (err) {
      console.warn('getAllData fetch error, will fallback:', err);
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

    // Check brute-force lockout status
    const attemptState = getLoginAttemptState();
    if (attemptState.isLocked) {
      const minutes = Math.floor(attemptState.remainingSeconds / 60);
      const seconds = attemptState.remainingSeconds % 60;
      const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      return {
        success: false,
        error: `Account temporarily locked due to repeated failed attempts. Please wait ${formatted} before trying again.`,
      };
    }

    // ------------------------------------------------------------------------
    // CASE 1: Live Google Sheet Connected
    // When sheet is connected, ONLY authenticate against Google Sheets!
    // Both username and password must match correctly in the sheet.
    // ------------------------------------------------------------------------
    if (this.isLiveSheets(settings)) {
      try {
        const gasUrl = normalizeGasUrl(settings.gasWebAppUrl);
        const response = await fetch(gasUrl, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'login', username: cleanUser, password: cleanPass }),
        });

        const rawText = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          recordFailedAttempt(cleanUser);
          return {
            success: false,
            error: 'Invalid response from Google Sheets server. Verify Apps Script Web App deployment.',
          };
        }

        if (data && (data.status === 'success' || data.success === true) && data.user) {
          resetLoginAttempts(cleanUser);
          const rawRole = String(data.user.role || '').trim().toLowerCase();
          const isLeaderRole = (rawRole === 'leader' || rawRole === 'mainadmin' || rawRole === 'r5');
          const role: 'MainAdmin' | 'SubAdmin' = isLeaderRole ? 'MainAdmin' : 'SubAdmin';

          const user: AdminUser = {
            id: String(data.user.id || 'adm-' + Date.now()),
            username: String(data.user.username || cleanUser),
            name: String(data.user.name || cleanUser),
            role,
            token: String(data.user.token || 'live-token-' + Date.now()),
          };

          return { success: true, user, initialData: data.data };
        }

        recordFailedAttempt(cleanUser);
        return {
          success: false,
          error: data?.message || 'Invalid username or password in alliance database.',
        };
      } catch (err: unknown) {
        recordFailedAttempt(cleanUser);
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          error: `Could not reach Google Sheets server: ${msg}. Check network or sheet deployment.`,
        };
      }
    }

    // ------------------------------------------------------------------------
    // CASE 2: Google Sheet NOT Connected (Local Mode)
    // STRICT RULE: Only user "seoyoon" with password "masterlogin" can pass!
    // Other than these credentials, DO NOT pass any user!
    // ------------------------------------------------------------------------
    if (cleanUser.toLowerCase() === 'seoyoon' && cleanPass === 'masterlogin') {
      resetLoginAttempts('seoyoon');
      const user: AdminUser = {
        id: 'adm-seoyoon',
        username: 'seoyoon',
        role: 'MainAdmin',
        name: 'Seoyoon',
        token: 'hot-master-token-' + Date.now(),
      };
      return { success: true, user };
    }

    // Reject all other credentials
    recordFailedAttempt(cleanUser);
    return {
      success: false,
      error: 'Access Denied. Invalid credentials.',
    };
  },

  // --------------------------------------------------------------------------
  // MEMBERS
  // --------------------------------------------------------------------------
  async getMembers(settings: AllianceSettings): Promise<Member[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl.trim()}?action=getMembers`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          storageService.setMembers(json.data);
          return json.data;
        }
      } catch (err) {
        console.warn('Google Sheets getMembers error:', err);
      }
    }
    return storageService.getMembers();
  },

  async createMember(newMember: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'strikes'>, settings: AllianceSettings): Promise<Member> {
    const now = new Date().toISOString();
    const id = `mem-${Date.now().toString().slice(-6)}`;
    const fullMember: Member = {
      ...newMember,
      id,
      strikes: 0,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };

    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'createMember', member: fullMember }),
        });
      } catch {
        // Fallback
      }
    }

    // Always update local cache
    const current = storageService.getMembers();
    storageService.setMembers([fullMember, ...current]);
    return fullMember;
  },

  async updateMember(member: Member, settings: AllianceSettings): Promise<void> {
    const updated = { ...member, updatedAt: new Date().toISOString() };
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'updateMember', member: updated }),
        });
      } catch {
        // Fallback
      }
    }

    const current = storageService.getMembers();
    const list = current.map(m => (m.id === member.id ? updated : m));
    storageService.setMembers(list);
  },

  async archiveMember(memberId: string, settings: AllianceSettings): Promise<void> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'archiveMember', memberId }),
        });
      } catch {
        // Fallback
      }
    }

    const current = storageService.getMembers();
    const list = current.map(m => (m.id === memberId ? { ...m, status: 'Archived' as const, updatedAt: new Date().toISOString() } : m));
    storageService.setMembers(list);
  },

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------
  async getEvents(settings: AllianceSettings): Promise<AllianceEvent[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl.trim()}?action=getEvents`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          storageService.setEvents(json.data);
          return json.data;
        }
      } catch (err) {
        console.warn('Google Sheets getEvents error:', err);
      }
    }
    return storageService.getEvents();
  },

  async createEvent(eventInput: Omit<AllianceEvent, 'id' | 'createdAt'>, members: Member[], settings: AllianceSettings): Promise<AllianceEvent> {
    const eventId = `evt-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const newEvent: AllianceEvent = {
      ...eventInput,
      id: eventId,
      createdAt: now,
    };

    // Auto-generate attendance rows for ALL active members
    const activeMembers = members.filter(m => m.status !== 'Archived');
    const newAttendanceRows: AttendanceRecord[] = activeMembers.map(m => ({
      id: `att-${eventId}-${m.id}`,
      eventId: eventId,
      memberId: m.id,
      voteStatus: 'NO RESPONSE',
      attendanceStatus: 'NOT_APPLICABLE',
      updatedAt: now,
    }));

    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl.trim(), {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'createEvent', event: newEvent }),
        });
      } catch {
        // Fallback
      }
    }

    // Save locally
    const currentEvents = storageService.getEvents();
    storageService.setEvents([newEvent, ...currentEvents]);

    const currentAttendance = storageService.getAttendance();
    storageService.setAttendance([...newAttendanceRows, ...currentAttendance]);

    return newEvent;
  },

  // --------------------------------------------------------------------------
  // ATTENDANCE
  // --------------------------------------------------------------------------
  async getAttendance(eventId: string | undefined, settings: AllianceSettings): Promise<AttendanceRecord[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const url = eventId
          ? `${settings.gasWebAppUrl.trim()}?action=getAttendance&eventId=${eventId}`
          : `${settings.gasWebAppUrl.trim()}?action=getAttendance`;
        const res = await fetch(url, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          if (!eventId) {
            storageService.setAttendance(json.data);
          }
          return json.data;
        }
      } catch (err) {
        console.warn('Google Sheets getAttendance error:', err);
      }
    }
    const all = storageService.getAttendance();
    return eventId ? all.filter(a => a.eventId === eventId) : all;
  },

  async updateVote(eventId: string, memberId: string, voteStatus: VoteStatus, settings: AllianceSettings): Promise<void> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateVote', eventId, memberId, voteStatus }),
        });
      } catch {
        // Fallback
      }
    }

    const all = storageService.getAttendance();
    let matched = false;
    const now = new Date().toISOString();
    const updated = all.map(r => {
      if (r.eventId === eventId && r.memberId === memberId) {
        matched = true;
        return { ...r, voteStatus, updatedAt: now };
      }
      return r;
    });

    if (!matched) {
      updated.push({
        id: `att-${eventId}-${memberId}`,
        eventId,
        memberId,
        voteStatus,
        attendanceStatus: 'NOT_APPLICABLE',
        updatedAt: now,
      });
    }
    storageService.setAttendance(updated);
  },

  async updateAttendance(eventId: string, memberId: string, attendanceStatus: AttendanceStatus, settings: AllianceSettings): Promise<void> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateAttendance', eventId, memberId, attendanceStatus }),
        });
      } catch {
        // Fallback
      }
    }

    const all = storageService.getAttendance();
    let matched = false;
    const now = new Date().toISOString();
    const updated = all.map(r => {
      if (r.eventId === eventId && r.memberId === memberId) {
        matched = true;
        return { ...r, attendanceStatus, updatedAt: now };
      }
      return r;
    });

    if (!matched) {
      updated.push({
        id: `att-${eventId}-${memberId}`,
        eventId,
        memberId,
        voteStatus: 'NO RESPONSE',
        attendanceStatus,
        updatedAt: now,
      });
    }
    storageService.setAttendance(updated);
  },

  async bulkUpdateAttendance(
    eventId: string,
    updates: Array<{ memberId: string; voteStatus?: VoteStatus; attendanceStatus?: AttendanceStatus }>,
    settings: AllianceSettings
  ): Promise<void> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'bulkUpdateAttendance', eventId, updates }),
        });
      } catch {
        // Fallback
      }
    }

    const all = storageService.getAttendance();
    const map = new Map(updates.map(u => [u.memberId, u]));
    const matchedMembers = new Set<string>();
    const now = new Date().toISOString();

    const updated = all.map(r => {
      if (r.eventId === eventId && map.has(r.memberId)) {
        matchedMembers.add(r.memberId);
        const u = map.get(r.memberId)!;
        return {
          ...r,
          voteStatus: u.voteStatus !== undefined ? u.voteStatus : r.voteStatus,
          attendanceStatus: u.attendanceStatus !== undefined ? u.attendanceStatus : r.attendanceStatus,
          updatedAt: now,
        };
      }
      return r;
    });

    updates.forEach(u => {
      if (!matchedMembers.has(u.memberId)) {
        updated.push({
          id: `att-${eventId}-${u.memberId}`,
          eventId,
          memberId: u.memberId,
          voteStatus: u.voteStatus || 'NO RESPONSE',
          attendanceStatus: u.attendanceStatus || 'NOT_APPLICABLE',
          updatedAt: now,
        });
      }
    });
    storageService.setAttendance(updated);
  },

  // --------------------------------------------------------------------------
  // STRIKES
  // --------------------------------------------------------------------------
  async getStrikes(settings: AllianceSettings): Promise<StrikeRecord[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl.trim()}?action=getStrikes`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          storageService.setStrikes(json.data);
          return json.data;
        }
      } catch (err) {
        console.warn('Google Sheets getStrikes error:', err);
      }
    }
    return storageService.getStrikes();
  },

  async addStrike(memberId: string, reason: string, addedBy: string, settings: AllianceSettings): Promise<StrikeRecord> {
    const strikeId = `strk-${Date.now().toString().slice(-6)}`;
    const date = new Date().toISOString().split('T')[0];
    const newStrike: StrikeRecord = {
      id: strikeId,
      memberId,
      date,
      reason,
      addedBy,
    };

    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'addStrike', memberId, reason, addedBy }),
        });
      } catch {
        // Fallback
      }
    }

    // Save strike record
    const strikes = storageService.getStrikes();
    storageService.setStrikes([newStrike, ...strikes]);

    // Update member strike counter
    const members = storageService.getMembers();
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, strikes: m.strikes + 1, updatedAt: new Date().toISOString() };
      }
      return m;
    });
    storageService.setMembers(updatedMembers);

    return newStrike;
  },

  async removeStrike(strikeId: string, memberId: string, settings: AllianceSettings): Promise<void> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'removeStrike', strikeId, memberId }),
        });
      } catch {
        // Fallback
      }
    }

    const strikes = storageService.getStrikes();
    storageService.setStrikes(strikes.filter(s => s.id !== strikeId));

    const members = storageService.getMembers();
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, strikes: Math.max(0, m.strikes - 1), updatedAt: new Date().toISOString() };
      }
      return m;
    });
    storageService.setMembers(updatedMembers);
  },

  // --------------------------------------------------------------------------
  // COMMUNICATIONS
  // --------------------------------------------------------------------------
  async getCommunications(settings: AllianceSettings): Promise<CommunicationRecord[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl.trim()}?action=getCommunications`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          storageService.setCommunications(json.data);
          return json.data;
        }
      } catch (err) {
        console.warn('Google Sheets getCommunications error:', err);
      }
    }
    return storageService.getCommunications();
  },

  async addCommunication(memberId: string, status: Member['communication'], note: string, addedBy: string, settings: AllianceSettings): Promise<CommunicationRecord> {
    const id = `comm-${Date.now().toString().slice(-6)}`;
    const date = new Date().toISOString().split('T')[0];
    const newComm: CommunicationRecord = {
      id,
      memberId,
      status,
      note,
      date,
      addedBy,
    };

    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'addCommunication', memberId, status, note, addedBy }),
        });
      } catch {
        // Fallback
      }
    }

    const comms = storageService.getCommunications();
    storageService.setCommunications([newComm, ...comms]);

    // Update member communication and note
    const members = storageService.getMembers();
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, communication: status, communicationNote: note, updatedAt: new Date().toISOString() };
      }
      return m;
    });
    storageService.setMembers(updatedMembers);

    return newComm;
  },

  // --------------------------------------------------------------------------
  // INACTIVITY CALCULATION LOGIC
  // --------------------------------------------------------------------------
  calculateInactivity(
    members: Member[],
    events: AllianceEvent[],
    attendance: AttendanceRecord[],
    settings: AllianceSettings
  ): InactiveMemberInsight[] {
    const now = Date.now();
    const eventMap = new Map(events.map(e => [e.id, e]));

    const insights: InactiveMemberInsight[] = [];

    // Filter active and inactive members (exclude archived)
    const activeRoster = members.filter(m => m.status !== 'Archived');

    activeRoster.forEach(member => {
      const memberAtt = attendance.filter(a => a.memberId === member.id);
      let latestTimestamp = 0;
      let activityDescription = 'No recent activity';

      // 1. Check event attendance & votes
      memberAtt.forEach(rec => {
        const evt = eventMap.get(rec.eventId);
        if (!evt) return;
        const evtTime = new Date(evt.date).getTime();

        if (rec.attendanceStatus === 'JOINED') {
          if (evtTime > latestTimestamp) {
            latestTimestamp = evtTime;
            activityDescription = `Joined ${evt.eventType || evt.eventName}`;
          }
        } else if (rec.voteStatus === 'YES' || rec.voteStatus === 'NO') {
          if (evtTime > latestTimestamp) {
            latestTimestamp = evtTime;
            activityDescription = `Voted on ${evt.eventType || evt.eventName}`;
          }
        }
      });

      // 2. Check if member has explicit lastActivityDate
      if (member.lastActivityDate) {
        const actTime = new Date(member.lastActivityDate).getTime();
        if (actTime > latestTimestamp) {
          latestTimestamp = actTime;
          activityDescription = member.lastActivitySource || 'Roster activity';
        }
      }

      // 3. Compute baseline days inactive from timestamp if found
      let daysInactive = 0;
      if (latestTimestamp > 0) {
        const diffMs = Math.max(0, now - latestTimestamp);
        daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      // 4. Check communication note for explicit offline/inactive day counts
      const note = member.communicationNote || '';
      const dayMatch = note.match(/(\d+)\s+days/i);
      const noteDays = dayMatch ? parseInt(dayMatch[1], 10) : 0;

      if (noteDays > daysInactive) {
        daysInactive = noteDays;
        latestTimestamp = now - (noteDays * 24 * 60 * 60 * 1000);
        activityDescription = note;
      } else if (member.status === 'Inactive') {
        // Members explicitly marked Inactive are at least 8 to 15 days inactive
        if (daysInactive < (settings.inactivityInactiveDays || 7)) {
          daysInactive = 10;
          latestTimestamp = now - (10 * 24 * 60 * 60 * 1000);
          activityDescription = note || 'Flagged as inactive in alliance roster';
        }
      } else if (member.communication === 'Warning' && daysInactive < (settings.inactivityWarningDays || 3)) {
        daysInactive = 4;
        latestTimestamp = now - (4 * 24 * 60 * 60 * 1000);
        activityDescription = note || 'Warning: missed recent votes';
      }

      let tier: 'Warning' | 'Inactive' | 'Critical' | null = null;
      if (daysInactive >= (settings.inactivityCriticalDays || 14)) {
        tier = 'Critical';
      } else if (daysInactive >= (settings.inactivityInactiveDays || 7)) {
        tier = 'Inactive';
      } else if (daysInactive >= (settings.inactivityWarningDays || 3)) {
        tier = 'Warning';
      } else if (member.status === 'Inactive') {
        tier = 'Inactive';
      }

      if (tier) {
        const effectiveDate = latestTimestamp > 0
          ? new Date(latestTimestamp).toISOString().split('T')[0]
          : new Date(now - daysInactive * 86400000).toISOString().split('T')[0];

        insights.push({
          member,
          daysInactive: Math.max(daysInactive, tier === 'Critical' ? 14 : tier === 'Inactive' ? 7 : 3),
          tier,
          lastActivityDescription: activityDescription,
          lastActivityDate: effectiveDate,
        });
      }
    });

    // Sort by highest days inactive
    return insights.sort((a, b) => b.daysInactive - a.daysInactive);
  },

  // --------------------------------------------------------------------------
  // ADMIN MANAGEMENT
  // --------------------------------------------------------------------------
  async getAdmins(settings: AllianceSettings): Promise<AdminAccount[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl}?action=getAdmins`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          return json.data;
        }
      } catch {
        // Fallback to local
      }
    }
    return storageService.getAdminAccounts();
  },

  async createAdmin(
    data: Omit<AdminAccount, 'id' | 'createdAt'>,
    settings: AllianceSettings
  ): Promise<AdminAccount> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'createAdmin', admin: data }),
        });
      } catch {
        // Fallback
      }
    }
    return storageService.createAdminAccount(data);
  },

  async deleteAdmin(adminId: string, settings: AllianceSettings): Promise<boolean> {
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'deleteAdmin', adminId }),
        });
      } catch {
        // Fallback
      }
    }
    return storageService.deleteAdminAccount(adminId);
  },

  // --------------------------------------------------------------------------
  // CONTRIBUTIONS & AUDIT
  // --------------------------------------------------------------------------
  async getContributions(settings: AllianceSettings): Promise<OfficerContribution[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl}?action=getContributions`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          return json.data;
        }
      } catch {
        // Fallback
      }
    }
    return storageService.getContributions();
  },

  async recordContribution(
    data: Omit<OfficerContribution, 'id' | 'timestamp'>,
    settings: AllianceSettings
  ): Promise<OfficerContribution> {
    const entry = storageService.recordContribution(data);
    if (this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'recordContribution', contribution: entry }),
        });
      } catch {
        // Logged locally
      }
    }
    return entry;
  },

  async updateAdminPassword(adminId: string, newPass: string, settings: AllianceSettings): Promise<boolean> {
    const success = storageService.updateAdminPassword(adminId, newPass);
    if (success && this.isLiveSheets(settings)) {
      try {
        await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'updatePassword', adminId, password: newPass }),
        });
      } catch {
        // Local only
      }
    }
    return success;
  },

  async updateAdminProfile(adminId: string, name: string, settings: AllianceSettings, username?: string): Promise<boolean> {
    storageService.updateAdminProfile(adminId, name, username);
    if (this.isLiveSheets(settings)) {
      try {
        const gasUrl = normalizeGasUrl(settings.gasWebAppUrl);
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'updateProfile', adminId, username, name }),
        });
      } catch {
        // Local fallback
      }
    }
    return true;
  }
};

