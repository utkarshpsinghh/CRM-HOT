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
  // Purge any legacy mock / demo data from localStorage (runs once per session for speed)
  purgeMockJunk() {
    try {
      if (sessionStorage.getItem('crm_hot_purged')) return;
      sessionStorage.setItem('crm_hot_purged', 'true');

      // 1. Purge old mock members (e.g. mem-001..mem-092 or names like HOT_Ares)
      const rawMem = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (rawMem) {
        const mems: Member[] = JSON.parse(rawMem);
        const filtered = mems.filter(m => !/^mem-\d{3}$/.test(m.id) && m.name !== 'HOT_Ares' && m.name !== 'Valkyrie_HOT');
        if (filtered.length !== mems.length) {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
        }
      }

      // 2. Purge old mock events (e.g. evt-001..evt-006 or Tri Alliance Level 1 Showdown)
      const rawEvt = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (rawEvt) {
        const evts: AllianceEvent[] = JSON.parse(rawEvt);
        const filtered = evts.filter(e => !/^evt-\d{3}$/.test(e.id) && !e.eventName.includes('Showdown') && !e.eventName.includes('Siege'));
        if (filtered.length !== evts.length) {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
        }
      }

      // 3. Purge old mock attendance
      const rawAtt = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (rawAtt) {
        const att: AttendanceRecord[] = JSON.parse(rawAtt);
        const filtered = att.filter(a => !/^att-evt-\d{3}/.test(a.id));
        if (filtered.length !== att.length) {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
        }
      }

      // 4. Purge old mock strikes
      const rawStrk = localStorage.getItem(STORAGE_KEYS.STRIKES);
      if (rawStrk) {
        const strks: StrikeRecord[] = JSON.parse(rawStrk);
        const filtered = strks.filter(s => !/^strk-\d{3}$/.test(s.id));
        if (filtered.length !== strks.length) {
          localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(filtered));
        }
      }

      // 5. Purge old mock comms
      const rawComms = localStorage.getItem(STORAGE_KEYS.COMMUNICATION);
      if (rawComms) {
        const comms: CommunicationRecord[] = JSON.parse(rawComms);
        const filtered = comms.filter(c => !/^comm-\d{3}$/.test(c.id));
        if (filtered.length !== comms.length) {
          localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(filtered));
        }
      }

      // 6. Purge old mock contributions
      const rawCnt = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
      if (rawCnt) {
        const cnts: OfficerContribution[] = JSON.parse(rawCnt);
        const filtered = cnts.filter(c => !/^cnt-\d{3}$/.test(c.id));
        if (filtered.length !== cnts.length) {
          localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.warn('Error purging mock junk:', err);
    }
  },

  // Initialization check: clean empty arrays, never seed mock data
  init() {
    this.purgeMockJunk();
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      const existingSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!existingSettings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS)) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(initialAdmins));
      }
      if (!localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS)) {
        localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify([]));
      }
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    // Check if an environment variable or default configuration provides a Google Apps Script endpoint
    if (DEFAULT_GAS_URL) {
      const current = this.getSettings();
      if (!current.gasWebAppUrl || !current.gasWebAppUrl.startsWith('http')) {
        current.gasWebAppUrl = DEFAULT_GAS_URL;
        current.demoMode = false;
        this.setSettings(current);
      }
    }
  },

  resetToDefaults() {
    const currentSettings = this.getSettings();
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify([]));
    // Preserve existing sheet URL if user has one configured
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      ...initialSettings,
      gasWebAppUrl: currentSettings.gasWebAppUrl || DEFAULT_GAS_URL || '',
      demoMode: !currentSettings.gasWebAppUrl && !DEFAULT_GAS_URL,
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

  // Batch save all CRM entities to minimize disk I/O latency
  saveAllData(bundle: {
    members?: Member[];
    events?: AllianceEvent[];
    attendance?: AttendanceRecord[];
    strikes?: StrikeRecord[];
    communications?: CommunicationRecord[];
    admins?: AdminAccount[];
    contributions?: OfficerContribution[];
  }) {
    try {
      if (Array.isArray(bundle.members)) localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(bundle.members));
      if (Array.isArray(bundle.events)) localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(bundle.events));
      if (Array.isArray(bundle.attendance)) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(bundle.attendance));
      if (Array.isArray(bundle.strikes)) localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify(bundle.strikes));
      if (Array.isArray(bundle.communications)) localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify(bundle.communications));
      if (Array.isArray(bundle.admins)) localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(bundle.admins));
      if (Array.isArray(bundle.contributions)) localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(bundle.contributions));
    } catch (err) {
      console.warn('saveAllData error:', err);
    }
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

  updateAdminProfile(adminId: string, name: string, username?: string): boolean {
    const admins = this.getAdminAccounts();
    let target = admins.find(a => a.id === adminId);
    if (!target && username) {
      target = admins.find(a => a.username.toLowerCase() === username.toLowerCase());
    }
    if (target) {
      target.name = name;
      this.setAdminAccounts(admins);
    }
    // Also update current active auth session in localStorage
    const currentAuth = this.getAuth();
    if (currentAuth) {
      if (currentAuth.id === adminId || (username && currentAuth.username.toLowerCase() === username.toLowerCase())) {
        currentAuth.name = name;
        this.setAuth(currentAuth);
      }
    }
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
