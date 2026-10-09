import { AllianceEvent, AttendanceRecord, EventParticipation, EventSlot } from '../types/crm';
import { getComputedEventStatus } from './date';
import { storageService } from '../services/storage';

export interface MemberParticipationStats {
  memberId: string;
  totalEvents: number;
  joinedCount: number;
  votedCount: number;
  attendedWhenVotedCount: number;
  followedVoteCount: number;
  percentage: number;
  votePercentage: number;
  voteReliability: number;
  followedVoteRate: number;
  perEvent: Array<{
    eventId: string;
    eventType: string;
    eventName: string;
    date: string;
    joined: boolean;
    voteStatus: string;
    attendanceStatus: string;
  }>;
  perType: Record<string, { total: number; joined: number; percentage: number }>;
}

export interface EventTypeAverageStats {
  eventType: string;
  totalEvents: number;
  averageAttendancePercentage: number;
  totalJoined: number;
  totalSlots: number;
}

export function calculateMemberParticipation(
  memberId: string,
  events: AllianceEvent[],
  attendance: AttendanceRecord[] = [],
  eventParticipations: EventParticipation[] = [],
  eventSlots: EventSlot[] = []
): MemberParticipationStats {
  // Count completed, live, or past events for fair and accurate evaluation (excluding deleted events)
  const deletedIds = new Set(storageService.getDeletedEventIds());
  const activeEvents = events.filter(e => {
    if (deletedIds.has(e.id)) return false;
    if (e.status === 'Completed' || e.status === 'Live') return true;
    return getComputedEventStatus(e.date) === 'Completed';
  });
  const totalEvents = activeEvents.length;

  let joinedCount = 0;
  let votedCount = 0;
  let attendedWhenVotedCount = 0;
  let followedVoteCount = 0;
  const perEvent: MemberParticipationStats['perEvent'] = [];
  const perType: Record<string, { total: number; joined: number; percentage: number }> = {};

  // Slot trackers
  let totalBT = 0;
  let totalSW = 0;
  let totalTRI = 0;
  let joinedBT1 = 0;
  let joinedBT2 = 0;
  let joinedSW1 = 0;
  let joinedSW2 = 0;
  let joinedTRI1 = 0;
  let joinedTRI2 = 0;

  const slotLookupMap = new Map(eventSlots.map(s => [s.id, s]));

  const BT1_IDS = new Set(['evt-185df6f0', 'evt-b7b108e7', 'evt-6f6a9d3a', 'evt-c031d684', 'evt-4eee1101', 'evt-1791372900265-foen']);
  const BT2_IDS = new Set(['evt-c233df90', 'evt-a7c586d3', 'evt-61922e28', 'evt-f9234e34', 'evt-e4448cc6', 'evt-1791369322863-f6fw', 'evt-1790607589476-kins']);

  activeEvents.forEach(evt => {
    const isBT = evt.eventType.toLowerCase().includes('bear');
    const isSW = evt.eventType.toLowerCase().includes('sword');
    const isTRI = evt.eventType.toLowerCase().includes('tri');

    if (isBT) totalBT++;
    if (isSW) totalSW++;
    if (isTRI) totalTRI++;

    // 1. Try modern event participation
    const modernPart = eventParticipations.find(
      p => p.eventId === evt.id && p.memberId === memberId
    );

    let isJoined = false;
    let isVoted = false;
    let voteStatusStr = 'NO RESPONSE';
    let attendanceStatusStr = 'NOT_APPLICABLE';

    if (modernPart) {
      isJoined = modernPart.attendanceStatus === 'ATTENDED';
      isVoted = modernPart.voteStatus === 'VOTED';
      voteStatusStr = modernPart.voteStatus;
      attendanceStatusStr = modernPart.attendanceStatus;

      if (isJoined) {
        const slot = modernPart.attendanceSlotId ? slotLookupMap.get(modernPart.attendanceSlotId) : null;
        const isSlot1 = (slot && slot.slotNumber === 1) || (modernPart.attendanceSlotId && modernPart.attendanceSlotId.endsWith('-1'));
        const isSlot2 = (slot && slot.slotNumber === 2) || (modernPart.attendanceSlotId && modernPart.attendanceSlotId.endsWith('-2'));

        if (isSlot1) {
          if (isBT) joinedBT1++;
          else if (isSW) joinedSW1++;
          else if (isTRI) joinedTRI1++;
        } else if (isSlot2) {
          if (isBT) joinedBT2++;
          else if (isSW) joinedSW2++;
          else if (isTRI) joinedTRI2++;
        }
      }
    } else {
      // 2. Fallback to legacy attendance record
      const rec = attendance.find(a => a.eventId === evt.id && a.memberId === memberId);
      if (rec) {
        isJoined = rec.attendanceStatus === 'JOINED';
        isVoted = rec.voteStatus === 'YES' || rec.voteStatus === 'NO';
        voteStatusStr = rec.voteStatus;
        attendanceStatusStr = rec.attendanceStatus;

        if (isJoined) {
          if (BT1_IDS.has(rec.eventId)) joinedBT1++;
          else if (BT2_IDS.has(rec.eventId)) joinedBT2++;
          else if (rec.eventId === 'evt-6f769167') joinedSW1++;
          else if (rec.eventId === 'evt-41fb9613') joinedSW2++;
          else if (rec.eventId === 'evt-d9a52459') joinedTRI1++;
          else if (rec.eventId === 'evt-de673b18') joinedTRI2++;
        }
      }
    }

    if (isJoined) joinedCount++;
    if (isVoted) {
      votedCount++;
      if (isJoined) {
        attendedWhenVotedCount++;
        if (modernPart && modernPart.selectedSlotId && modernPart.attendanceSlotId && modernPart.selectedSlotId === modernPart.attendanceSlotId) {
          followedVoteCount++;
        } else if (!modernPart) {
          followedVoteCount++;
        }
      }
    }

    perEvent.push({
      eventId: evt.id,
      eventType: evt.eventType,
      eventName: evt.eventName,
      date: evt.date,
      joined: isJoined,
      voteStatus: voteStatusStr,
      attendanceStatus: attendanceStatusStr,
    });

    // Per event type
    const typeKey = evt.eventType;
    if (!perType[typeKey]) {
      perType[typeKey] = { total: 0, joined: 0, percentage: 0 };
    }
    perType[typeKey].total++;
    if (isJoined) {
      perType[typeKey].joined++;
    }
  });

  // Calculate percentages for each parent type
  Object.keys(perType).forEach(key => {
    const t = perType[key];
    t.percentage = t.total > 0 ? (t.joined / t.total) * 100 : 0;
  });

  // Slot Breakdown Stats
  const bt1Stat = { total: totalBT, joined: joinedBT1, percentage: totalBT > 0 ? (joinedBT1 / totalBT) * 100 : 0 };
  const bt2Stat = { total: totalBT, joined: joinedBT2, percentage: totalBT > 0 ? (joinedBT2 / totalBT) * 100 : 0 };
  const sw1Stat = { total: totalSW, joined: joinedSW1, percentage: totalSW > 0 ? (joinedSW1 / totalSW) * 100 : 0 };
  const sw2Stat = { total: totalSW, joined: joinedSW2, percentage: totalSW > 0 ? (joinedSW2 / totalSW) * 100 : 0 };
  const tri1Stat = { total: totalTRI, joined: joinedTRI1, percentage: totalTRI > 0 ? (joinedTRI1 / totalTRI) * 100 : 0 };
  const tri2Stat = { total: totalTRI, joined: joinedTRI2, percentage: totalTRI > 0 ? (joinedTRI2 / totalTRI) * 100 : 0 };

  perType['BT1'] = bt1Stat;
  perType['BT2'] = bt2Stat;
  perType['Swordland L1'] = sw1Stat;
  perType['Swordland L2'] = sw2Stat;
  perType['SWL1'] = sw1Stat;
  perType['SWL2'] = sw2Stat;
  perType['SW1'] = sw1Stat;
  perType['SW2'] = sw2Stat;
  perType['Swordsland 1'] = sw1Stat;
  perType['Swordsland 2'] = sw2Stat;
  perType['Tri Alliance L1'] = tri1Stat;
  perType['Tri Alliance L2'] = tri2Stat;
  perType['TRIL1'] = tri1Stat;
  perType['TRIL2'] = tri2Stat;
  perType['TRI1'] = tri1Stat;
  perType['TRI2'] = tri2Stat;
  perType['Tri Alliance 1'] = tri1Stat;
  perType['Tri Alliance 2'] = tri2Stat;

  const percentage = totalEvents > 0 ? (joinedCount / totalEvents) * 100 : 0;
  const votePercentage = totalEvents > 0 ? (votedCount / totalEvents) * 100 : 0;
  const voteReliability = votedCount > 0 ? (attendedWhenVotedCount / votedCount) * 100 : 100;
  const followedVoteRate = votedCount > 0 ? (followedVoteCount / votedCount) * 100 : 100;

  return {
    memberId,
    totalEvents,
    joinedCount,
    votedCount,
    attendedWhenVotedCount,
    followedVoteCount,
    percentage,
    votePercentage,
    voteReliability,
    followedVoteRate,
    perEvent,
    perType,
  };
}

