import { Member, AllianceEvent, AttendanceRecord, StrikeRecord, CommunicationRecord, AllianceSettings, AdminAccount, OfficerContribution } from '../types/crm';
import { initialMembers, initialEvents, generateInitialAttendance, initialStrikes, initialCommunications, initialSettings, initialAdmins, initialContributions, DEFAULT_GAS_URL } from './mockData';

const STORAGE_KEYS = {
  MEMBERS: 'crm_hot_members_v1',
  EVENTS: 'crm_hot_events_v1',
  ATTENDANCE: 'crm_hot_attendance_v1',
  STRIKES: 'crm_hot_strikes_v1',
  COMMUNICATION: 'crm_hot_comms_v1',
  SETTINGS: 'crm_hot_settings_v1',
  ADMIN: 'crm_hot_auth_v1',
  ADMIN_ACCOUNTS: 'crm_hot_admin_accounts_v1',
  CONTRIBUTIONS: 'crm_hot_contributions_v1',
  INITIALIZED: 'crm_hot_initialized_v2',
};

export const storageService = {
  // Initialization check: never overwrite existing settings or sheet configurations
  init() {
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      const existingSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!existingSettings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(initialMembers));
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(generateInitialAttendance(initialMembers, initialEvents)));
        localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(initialStrikes));
        localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(initialCommunications));
      }
      if (!localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS)) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(initialAdmins));
      }
      if (!localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS)) {
        localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(initialContributions));
      }
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    // Check if an environment variable provides a Google Apps Script endpoint
    if (DEFAULT_GAS_URL) {
      const current = this.getSettings();
      if (!current.gasWebAppUrl) {
        current.gasWebAppUrl = DEFAULT_GAS_URL;
        current.demoMode = false;
        this.setSettings(current);
      }
    }
  },

  resetToDefaults() {
    const currentSettings = this.getSettings();
    const attendance = generateInitialAttendance(initialMembers, initialEvents);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(initialMembers));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(initialStrikes));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(initialCommunications));
    // Preserve existing sheet URL if user has one configured
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      ...initialSettings,
      gasWebAppUrl: currentSettings.gasWebAppUrl || '',
      demoMode: !currentSettings.gasWebAppUrl,
    }));
    if (!localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(initialAdmins));
    }
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  // Clear all local mock/demo data so only pure Google Sheets data is retained
  clearLocalMockData() {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  getMembers(): Member[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return raw ? JSON.parse(raw) : [];
  },

  setMembers(members: Member[]) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  },

  getEvents(): AllianceEvent[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return raw ? JSON.parse(raw) : [];
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
    return raw ? JSON.parse(raw) : [];
  },

  setStrikes(strikes: StrikeRecord[]) {
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(strikes));
  },

  getCommunications(): CommunicationRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNICATION);
    return raw ? JSON.parse(raw) : [];
  },

  setCommunications(comms: CommunicationRecord[]) {
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(comms));
  },

  getSettings(): AllianceSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return initialSettings;
    try {
      const parsed: AllianceSettings = JSON.parse(raw);
      // Auto-detect: if a Google Apps Script URL is saved, live mode should be active
      if (parsed.gasWebAppUrl && parsed.gasWebAppUrl.trim().startsWith('http')) {
        parsed.demoMode = false;
      } else if (DEFAULT_GAS_URL && DEFAULT_GAS_URL.startsWith('http')) {
        parsed.gasWebAppUrl = DEFAULT_GAS_URL;
        parsed.demoMode = false;
      }
      return parsed;
    } catch {
      return initialSettings;
    }
  },

  setSettings(settings: AllianceSettings) {
    const url = (settings.gasWebAppUrl || '').trim();
    const hasUrl = Boolean(url.startsWith('http'));
    const updated: AllianceSettings = {
      ...settings,
      gasWebAppUrl: url,
      demoMode: hasUrl ? false : Boolean(settings.demoMode),
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
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

  // Admin Account Management
  getAdminAccounts(): AdminAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS);
    return raw ? JSON.parse(raw) : initialAdmins;
  },

  setAdminAccounts(admins: AdminAccount[]) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(admins));
  },

  createAdminAccount(data: Omit<AdminAccount, 'id' | 'createdAt'>): AdminAccount {
    const admins = this.getAdminAccounts();
    const newAdmin: AdminAccount = {
      ...data,
      id: `adm-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    admins.push(newAdmin);
    this.setAdminAccounts(admins);
    return newAdmin;
  },

  deleteAdminAccount(id: string): boolean {
    const admins = this.getAdminAccounts();
    // Cannot delete main admin
    const target = admins.find(a => a.id === id);
    if (!target || target.role === 'MainAdmin' || target.username.toLowerCase() === 'admin') {
      return false;
    }
    const filtered = admins.filter(a => a.id !== id);
    this.setAdminAccounts(filtered);
    return true;
  },

  updateAdminPassword(adminId: string, newPass: string): boolean {
    const admins = this.getAdminAccounts();
    const target = admins.find(a => a.id === adminId);
    if (!target) return false;
    target.password = newPass;
    this.setAdminAccounts(admins);
    return true;
  },

  updateAdminProfile(adminId: string, name: string): boolean {
    const admins = this.getAdminAccounts();
    const target = admins.find(a => a.id === adminId);
    if (!target) return false;
    target.name = name;
    this.setAdminAccounts(admins);
    return true;
  },

  // Contributions Management
  getContributions(): OfficerContribution[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
    return raw ? JSON.parse(raw) : initialContributions;
  },

  setContributions(contributions: OfficerContribution[]) {
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(contributions));
  },

  recordContribution(data: Omit<OfficerContribution, 'id' | 'timestamp'>): OfficerContribution {
    const list = this.getContributions();
    const newEntry: OfficerContribution = {
      ...data,
      id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newEntry);
    this.setContributions(list);
    return newEntry;
  },

  exportDatabaseJSON(): string {
    const data = {
      members: this.getMembers(),
      events: this.getEvents(),
      attendance: this.getAttendance(),
      strikes: this.getStrikes(),
      communications: this.getCommunications(),
      contributions: this.getContributions(),
      settings: this.getSettings(),
      adminAccounts: this.getAdminAccounts().map(a => ({ id: a.id, username: a.username, role: a.role, name: a.name, createdAt: a.createdAt })),
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
      if (Array.isArray(data.contributions)) this.setContributions(data.contributions);
      if (data.settings) this.setSettings(data.settings);
      if (Array.isArray(data.adminAccounts)) this.setAdminAccounts(data.adminAccounts);
      return true;
    } catch {
      return false;
    }
  }
};
