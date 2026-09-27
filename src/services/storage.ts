import { Member, AllianceEvent, AttendanceRecord, StrikeRecord, CommunicationRecord, AllianceSettings } from '../types/crm';
import { initialMembers, initialEvents, generateInitialAttendance, initialStrikes, initialCommunications, initialSettings } from './mockData';

const STORAGE_KEYS = {
  MEMBERS: 'crm_hot_members_v1',
  EVENTS: 'crm_hot_events_v1',
  ATTENDANCE: 'crm_hot_attendance_v1',
  STRIKES: 'crm_hot_strikes_v1',
  COMMUNICATION: 'crm_hot_comms_v1',
  SETTINGS: 'crm_hot_settings_v1',
  ADMIN: 'crm_hot_auth_v1',
};

export const storageService = {
  // Initialization check
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
      this.resetToDefaults();
    }
  },

  resetToDefaults() {
    const attendance = generateInitialAttendance(initialMembers, initialEvents);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(initialMembers));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(initialStrikes));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(initialCommunications));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
  },

  getMembers(): Member[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return raw ? JSON.parse(raw) : initialMembers;
  },

  setMembers(members: Member[]) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  },

  getEvents(): AllianceEvent[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return raw ? JSON.parse(raw) : initialEvents;
  },

  setEvents(events: AllianceEvent[]) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  },

  getAttendance(): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return raw ? JSON.parse(raw) : [];
  },

  setAttendance(records: AttendanceRecord[]) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  },

  getStrikes(): StrikeRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STRIKES);
    return raw ? JSON.parse(raw) : initialStrikes;
  },

  setStrikes(strikes: StrikeRecord[]) {
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(strikes));
  },

  getCommunications(): CommunicationRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNICATION);
    return raw ? JSON.parse(raw) : initialCommunications;
  },

  setCommunications(comms: CommunicationRecord[]) {
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(comms));
  },

  getSettings(): AllianceSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : initialSettings;
  },

  setSettings(settings: AllianceSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getAuth() {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIN);
    return raw ? JSON.parse(raw) : null;
  },

  setAuth(user: unknown) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN);
    }
  },

  exportDatabaseJSON(): string {
    const data = {
      members: this.getMembers(),
      events: this.getEvents(),
      attendance: this.getAttendance(),
      strikes: this.getStrikes(),
      communications: this.getCommunications(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString(),
      alliance: 'HOT Kingshot Alliance',
    };
    return JSON.stringify(data, null, 2);
  },

  importDatabaseJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.members)) this.setMembers(data.members);
      if (Array.isArray(data.events)) this.setEvents(data.events);
      if (Array.isArray(data.attendance)) this.setAttendance(data.attendance);
      if (Array.isArray(data.strikes)) this.setStrikes(data.strikes);
      if (Array.isArray(data.communications)) this.setCommunications(data.communications);
      if (data.settings) this.setSettings(data.settings);
      return true;
    } catch {
      return false;
    }
  }
};