export function calculateAllEventAverages(
  events: AllianceEvent[],
  attendance: AttendanceRecord[] = [],
  eventParticipations: EventParticipation[] = []
): Record<string, EventTypeAverageStats> {
  const activeEvents = events.filter(e => {
    if (e.status === 'Completed' || e.status === 'Live') return true;
    return getComputedEventStatus(e.date) === 'Completed';
  });

  const EVENT_ID_ALIASES: Record<string, string> = {
    'evt-1790607589476-kins': 'evt-c233df90',
    'evt-1791048690819-7icl': 'evt-6f6a9d3a',
    'evt-1791048703740-v7b9': 'evt-61922e28',
    'evt-1791049152771-k1qw': 'evt-c031d684',
    'evt-1791049171203-10e5': 'evt-f9234e34',
    'evt-1791223308841-6mkk': 'evt-4eee1101',
  };

  const typeMap: Record<string, { totalEvents: number; totalJoined: number; totalSlots: number }> = {};

  activeEvents.forEach(evt => {
    const type = evt.eventType;
    if (!typeMap[type]) {
      typeMap[type] = { totalEvents: 0, totalJoined: 0, totalSlots: 0 };
    }

    const modernParts = eventParticipations.filter(p => p.eventId === evt.id);
    if (modernParts.length > 0) {
      const joined = modernParts.filter(p => p.attendanceStatus === 'ATTENDED').length;
      typeMap[type].totalEvents += 1;
      typeMap[type].totalJoined += joined;
      typeMap[type].totalSlots += modernParts.length;
    } else {
      const records = attendance.filter(a => a.eventId === evt.id || EVENT_ID_ALIASES[a.eventId] === evt.id);
      if (records.length === 0) return;
      const joined = records.filter(a => a.attendanceStatus === 'JOINED').length;
      typeMap[type].totalEvents += 1;
      typeMap[type].totalJoined += joined;
      typeMap[type].totalSlots += records.length;
    }
  });

  const result: Record<string, EventTypeAverageStats> = {};
  Object.keys(typeMap).forEach(type => {
    const item = typeMap[type];
    const avg = item.totalSlots > 0 ? (item.totalJoined / item.totalSlots) * 100 : 0;
    result[type] = {
      eventType: type,
      totalEvents: item.totalEvents,
      averageAttendancePercentage: avg,
      totalJoined: item.totalJoined,
      totalSlots: item.totalSlots,
    };
  });

  return result;
}
