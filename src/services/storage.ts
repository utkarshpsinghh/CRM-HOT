import { Member, AllianceEvent, AttendanceRecord, StrikeRecord, CommunicationRecord, AllianceSettings, AdminAccount, OfficerContribution } from '../types/crm';
import { initialMembers, initialEvents, generateInitialAttendance, initialStrikes, initialCommunications, initialSettings, initialAdmins, initialContributions } from './mockData';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../config';
import { getComputedEventStatus } from '../utils/date';
import { resetLoginAttempts } from '../utils/security';

const STORAGE_KEYS = {
  MEMBERS: 'crm_hot_members_v1',
  EVENTS: 'crm_hot_events_v1',
  ATTENDANCE: 'crm_hot_attendance_v1',
  STRIKES: 'crm_hot_strikes_v1',
  COMMUNICATION: 'crm_hot_comms_v1',
  SETTINGS: 'crm_hot_settings_v1',
  SUPABASE_ANON_KEY: 'crm_hot_supabase_anon_key_v2',
  SUPABASE_URL: 'crm_hot_supabase_url_v2',
  UNDER_DEVELOPMENT: 'crm_hot_under_dev_v2',
  ADMIN: 'crm_hot_auth_v1',
  ADMIN_ACCOUNTS: 'crm_hot_admin_accounts_v1',
  CONTRIBUTIONS: 'crm_hot_contributions_v1',
  INITIALIZED: 'crm_hot_initialized_v2',
};

export function deduplicateMembers(members: Member[]): Member[] {
  const seen = new Map<string, Member>();
  for (const m of members) {
    if (!m || !m.name) continue;
    const key = m.name.trim().toLowerCase();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, m);
    } else {
      // Prioritize canonical 'mem-' ID which holds all attendance records
      if (m.id.startsWith('mem-') && !existing.id.startsWith('mem-')) {
        seen.set(key, m);
      }
    }
  }
  return Array.from(seen.values());
}

