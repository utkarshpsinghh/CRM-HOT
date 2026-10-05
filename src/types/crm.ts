export type AllianceRank = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export type CommunicationStatus = 'Good' | 'Warning' | 'Poor' | 'Unknown';

export type MemberActivityStatus = 'Active' | 'Inactive' | 'Needs Attention' | 'Visitor' | 'Archived';

export type MemberStatus = 'Active' | 'Inactive' | 'Archived' | 'Visitor';

export type EventType =
  | 'BT1'
  | 'BT2'
  | 'Swordland L1'
  | 'Swordland L2'
  | 'Tri Alliance L1'
  | 'Tri Alliance L2'
  | string;

export type EventStatus = 'Scheduled' | 'Live' | 'Completed';

export type VoteStatus = 'YES' | 'NO' | 'NO RESPONSE';

export type AttendanceStatus = 'JOINED' | 'DIDNT_JOIN' | 'NOT_APPLICABLE';

export interface Member {
  id: string;
  name: string;
  currentRank: AllianceRank;
  formerRank: AllianceRank | 'None';
  strikes: number;
  communication: CommunicationStatus;
  communicationNote?: string;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityDate?: string;
  lastActivitySource?: string;
}

export interface AllianceEvent {
  id: string;
  eventType: EventType;
  eventName: string;
  date: string;
  createdAt: string;
  status: EventStatus;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  memberId: string;
  voteStatus: VoteStatus;
  attendanceStatus: AttendanceStatus;
  updatedAt: string;
}

export interface StrikeRecord {
  id: string;
  memberId: string;
  date: string;
  reason: string;
  addedBy: string;
}

export interface CommunicationRecord {
  id: string;
  memberId: string;
  status: CommunicationStatus;
  note: string;
  date: string;
  addedBy: string;
}

export interface AllianceSettings {
  inactivityWarningDays: number;   // default 3
  inactivityInactiveDays: number;  // default 7
  inactivityCriticalDays: number;  // default 14
  kingdomId?: string;              // Kingdom #1391
  allianceTag?: string;            // HOT
  kingshotApiUrl?: string;         // Kingshot API endpoint or webhook
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  dbProvider?: 'supabase' | 'local';
  soundEnabled: boolean;
  demoMode: boolean;
  underDevelopment?: boolean;      // Under Development mode toggle
}

export interface EventAttendanceSummary {
  eventId: string;
  totalMembers: number;
  voted: number;
  joined: number;
  didNotJoin: number;
  noVote: number;
  attendancePercentage: number;
  votePercentage: number;
}

export interface InactiveMemberInsight {
  member: Member;
  daysInactive: number;
  tier: 'Warning' | 'Inactive' | 'Critical';
  lastActivityDescription: string;
  lastActivityDate: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  visitorMembers: number;
  inactiveMembers: number;
  needsAttentionMembers: number;
  membersWithStrikes: number;
  averageAttendanceRate: number;
  averageVoteRate: number;
  latestEventSummary?: AllianceEvent & EventAttendanceSummary;
}

export type AdminRole = 'MainAdmin' | 'SubAdmin';

export interface AdminAccount {
  id: string;
  username: string;
  password?: string;
  role: AdminRole;
  name?: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  name?: string;
  token: string;
}

export type ContributionActionType =
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_BULK'
  | 'EVENT_CREATED'
  | 'EVENT_COMPLETED'
  | 'STRIKE_ADDED'
  | 'STRIKE_REMOVED'
  | 'MEMBER_ADDED'
  | 'MEMBER_UPDATED'
  | 'MEMBER_ARCHIVED'
  | 'COMMUNICATION_LOGGED';

export interface OfficerContribution {
  id: string;
  adminId: string;
  adminUsername: string;
  adminName: string;
  adminRole: AdminRole;
  action: ContributionActionType;
  description: string;
  targetName?: string;
  count?: number;
  timestamp: string;
}

export interface SecurityAuditLog {
  id: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' | 'LOGOUT' | 'PASSWORD_CHANGED' | 'SECURITY_WARNING';
  username: string;
  details: string;
  timestamp: string;
}
