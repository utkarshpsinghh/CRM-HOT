import {
  Member,
  AllianceEvent,
  AttendanceRecord,
  StrikeRecord,
  CommunicationRecord,
  AllianceSettings,
  AdminUser,
  VoteStatus,
  AttendanceStatus,
  InactiveMemberInsight
} from '../types/crm';
import { storageService } from './storage';

export const apiService = {
  // Check if live Google Sheets backend should be used
  isLiveSheets(settings: AllianceSettings): boolean {
    return !settings.demoMode && Boolean(settings.gasWebAppUrl && settings.gasWebAppUrl.startsWith('http'));
  },

  // Test connection to Google Apps Script Web App
  async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'Invalid URL format. Must start with https://script.google.com' };
    }
    try {
      const pingUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
      const response = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
      });
      const data = await response.json();
      if (data && data.status === 'success') {
        return { success: true, message: 'Connected to HOT Alliance Google Sheets successfully!' };
      }
      return { success: false, message: data.message || 'Server returned non-success response.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Could not reach Apps Script endpoint: ${msg}` };
    }
  },

  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------
  async login(username: string, pass: string, settings: AllianceSettings): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    // If live GAS endpoint is enabled
    if (this.isLiveSheets(settings)) {
      try {
        const response = await fetch(settings.gasWebAppUrl, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: 'login', username, password: pass }),
        });
        const data = await response.json();
        if (data.status === 'success') {
          return { success: true, user: data.user };
        }
        return { success: false, error: data.message || 'Authentication failed.' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Connection error: ${msg}. Try Demo Mode.` };
      }
    }

    // Demo / Local Mode Authentication
    const normalizedUser = username.trim().toLowerCase();
    if ((normalizedUser === 'admin' || normalizedUser === 'hot_leader' || normalizedUser === 'commander') && pass === 'kingshot_hot') {
      const user: AdminUser = {
        id: 'adm-demo',
        username: username.trim(),
        role: normalizedUser === 'admin' ? 'Leader' : 'Officer',
        token: 'hot-alliance-token-' + Date.now(),
      };
      return { success: true, user };
    }

    // Also accept simple login in demo mode with hint
    if (pass === 'kingshot' || pass === 'hot') {
      const user: AdminUser = {
        id: 'adm-demo',
        username: username.trim(),
        role: 'Officer',
        token: 'hot-alliance-token-' + Date.now(),
      };
      return { success: true, user };
    }

    return {
      success: false,
      error: 'Invalid credentials. Use username "admin" and password "kingshot_hot".',
    };
  },

  // --------------------------------------------------------------------------
  // MEMBERS
  // --------------------------------------------------------------------------
  async getMembers(settings: AllianceSettings): Promise<Member[]> {
    if (this.isLiveSheets(settings)) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl}?action=getMembers`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          return json.data;
        }
      } catch {
        // Fallback to local
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
        const res = await fetch(`${settings.gasWebAppUrl}?action=getEvents`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          return json.data;
        }
      } catch {
        // Fallback
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
        await fetch(settings.gasWebAppUrl, {
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
    if (this.isLiveSheets(settings) && eventId) {
      try {
        const res = await fetch(`${settings.gasWebAppUrl}?action=getAttendance&eventId=${eventId}`, { mode: 'cors' });
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          return json.data;
        }
      } catch {
        // Fallback
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
          body: JSON.stringify({ action: 'bulkUpdateAttendance', eventId, updates }),
        });
      } catch {
        // Fallback
      }
    }

    const all = storageService.getAttendance();
    const map = new Map(updates.map(u => [u.memberId, u]));
    const now = new Date().toISOString();

    const updated = all.map(r => {
      if (r.eventId === eventId && map.has(r.memberId)) {
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
    storageService.setAttendance(updated);
  },

  // --------------------------------------------------------------------------
  // STRIKES
  // --------------------------------------------------------------------------
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
  // INACTIVITY CALCULATION LOGIC (Section 14 & 15)
  // Last Activity = latest of: latest vote, latest event attendance, latest member activity record
  // --------------------------------------------------------------------------
  calculateInactivity(
    members: Member[],
    events: AllianceEvent[],
    attendance: AttendanceRecord[],
    settings: AllianceSettings
  ): InactiveMemberInsight[] {
    const now = new Date('2026-09-27T13:30:00Z').getTime(); // Anchor to current alliance time
    const eventMap = new Map(events.map(e => [e.id, e]));

    const insights: InactiveMemberInsight[] = [];

    // Filter active and inactive members (exclude archived)
    const activeRoster = members.filter(m => m.status !== 'Archived');

    activeRoster.forEach(member => {
      const memberAtt = attendance.filter(a => a.memberId === member.id);
      let latestTimestamp = 0;
      let activityDescription = 'No recorded activity';

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

      // 2. Check member manual update / creation timestamp if no events
      if (latestTimestamp === 0) {
        const memTime = new Date(member.updatedAt || member.createdAt).getTime();
        latestTimestamp = memTime;
        activityDescription = 'Roster enrollment';
      }

      // Compute days inactive
      const diffMs = Math.max(0, now - latestTimestamp);
      const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let tier: 'Warning' | 'Inactive' | 'Critical' | null = null;
      if (daysInactive >= settings.inactivityCriticalDays) {
        tier = 'Critical';
      } else if (daysInactive >= settings.inactivityInactiveDays) {
        tier = 'Inactive';
      } else if (daysInactive >= settings.inactivityWarningDays) {
        tier = 'Warning';
      }

      if (tier) {
        insights.push({
          member,
          daysInactive,
          tier,
          lastActivityDescription: activityDescription,
          lastActivityDate: new Date(latestTimestamp).toISOString().split('T')[0],
        });
      }
    });

    // Sort by highest days inactive
    return insights.sort((a, b) => b.daysInactive - a.daysInactive);
  }
};
