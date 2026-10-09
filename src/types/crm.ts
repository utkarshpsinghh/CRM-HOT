export type AllianceRank = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export type CommunicationStatus = 'Good' | 'Warning' | 'Poor' | 'Unreachable' | 'Unknown';

export type MemberActivityStatus = 'Active' | 'Inactive' | 'Needs Attention' | 'Visitor' | 'Archived';

export type MemberStatus = 'Active' | 'Inactive' | 'Archived' | 'Visitor';

export type MainEventType = 'Bear Trap' | 'Swordsland' | 'Tri Alliance' | string;

export type EventType =
  | 'Bear Trap'
  | 'Swordsland'
  | 'Tri Alliance'
  | 'BT1'
  | 'BT2'
  | 'Swordland L1'
  | 'Swordland L2'
  | 'Tri Alliance L1'
  | 'Tri Alliance L2'
  | string;

export type EventStatus = 'Scheduled' | 'Live' | 'Completed';

export type EventSlotNumber = 1 | 2;

export interface EventSlot {
  id: string;
  eventId: string;
  slotNumber: EventSlotNumber;
  slotName: string; // e.g. 'BT1', 'BT2', 'Swordsland 1', 'Swordsland 2', 'Tri Alliance 1', 'Tri Alliance 2'
  startTime: string; // e.g. '16:00' or ISO time
  createdAt: string;
}

export type ParticipationVoteStatus = 'VOTED' | 'NO_VOTE';
export type ParticipationAttendanceStatus = 'ATTENDED' | 'ABSENT' | 'NOT_MARKED';
export type PenaltyStatus = 'NONE' | 'ISSUED' | 'WAIVED';

export interface EventParticipation {
  id: string;
  eventId: string;
  memberId: string;
  selectedSlotId: string | null; // Slot selected in in-game vote (nullable)
  voteStatus: ParticipationVoteStatus; // VOTED | NO_VOTE
  attendanceStatus: ParticipationAttendanceStatus; // ATTENDED | ABSENT | NOT_MARKED
  attendanceSlotId: string | null; // Slot actually attended (nullable, required if ATTENDED)
  penaltyStatus: PenaltyStatus; // NONE | ISSUED | WAIVED
  penaltyNote: string | null; // Optional officer notes
  createdAt: string;
  updatedAt: string;
}

// Legacy Vote & Attendance status for backward compatibility during migration
export type VoteStatus = 'YES' | 'NO' | 'NO RESPONSE';
export type AttendanceStatus = 'JOINED' | 'DIDNT_JOIN' | 'NOT_APPLICABLE';

export interface Member {
  id: string;
  name: string;
  gameId?: string;
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
  eventType: MainEventType;
  eventName: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  status: EventStatus;
  notes?: string;
  slots?: EventSlot[];
  participations?: EventParticipation[];
}

// Legacy attendance record for backward compatibility
export interface AttendanceRecord {
  id: string;
  eventId: string;
  memberId: string;
  voteStatus: VoteStatus;
  attendanceStatus: AttendanceStatus;
  updatedAt: string;
}

// Dynamic Slot & Event Health Metrics (calculated dynamically, not stored permanently)
export interface SlotHealthMetric {
  slotId: string;
  slotNumber: EventSlotNumber;
  slotName: string;
  startTime: string;
  actualAttendees: number;
  participationRate: number; // actual attendees / eligible members (percentage 0-100)
  votedCount: number;
  followedVoteCount: number;
  fulfillmentRate: number; // followed vote / voted count (percentage 0-100)
}

export interface EventHealthMetrics {
  eventId: string;
  eligibleMembersCount: number;
  totalVoters: number;
  noVoteCount: number;
  votingRate: number; // total voters / eligible members (percentage 0-100)
  uniqueAttendees: number;
  overallParticipationRate: number; // unique attendees / eligible members (percentage 0-100)
  slots: SlotHealthMetric[];
  changedSlotCount: {
    slot1ToSlot2: number;
    slot2ToSlot1: number;
  };
  nonVotersAttendedCount: number;
  potentialReviewsCount: number;
  penaltiesIssuedCount: number;
  penaltiesWaivedCount: number;
}

export interface MemberEventTypeStats {
  eventType: MainEventType;
  eventsParticipated: number;
  slot1Attendance: number;
  slot2Attendance: number;
  totalAttendance: number;
  totalVotes: number;
  voteFulfillmentCount: number;
  voteFulfillmentRate: number; // percentage 0-100
  penaltiesCount: number;
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
  autoSyncRoster?: boolean;        // Automatically sync roster periodically
  autoSyncIntervalMinutes?: number;// Auto-sync frequency (default: 30 minutes)
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  dbProvider?: 'supabase' | 'local';
  soundEnabled: boolean;
  demoMode: boolean;
  underDevelopment?: boolean;      // Under Development mode toggle
  googleSheetUrl?: string;         // Alliance Google Sheet URL
  apiKeys?: ApiKeyItem[];          // External API integration keys
  deletedEventIds?: string[];      // Tombstone list of permanently deleted event IDs
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  permissions?: ('members' | 'leaderboard' | 'events' | 'attendance')[];
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
  | 'EVENT_DELETED'
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
