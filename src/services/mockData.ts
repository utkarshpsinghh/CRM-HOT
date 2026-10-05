import { Member, AllianceEvent, AttendanceRecord, StrikeRecord, CommunicationRecord, AllianceSettings, AdminAccount, OfficerContribution } from '../types/crm';
import { DEFAULT_KINGDOM_ID, DEFAULT_ALLIANCE_TAG, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../config';

export const initialSettings: AllianceSettings = {
  inactivityWarningDays: 3,
  inactivityInactiveDays: 7,
  inactivityCriticalDays: 14,
  kingdomId: DEFAULT_KINGDOM_ID,
  allianceTag: DEFAULT_ALLIANCE_TAG,
  supabaseUrl: DEFAULT_SUPABASE_URL,
  supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
  dbProvider: 'supabase',
  soundEnabled: true,
  demoMode: false,
};

// Pure clean initial state — no junk or fake mock data
export const initialMembers: Member[] = [];

export const initialEvents: AllianceEvent[] = [];

export function generateInitialAttendance(_members: Member[], _events: AllianceEvent[]): AttendanceRecord[] {
  return [];
}

export const initialStrikes: StrikeRecord[] = [];

export const initialCommunications: CommunicationRecord[] = [];

export const initialAdmins: AdminAccount[] = [
  {
    id: 'adm-seoyoon',
    username: 'seoyoon',
    password: 'masterlogin',
    role: 'MainAdmin' as const,
    name: 'Seoyoon',
    createdAt: new Date().toISOString(),
  },
];

export const initialContributions: OfficerContribution[] = [];