export const storageService = {
  // Purge any legacy mock / demo data from localStorage
  purgeMockJunk() {
    try {
      // 1. Purge all legacy mock and hardcoded placeholder members
      const rawMem = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (rawMem) {
        const mems: Member[] = JSON.parse(rawMem);
        const legacyMockNames = new Set([
          'DragonSlayer', 'ShadowNinja', 'FrostQueen', 'NightStalker', 'IronClad', 'HOT_Ares', 'Valkyrie_HOT',
          'IronClad_99', 'ShadowBlade', 'LordGrimjaw', 'QueenOfBlades', 'Thorin_Stone', 'NightStalker_X',
          'CrimsonReaper', 'DragonBane', 'SilverWolf', 'BlazeFury', 'FrostBite', 'TitanSlayer', 'PhoenixAsh',
          'Vortex_HOT', 'StormBreaker', 'GhostRider_7', 'Archon_Prime', 'BloodMoon', 'Ragnarok_88', 'ApexPredator',
          'SteelHawk', 'Kael_Sunstrider', 'OdinShield', 'SilentAssasin', 'WarMachine_01', 'DoomHammer', 'RogueOne',
          'SleepingGiant', 'LostWanderer', 'AFK_Champion', 'WarChief_Z',
          // Auto-generated placeholder members
          '[HOT] Ares', '[HOT] Valkyrie', '[HOT] MoonLight', '[HOT] ShadowKnight', '[HOT] Titan',
          '[HOT] Phoenix', '[HOT] StormBreaker', '[HOT] GhostRider', '[HOT] ApexPredator', '[HOT] NightHawk',
          '[HOT] CrimsonBlade', '[HOT] FrostBite', '[HOT] ThunderStrike', '[HOT] SilverWolf', '[HOT] Dreadnought',
          '[HOT] MysticRogue', '[HOT] IronShield', '[HOT] BlazeFury', '[HOT] DarkHorizon', '[HOT] SteelGuard',
          '[HOT] NovaBlast', '[HOT] ViperVenom', '[HOT] SolarFlare', '[HOT] EchoHunter', '[HOT] RazorEdge',
          '[HOT] WinterSoldier', '[HOT] AlphaWolf', '[HOT] TalonStrike', '[HOT] Obsidian', '[HOT] SwiftArrow',
          '[HOT] IronHeart', '[HOT] ShadowWalker', '[HOT] FrostWard', '[HOT] StormRider', '[HOT] EmberKnight',
          '[HOT] Zenith', '[HOT] Vortex', '[HOT] BlackLotus', '[HOT] CyberKnight', '[HOT] DawnSeeker',
          '[HOT] HorizonChaser', '[HOT] RuneMaster', '[HOT] WildFire', '[HOT] FrostHammer', '[HOT] StarGazer'
        ]);

        const filtered = deduplicateMembers(
          mems.filter(m =>
            !/^mem-\d+$/i.test(m.id) &&
            !legacyMockNames.has(m.name)
          )
        );
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
      }

      // 2. Purge old mock events & auto-complete past scheduled events
      const rawEvt = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (rawEvt) {
        const evts: AllianceEvent[] = JSON.parse(rawEvt);
        let modified = false;
        const filtered = evts.filter(e => !/^evt-\d+$/.test(e.id) && !e.eventName.includes('Showdown') && !e.eventName.includes('Siege'));
        if (filtered.length !== evts.length) {
          modified = true;
        }
        filtered.forEach(e => {
          if (e.status === 'Scheduled' && getComputedEventStatus(e.date) === 'Completed') {
            e.status = 'Completed';
            modified = true;
          }
        });
        if (modified) {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
        }
      }

      // 3. Purge old mock attendance
      const rawAtt = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (rawAtt) {
        const att: AttendanceRecord[] = JSON.parse(rawAtt);
        const filtered = att.filter(a => !/^att-evt-\d+/.test(a.id) && !/^att-\d+/.test(a.id));
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

      // 7. Purge extra default admins: ONLY Seoyoon remains default Main Admin
      const rawAdm = localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS);
      if (rawAdm) {
        const adms: AdminAccount[] = JSON.parse(rawAdm);
        const filtered = adms.filter(a => a.username.toLowerCase() !== 'admin');
        localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(filtered));
      }

      // Purge active auth if it was legacy admin
      const currentAuth = this.getAuth();
      if (currentAuth && currentAuth.username?.toLowerCase() === 'admin') {
        this.setAuth(null);
      }
      resetLoginAttempts();
    } catch (err) {
      console.warn('Error purging mock junk:', err);
    }
  },

  init() {
    this.purgeMockJunk();
    const rosterVersionKey = 'crm_hot_roster_v3_canonical94';
    if (!localStorage.getItem(rosterVersionKey)) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(initialMembers));
      localStorage.setItem(rosterVersionKey, 'true');
    }
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      const existingSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!existingSettings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
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
  },

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(initialMembers));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
    if (!localStorage.getItem(STORAGE_KEYS.ADMIN_ACCOUNTS)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(initialAdmins));
    }
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  // Clear all local mock/demo data so only live cloud database data is retained
  clearLocalMockData() {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  // Clear all member data completely for a clean refresh
  clearAllMembers() {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STRIKES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION, JSON.stringify([]));
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
      if (Array.isArray(bundle.members)) localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(deduplicateMembers(bundle.members)));
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
    if (!raw) return initialMembers;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return deduplicateMembers(parsed);
      return initialMembers;
    } catch {
      return initialMembers;
    }
  },

  setMembers(members: Member[]) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(deduplicateMembers(members)));
  },

  getEvents(): AllianceEvent[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!raw) return [];
    try {
      const parsed: AllianceEvent[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(e => {
          if (e.status === 'Scheduled' && getComputedEventStatus(e.date) === 'Completed') {
            return { ...e, status: 'Completed' };
          }
          return e;
        });
      }
      return [];
    } catch {
      return [];
    }
  },

  setEvents(events: AllianceEvent[]) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  },

  getAttendance(): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    const list: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
    const EVENT_ID_ALIASES: Record<string, string> = {
      'evt-1790607589476-kins': 'evt-c233df90',
      'evt-1791048690819-7icl': 'evt-6f6a9d3a',
      'evt-1791048703740-v7b9': 'evt-61922e28',
      'evt-1791049152771-k1qw': 'evt-c031d684',
      'evt-1791049171203-10e5': 'evt-f9234e34',
      'evt-1791223308841-6mkk': 'evt-4eee1101',
    };
    return list.map(a => {
      const mapped = EVENT_ID_ALIASES[a.eventId] || a.eventId;
      return mapped !== a.eventId ? { ...a, eventId: mapped } : a;
    });
  },

  setAttendance(records: AttendanceRecord[]) {
    const EVENT_ID_ALIASES: Record<string, string> = {
      'evt-1790607589476-kins': 'evt-c233df90',
      'evt-1791048690819-7icl': 'evt-6f6a9d3a',
      'evt-1791048703740-v7b9': 'evt-61922e28',
      'evt-1791049152771-k1qw': 'evt-c031d684',
      'evt-1791049171203-10e5': 'evt-f9234e34',
      'evt-1791223308841-6mkk': 'evt-4eee1101',
    };
    const normalized = (records || []).map(a => {
      const mapped = EVENT_ID_ALIASES[a.eventId] || a.eventId;
      return mapped !== a.eventId ? { ...a, eventId: mapped } : a;
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(normalized));
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
    const dedicatedKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    const dedicatedUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const dedicatedUnderDev = localStorage.getItem(STORAGE_KEYS.UNDER_DEVELOPMENT);

    let parsed: Partial<AllianceSettings> = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }
    }

    // Determine underDevelopment:
    // If dedicated key exists ('true' or 'false'), respect it.
    // Otherwise if parsed.underDevelopment is boolean, respect it.
    // Otherwise fallback to initialSettings.underDevelopment (false).
    let underDevelopment = false;
    if (dedicatedUnderDev !== null) {
      underDevelopment = dedicatedUnderDev === 'true';
    } else if (typeof parsed.underDevelopment === 'boolean') {
      underDevelopment = parsed.underDevelopment;
    }

    // Determine Supabase credentials (permanently defaults to live alliance database across all devices):
    const supaKey = (parsed.supabaseAnonKey || dedicatedKey || initialSettings.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY).trim();
    const supaUrl = (parsed.supabaseUrl || dedicatedUrl || initialSettings.supabaseUrl || DEFAULT_SUPABASE_URL).trim();

    return {
      ...initialSettings,
      ...parsed,
      underDevelopment,
      supabaseAnonKey: supaKey,
      supabaseUrl: supaUrl,
      dbProvider: 'supabase',
      demoMode: false,
    };
  },

  setSettings(settings: AllianceSettings) {
    const updated: AllianceSettings = {
      ...settings,
      dbProvider: 'supabase',
      demoMode: false,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

    // Also persist dedicated keys for bulletproof multi-tab resilience
    if (settings.supabaseAnonKey && settings.supabaseAnonKey.trim()) {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, settings.supabaseAnonKey.trim());
    }
    if (settings.supabaseUrl && settings.supabaseUrl.trim()) {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, settings.supabaseUrl.trim());
    }
    if (typeof settings.underDevelopment === 'boolean') {
      localStorage.setItem(STORAGE_KEYS.UNDER_DEVELOPMENT, String(settings.underDevelopment));
    }
  },

  saveSupabaseCredentials(url: string, key: string) {
    const cleanUrl = (url || '').trim();
    const cleanKey = (key || '').trim();
    if (cleanKey) {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);
    }
    if (cleanUrl) {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
    }
    const current = this.getSettings();
    this.setSettings({
      ...current,
      supabaseUrl: cleanUrl || current.supabaseUrl,
      supabaseAnonKey: cleanKey || current.supabaseAnonKey,
    });
  },

  setUnderDevelopment(val: boolean) {
    localStorage.setItem(STORAGE_KEYS.UNDER_DEVELOPMENT, String(val));
    const current = this.getSettings();
    this.setSettings({
      ...current,
      underDevelopment: val,
    });
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
    let accounts: AdminAccount[] = raw ? JSON.parse(raw) : [...initialAdmins];
    
    // Purge legacy default accounts ('admin')
    accounts = accounts.filter(a => a.username.toLowerCase() !== 'admin');

    if (!accounts.some(a => a.username.toLowerCase() === 'seoyoon')) {
      accounts.unshift(initialAdmins[0]);
    }

    return accounts;
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
    // Cannot delete main admin Seoyoon
    const target = admins.find(a => a.id === id);
    if (!target || target.username.toLowerCase() === 'seoyoon') {
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
  },

  getRevokedNotice(): string | null {
    try {
      return localStorage.getItem('crm_revoked_notice');
    } catch {
      return null;
    }
  },

  setRevokedNotice(notice: string | null): void {
    try {
      if (notice) {
        localStorage.setItem('crm_revoked_notice', notice);
      } else {
        localStorage.removeItem('crm_revoked_notice');
      }
    } catch {}
  }
};
