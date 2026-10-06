import { AllianceEvent, AttendanceRecord } from '../types/crm';

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
  attendance: AttendanceRecord[]
): MemberParticipationStats {
  // Only count completed or live events for fair evaluation
  const activeEvents = events.filter(e => e.status === 'Completed' || e.status === 'Live');
  const totalEvents = activeEvents.length;

  let joinedCount = 0;
  let votedCount = 0;
  const perEvent: MemberParticipationStats['perEvent'] = [];
  const perType: Record<string, { total: number; joined: number; percentage: number }> = {};

  activeEvents.forEach(evt => {
    const rec = attendance.find(a => a.eventId === evt.id && a.memberId === memberId);
    const isJoined = rec ? rec.attendanceStatus === 'JOINED' : false;
    const isVoted = rec ? rec.voteStatus === 'YES' || rec.voteStatus === 'NO' : false;

    if (isJoined) joinedCount++;
    if (isVoted) votedCount++;

    perEvent.push({
      eventId: evt.id,
      eventType: evt.eventType,
      eventName: evt.eventName,
      date: evt.date,
      joined: isJoined,
      voteStatus: rec ? rec.voteStatus : 'NO RESPONSE',
      attendanceStatus: rec ? rec.attendanceStatus : 'NOT_APPLICABLE',
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
  attendance: AttendanceRecord[]
): Record<string, EventTypeAverageStats> {
  const activeEvents = events.filter(e => {
    if (e.status === 'Completed' || e.status === 'Live') return true;
    const time = new Date(e.date).getTime();
    return !isNaN(time) && time <= Date.now();
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
    const records = attendance.filter(a => a.eventId === evt.id || EVENT_ID_ALIASES[a.eventId] === evt.id);
    if (records.length === 0) return;
    const joined = records.filter(a => a.attendanceStatus === 'JOINED').length;
    typeMap[type].totalEvents += 1;
    typeMap[type].totalJoined += joined;
    typeMap[type].totalSlots += records.length;
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
