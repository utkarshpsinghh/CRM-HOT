import { Member, AllianceEvent, AttendanceRecord, StrikeRecord, CommunicationRecord, AllianceSettings, AdminAccount, OfficerContribution } from '../types/crm';
import { DEFAULT_GAS_URL } from '../config';
export { DEFAULT_GAS_URL };

export const initialSettings: AllianceSettings = {
  inactivityWarningDays: 3,
  inactivityInactiveDays: 7,
  inactivityCriticalDays: 14,
  gasWebAppUrl: DEFAULT_GAS_URL,
  soundEnabled: true,
  demoMode: !DEFAULT_GAS_URL,
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
