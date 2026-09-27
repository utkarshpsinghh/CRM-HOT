import { Member, AllianceEvent, AttendanceRecord, StrikeRecord, CommunicationRecord, AllianceSettings } from '../types/crm';
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

// Generate realistic 92 Kingshot HOT Alliance members
const rawMemberNames: Array<{ name: string; rank: Member['currentRank']; former: Member['formerRank']; comm: Member['communication']; strikes: number; status: Member['status']; note?: string }> = [
  // R5 - Alliance Leader
  { name: 'HOT_Ares', rank: 'R5', former: 'R4', comm: 'Good', strikes: 0, status: 'Active', note: 'Alliance Founder & Supreme War Marshal.' },
  
  // R4 - High Command & War Generals
  { name: 'Valkyrie_HOT', rank: 'R4', former: 'R3', comm: 'Good', strikes: 0, status: 'Active', note: 'Diplomacy & Event Coordinator.' },
  { name: 'IronClad_99', rank: 'R4', former: 'R3', comm: 'Good', strikes: 0, status: 'Active', note: 'Garrison defense captain.' },
  { name: 'ShadowBlade', rank: 'R4', former: 'R4', comm: 'Good', strikes: 0, status: 'Active', note: 'Rally Commander.' },
  { name: 'LordGrimjaw', rank: 'R4', former: 'R3', comm: 'Good', strikes: 0, status: 'Active', note: 'Strategy lead for Swordland.' },
  { name: 'QueenOfBlades', rank: 'R4', former: 'R3', comm: 'Good', strikes: 0, status: 'Active', note: 'Recruitment & roster supervisor.' },

  // R3 - Veteran Elites
  { name: 'Thorin_Stone', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'NightStalker_X', rank: 'R3', former: 'R3', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'CrimsonReaper', rank: 'R3', former: 'R2', comm: 'Good', strikes: 1, status: 'Active', note: 'Missed rally due to work emergency.' },
  { name: 'DragonBane', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'SilverWolf', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'BlazeFury', rank: 'R3', former: 'R2', comm: 'Warning', strikes: 1, status: 'Active', note: 'Occasionally slow to respond to Discord pings.' },
  { name: 'FrostBite', rank: 'R3', former: 'R3', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'TitanSlayer', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'PhoenixAsh', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Vortex_HOT', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'StormBreaker', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'GhostRider_7', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Archon_Prime', rank: 'R3', former: 'R3', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'BloodMoon', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Ragnarok_88', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'ApexPredator', rank: 'R3', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },

  // R2 - Proven Warriors
  { name: 'SteelHawk', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Kael_Sunstrider', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'OdinShield', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'SilentAssasin', rank: 'R2', former: 'R1', comm: 'Warning', strikes: 1, status: 'Active' },
  { name: 'WarMachine_01', rank: 'R2', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'DoomHammer', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'RogueOne', rank: 'R2', former: 'R1', comm: 'Poor', strikes: 2, status: 'Active', note: 'Repeatedly forgets to update vote status.' },
  { name: 'Zeus_Thunder', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'CyberKnight', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'AlphaWolf_9', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Sentinel_Prime', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'DreadKnight', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Vanguard_Leo', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'InfernoKing', rank: 'R2', former: 'R2', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'BlackLotus', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'MysticRanger', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'IronFist_HOT', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'GraveDigger', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Gladiator_Rex', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Hyperion_Sky', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Oblivion_Echo', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Solaris_Dawn', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'LunarEclipse', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Berserker_Bob', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'ChaosKnight', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Tempest_Wind', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'ObsidianEdge', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'DarkPaladin', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Crusader_9', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'FalconEye', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'GrimReaper_2', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'ThunderBolt', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'WarChief_Z', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'SilverFang', rank: 'R2', former: 'R1', comm: 'Good', strikes: 0, status: 'Active' },

  // R1 - Recruits & Foot Soldiers
  { name: 'NewbieWarrior', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Rookie_Shield', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'IronSquire', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'NoviceBlaster', rank: 'R1', former: 'None', comm: 'Unknown', strikes: 0, status: 'Active' },
  { name: 'SwiftArcher', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'StoneGuard', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'BraveHeart_12', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'KnightApprentice', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'BronzeSpear', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'YoungDragon', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'CobaltRider', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'AmberShield', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'WildHunter', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'ShadowProwler', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'IronFoot', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'SpearMaster', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'CrossbowPro', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'ShieldBearer', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'BattleScout', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'CastleKeeper', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'Vagabond_9', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'SlayerInTraining', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'KingsguardCadet', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'FortressBuilder', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },
  { name: 'WarHorn_Boy', rank: 'R1', former: 'None', comm: 'Good', strikes: 0, status: 'Active' },

  // INACTIVE / WARNING MEMBERS (Needs Attention & Inactive)
  { name: 'SleepingGiant', rank: 'R2', former: 'R2', comm: 'Warning', strikes: 1, status: 'Active', note: 'No vote for 4 days.' },
  { name: 'SilentKnight', rank: 'R2', former: 'R1', comm: 'Warning', strikes: 0, status: 'Active', note: 'Missed last 2 events.' },
  { name: 'LostWanderer', rank: 'R1', former: 'None', comm: 'Poor', strikes: 1, status: 'Active', note: 'Does not respond in alliance chat.' },
  { name: 'GhostWarrior_X', rank: 'R1', former: 'None', comm: 'Unknown', strikes: 0, status: 'Inactive', note: 'Offline for 9 days.' },
  { name: 'ForgottenKing', rank: 'R3', former: 'R4', comm: 'Poor', strikes: 1, status: 'Inactive', note: 'Inactive for 10 days. Demoted from R4.' },
  { name: 'AFK_Champion', rank: 'R2', former: 'R2', comm: 'Poor', strikes: 2, status: 'Inactive', note: 'Voted yes then disappeared twice.' },
  { name: 'VanishedLord', rank: 'R2', former: 'R2', comm: 'Poor', strikes: 1, status: 'Inactive', note: '14 days without activity.' },
  { name: 'DeadAccount_1', rank: 'R1', former: 'None', comm: 'Unknown', strikes: 0, status: 'Inactive', note: 'Last active 18 days ago.' },
  { name: 'DeadAccount_2', rank: 'R1', former: 'None', comm: 'Unknown', strikes: 0, status: 'Inactive', note: 'Last active 22 days ago.' },
  { name: 'TombRaider_Off', rank: 'R1', former: 'None', comm: 'Unknown', strikes: 0, status: 'Inactive', note: 'Castle burnt, no shield.' },
  { name: 'OldGuard_Ex', rank: 'R2', former: 'R3', comm: 'Unknown', strikes: 0, status: 'Inactive', note: 'Shield expired, inactive.' },

  // ARCHIVED (Former members soft-deleted)
  { name: 'Traitor_Blade', rank: 'R1', former: 'R2', comm: 'Poor', strikes: 3, status: 'Archived', note: 'Expelled for hitting alliance mine.' },
  { name: 'Leaver_Sam', rank: 'R1', former: 'R1', comm: 'Good', strikes: 0, status: 'Archived', note: 'Transferred to academy alliance.' },
];

export const initialMembers: Member[] = rawMemberNames.map((m, idx) => ({
  id: `mem-${String(idx + 1).padStart(3, '0')}`,
  name: m.name,
  currentRank: m.rank,
  formerRank: m.former,
  strikes: m.strikes,
  communication: m.comm,
  communicationNote: m.note,
  status: m.status,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
}));

// Default 6 Kingshot Alliance Events
export const initialEvents: AllianceEvent[] = [
  {
    id: 'evt-001',
    eventType: 'Tri Alliance L1',
    eventName: 'Tri Alliance Level 1 Showdown',
    date: '2026-09-18T18:00',
    createdAt: '2026-09-17T12:00:00.000Z',
    status: 'Completed',
    notes: 'Initial defense round for Tri Alliance territory.',
  },
  {
    id: 'evt-002',
    eventType: 'Swordland L1',
    eventName: 'Swordland Level 1 Siege',
    date: '2026-09-21T19:00',
    createdAt: '2026-09-20T10:00:00.000Z',
    status: 'Completed',
    notes: 'Flank assault on Swordland fortress.',
  },
  {
    id: 'evt-003',
    eventType: 'Tri Alliance L2',
    eventName: 'Tri Alliance Level 2 Defense',
    date: '2026-09-22T20:00',
    createdAt: '2026-09-21T15:00:00.000Z',
    status: 'Completed',
    notes: 'Final battle for alliance banners.',
  },
  {
    id: 'evt-004',
    eventType: 'BT1',
    eventName: 'Battle Throne Phase 1',
    date: '2026-09-25T17:00',
    createdAt: '2026-09-24T12:00:00.000Z',
    status: 'Completed',
    notes: 'Mandatory throne qualification clash.',
  },
  {
    id: 'evt-005',
    eventType: 'Swordland L2',
    eventName: 'Swordland Level 2 Championship',
    date: '2026-09-25T21:00',
    createdAt: '2026-09-24T18:00:00.000Z',
    status: 'Completed',
    notes: 'Heavy rally assault against opposing kingdom.',
  },
  {
    id: 'evt-006',
    eventType: 'BT2',
    eventName: 'Battle Throne Phase 2 War',
    date: '2026-09-27T19:00',
    createdAt: '2026-09-26T14:00:00.000Z',
    status: 'Completed',
    notes: 'Decisive throne war round. Crucial attendance!',
  },
];

// Generate attendance records for all active members across events
export function generateInitialAttendance(members: Member[], events: AllianceEvent[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const activeMembers = members.filter(m => m.status !== 'Archived');

  events.forEach((evt, evtIdx) => {
    activeMembers.forEach((mem, mIdx) => {
      let vote: AttendanceRecord['voteStatus'] = 'YES';
      let att: AttendanceRecord['attendanceStatus'] = 'JOINED';

      const isInactive = mem.status === 'Inactive' || mem.name.includes('AFK') || mem.name.includes('Dead') || mem.name.includes('Vanished');
      const isWarning = mem.name.includes('Silent') || mem.name.includes('Sleeping') || mem.name.includes('Lost');

      if (isInactive) {
        // Inactive members didn't vote and didn't join
        vote = 'NO RESPONSE';
        att = 'DIDNT_JOIN';
      } else if (isWarning) {
        if (evtIdx >= 4) {
          // Missed recent 2 events
          vote = evtIdx % 2 === 0 ? 'YES' : 'NO RESPONSE';
          att = 'DIDNT_JOIN';
        } else {
          vote = 'YES';
          att = 'JOINED';
        }
      } else if (mem.strikes > 0 && evtIdx === 5 && mem.name === 'CrimsonReaper') {
        // Voted yes but didn't join BT2 (earned strike!)
        vote = 'YES';
        att = 'DIDNT_JOIN';
      } else if (mem.name === 'RogueOne' && (evtIdx === 4 || evtIdx === 5)) {
        vote = 'YES';
        att = 'DIDNT_JOIN';
      } else {
        // Regular active member distribution
        // ~85% vote yes, ~80% attend
        const hash = (mIdx * 17 + evtIdx * 31) % 100;
        if (hash < 78) {
          vote = 'YES';
          att = 'JOINED';
        } else if (hash < 85) {
          vote = 'YES';
          att = 'DIDNT_JOIN'; // Voted but flaked!
        } else if (hash < 93) {
          vote = 'NO RESPONSE';
          att = 'DIDNT_JOIN';
        } else {
          vote = 'NO';
          att = 'NOT_APPLICABLE';
        }
      }

      records.push({
        id: `att-${evt.id}-${mem.id}`,
        eventId: evt.id,
        memberId: mem.id,
        voteStatus: vote,
        attendanceStatus: att,
        updatedAt: evt.date + ':00.000Z',
      });
    });
  });

  return records;
}

export const initialStrikes: StrikeRecord[] = [
  {
    id: 'strk-001',
    memberId: 'mem-009', // CrimsonReaper
    date: '2026-09-27',
    reason: 'Missed BT2 after voting YES',
    addedBy: 'HOT_Ares',
  },
  {
    id: 'strk-002',
    memberId: 'mem-012', // BlazeFury
    date: '2026-09-21',
    reason: 'Did not join Swordland L1 after confirming rally slot',
    addedBy: 'Valkyrie_HOT',
  },
  {
    id: 'strk-003',
    memberId: 'mem-026', // SilentAssasin
    date: '2026-09-25',
    reason: 'Absent from Swordland L2 without advance notice',
    addedBy: 'ShadowBlade',
  },
  {
    id: 'strk-004',
    memberId: 'mem-029', // RogueOne
    date: '2026-09-22',
    reason: 'Missed Tri Alliance L2 after voting YES',
    addedBy: 'Valkyrie_HOT',
  },
  {
    id: 'strk-005',
    memberId: 'mem-029', // RogueOne (Strike 2)
    date: '2026-09-27',
    reason: 'Missed BT2 after voting YES (Strike #2)',
    addedBy: 'HOT_Ares',
  },
  {
    id: 'strk-006',
    memberId: 'mem-076', // SleepingGiant
    date: '2026-09-27',
    reason: 'Missed BT2 after voting YES',
    addedBy: 'HOT_Ares',
  },
  {
    id: 'strk-007',
    memberId: 'mem-078', // LostWanderer
    date: '2026-09-25',
    reason: 'Zero response to leader communications during war preparation',
    addedBy: 'QueenOfBlades',
  },
];

export const initialCommunications: CommunicationRecord[] = [
  {
    id: 'comm-001',
    memberId: 'mem-029',
    status: 'Poor',
    note: 'Repeatedly misses events after voting YES. Sent warning in Kingshot chat.',
    date: '2026-09-27',
    addedBy: 'HOT_Ares',
  },
  {
    id: 'comm-002',
    memberId: 'mem-012',
    status: 'Warning',
    note: 'Explained work schedule issues. Advised to vote NO instead of YES if uncertain.',
    date: '2026-09-22',
    addedBy: 'Valkyrie_HOT',
  },
  {
    id: 'comm-003',
    memberId: 'mem-078',
    status: 'Poor',
    note: 'Mail sent regarding missing 3 consecutive event votes. Awaiting response.',
    date: '2026-09-26',
    addedBy: 'QueenOfBlades',
  },
];

export const initialAdmins = [
  {
    id: 'adm-seoyoon',
    username: 'seoyoon',
    password: 'masterlogin',
    role: 'MainAdmin' as const,
    name: 'Seoyoon',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

export const initialContributions = [
  {
    id: 'cnt-001',
    adminId: 'adm-sub-1',
    adminUsername: 'officer',
    adminName: 'War Officer',
    adminRole: 'SubAdmin' as const,
    action: 'ATTENDANCE_BULK' as const,
    description: 'Logged battle attendance for 48 members in Tri Alliance L1',
    targetName: 'Tri Alliance L1',
    count: 48,
    timestamp: '2026-09-27T08:15:00.000Z',
  },
  {
    id: 'cnt-002',
    adminId: 'adm-sub-1',
    adminUsername: 'officer',
    adminName: 'War Officer',
    adminRole: 'SubAdmin' as const,
    action: 'STRIKE_ADDED' as const,
    description: 'Issued strike to RogueOne: Repeatedly forgets to update vote status',
    targetName: 'RogueOne',
    count: 1,
    timestamp: '2026-09-26T21:30:00.000Z',
  },
  {
    id: 'cnt-003',
    adminId: 'adm-main-1',
    adminUsername: 'admin',
    adminName: 'Alliance Leader',
    adminRole: 'MainAdmin' as const,
    action: 'EVENT_CREATED' as const,
    description: 'Scheduled new war battle: Swordland L2 Championship',
    targetName: 'Swordland L2 Championship',
    count: 1,
    timestamp: '2026-09-26T18:00:00.000Z',
  },
  {
    id: 'cnt-004',
    adminId: 'adm-sub-1',
    adminUsername: 'officer',
    adminName: 'War Officer',
    adminRole: 'SubAdmin' as const,
    action: 'ATTENDANCE_MARKED' as const,
    description: 'Recorded attendance verification for 35 members in BT1',
    targetName: 'BT1',
    count: 35,
    timestamp: '2026-09-25T19:40:00.000Z',
  },
  {
    id: 'cnt-005',
    adminId: 'adm-sub-1',
    adminUsername: 'officer',
    adminName: 'War Officer',
    adminRole: 'SubAdmin' as const,
    action: 'COMMUNICATION_LOGGED' as const,
    description: 'Logged discord outreach for SleepingGiant',
    targetName: 'SleepingGiant',
    count: 1,
    timestamp: '2026-09-25T14:20:00.000Z',
  },
  {
    id: 'cnt-006',
    adminId: 'adm-main-1',
    adminUsername: 'admin',
    adminName: 'Alliance Leader',
    adminRole: 'MainAdmin' as const,
    action: 'MEMBER_ADDED' as const,
    description: 'Enrolled new recruit WarChief_Z into R2 division',
    targetName: 'WarChief_Z',
    count: 1,
    timestamp: '2026-09-24T12:00:00.000Z',
  },
  {
    id: 'cnt-007',
    adminId: 'adm-sub-1',
    adminUsername: 'officer',
    adminName: 'War Officer',
    adminRole: 'SubAdmin' as const,
    action: 'ATTENDANCE_BULK' as const,
    description: 'Recorded check-ins for 52 members in BT2',
    targetName: 'BT2',
    count: 52,
    timestamp: '2026-09-23T20:10:00.000Z',
  },
  {
    id: 'cnt-008',
    adminId: 'adm-main-1',
    adminUsername: 'admin',
    adminName: 'Alliance Leader',
    adminRole: 'MainAdmin' as const,
    action: 'STRIKE_ADDED' as const,
    description: 'Issued strike to AFK_Champion: Voted yes then disappeared twice',
    targetName: 'AFK_Champion',
    count: 1,
    timestamp: '2026-09-22T17:45:00.000Z',
  },
];

