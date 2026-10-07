import { AllianceEvent, AttendanceRecord, EventParticipation } from '../types/crm';
import { getComputedEventStatus } from './date';

export interface MemberParticipationStats {
  memberId: string;
  totalEvents: number;
  joinedCount: number;
  votedCount: number;
  percentage: number;
  votePercentage: number;
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
  eventParticipations: EventParticipation[] = []
): MemberParticipationStats {
  // Count completed, live, or past events for fair and accurate evaluation
  const activeEvents = events.filter(e => {
    if (e.status === 'Completed' || e.status === 'Live') return true;
    return getComputedEventStatus(e.date) === 'Completed';
  });
  const totalEvents = activeEvents.length;

  let joinedCount = 0;
  let votedCount = 0;
  const perEvent: MemberParticipationStats['perEvent'] = [];
  const perType: Record<string, { total: number; joined: number; percentage: number }> = {};

  activeEvents.forEach(evt => {
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
    } else {
      // 2. Fallback to legacy attendance record
      const rec = attendance.find(a => a.eventId === evt.id && a.memberId === memberId);
      if (rec) {
        isJoined = rec.attendanceStatus === 'JOINED';
        isVoted = rec.voteStatus === 'YES' || rec.voteStatus === 'NO';
        voteStatusStr = rec.voteStatus;
        attendanceStatusStr = rec.attendanceStatus;
      }
    }

    if (isJoined) joinedCount++;
    if (isVoted) votedCount++;

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

  // Calculate percentages for each type
  Object.keys(perType).forEach(key => {
    const t = perType[key];
    t.percentage = t.total > 0 ? (t.joined / t.total) * 100 : 0;
  });

  const percentage = totalEvents > 0 ? (joinedCount / totalEvents) * 100 : 0;
  const votePercentage = totalEvents > 0 ? (votedCount / totalEvents) * 100 : 0;

  return {
    memberId,
    totalEvents,
    joinedCount,
    votedCount,
    percentage,
    votePercentage,
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
