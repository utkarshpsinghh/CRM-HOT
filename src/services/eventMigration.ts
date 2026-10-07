import {
  AllianceEvent,
  EventSlot,
  EventParticipation,
  AttendanceRecord,
} from '../types/crm';
import { sanitizeParticipationRecord } from '../utils/eventCalculations';

export interface MigrationReport {
  oldEventRecordsCount: number;
  newParentEventsCount: number;
  newEventSlotsCount: number;
  participationRecordsMigratedCount: number;
  votesMigratedCount: number;
  attendanceRecordsMigratedCount: number;
  penaltyRecordsMigratedCount: number;
  recordsRequiringReviewCount: number;
}

export interface MigrationBundle {
  events: AllianceEvent[];
  slots: EventSlot[];
  participations: EventParticipation[];
  report: MigrationReport;
}

// Known historical event slot pairs
export const HISTORICAL_PAIRS: Array<{
  type: string;
  name: string;
  date: string;
  status: 'Scheduled' | 'Live' | 'Completed';
  slot1: { legacyId: string; name: string; time: string };
  slot2: { legacyId: string; name: string; time: string };
}> = [
  {
    type: 'Bear Trap',
    name: 'Bear Trap',
    date: '2026-09-27T16:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-185df6f0', name: 'BT1', time: '2026-09-27 16:00 UTC' },
    slot2: { legacyId: 'evt-c233df90', name: 'BT2', time: '2026-09-28 00:30 UTC' },
  },
  {
    type: 'Bear Trap',
    name: 'Bear Trap',
    date: '2026-09-30T16:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-b7b108e7', name: 'BT1', time: '2026-09-30 16:00 UTC' },
    slot2: { legacyId: 'evt-a7c586d3', name: 'BT2', time: '2026-10-01 00:30 UTC' },
  },
  {
    type: 'Bear Trap',
    name: 'Bear Trap',
    date: '2026-10-01T16:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-6f6a9d3a', name: 'BT1', time: '2026-10-01 16:00 UTC' },
    slot2: { legacyId: 'evt-61922e28', name: 'BT2', time: '2026-10-02 16:00 UTC' },
  },
  {
    type: 'Tri Alliance',
    name: 'Tri Alliance',
    date: '2026-10-03T02:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-d9a52459', name: 'Tri Alliance 1', time: '2026-10-03 02:00 UTC' },
    slot2: { legacyId: 'evt-de673b18', name: 'Tri Alliance 2', time: '2026-10-03 14:00 UTC' },
  },
  {
    type: 'Bear Trap',
    name: 'Bear Trap',
    date: '2026-10-03T16:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-c031d684', name: 'BT1', time: '2026-10-03 16:00 UTC' },
    slot2: { legacyId: 'evt-f9234e34', name: 'BT2', time: '2026-10-04 02:00 UTC' },
  },
  {
    type: 'Swordsland',
    name: 'Swordsland',
    date: '2026-10-04T02:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-6f769167', name: 'Swordsland 1', time: '2026-10-04 02:00 UTC' },
    slot2: { legacyId: 'evt-41fb9613', name: 'Swordsland 2', time: '2026-10-04 14:00 UTC' },
  },
  {
    type: 'Bear Trap',
    name: 'Bear Trap',
    date: '2026-10-05T16:00:00.000Z',
    status: 'Completed',
    slot1: { legacyId: 'evt-4eee1101', name: 'BT1', time: '2026-10-05 16:00 UTC' },
    slot2: { legacyId: 'evt-e4448cc6', name: 'BT2', time: '2026-10-06 02:00 UTC' },
  },
  {
    type: 'Bear Trap',
    name: 'Bear Trap',
    date: '2026-10-07T16:00:00.000Z',
    status: 'Scheduled',
    slot1: { legacyId: 'evt-1791372900265-foen', name: 'BT1', time: '2026-10-07 16:00 UTC' },
    slot2: { legacyId: 'evt-1791369322863-f6fw', name: 'BT2', time: '2026-10-08 02:00 UTC' },
  },
];

/**
 * Perform safe, idempotent historical migration of legacy events and attendance records
 */
export function migrateHistoricalEvents(
  legacyEvents: AllianceEvent[],
  legacyAttendance: AttendanceRecord[]
): MigrationBundle {
  const newEvents: AllianceEvent[] = [];
  const newSlots: EventSlot[] = [];
  const newParticipations: EventParticipation[] = [];

  let votesMigratedCount = 0;
  let attendanceRecordsMigratedCount = 0;
  let recordsRequiringReviewCount = 0;

  const handledLegacyEventIds = new Set<string>();

  // 1. Process known paired events first
  HISTORICAL_PAIRS.forEach((pair, idx) => {
    handledLegacyEventIds.add(pair.slot1.legacyId);
    handledLegacyEventIds.add(pair.slot2.legacyId);

    const parentId = `evt-parent-${idx + 1}-${pair.type.toLowerCase().replace(/\s+/g, '-')}-${pair.date.slice(0, 10)}`;
    const slot1Id = `slot-${parentId}-1`;
    const slot2Id = `slot-${parentId}-2`;

    const parentEvent: AllianceEvent = {
      id: parentId,
      eventType: pair.type,
      eventName: pair.name,
      date: pair.date,
      status: pair.status,
      createdAt: pair.date,
      updatedAt: new Date().toISOString(),
    };
    newEvents.push(parentEvent);

    const slot1: EventSlot = {
      id: slot1Id,
      eventId: parentId,
      slotNumber: 1,
      slotName: pair.slot1.name,
      startTime: pair.slot1.time,
      createdAt: pair.date,
    };
    const slot2: EventSlot = {
      id: slot2Id,
      eventId: parentId,
      slotNumber: 2,
      slotName: pair.slot2.name,
      startTime: pair.slot2.time,
      createdAt: pair.date,
    };
    newSlots.push(slot1, slot2);

    const getEvtId = (a: any) => a?.eventId || a?.event_id;
    const getMemId = (a: any) => a?.memberId || a?.member_id;
    const getVote = (a: any) => a?.voteStatus || a?.vote_status;
    const getAtt = (a: any) => a?.attendanceStatus || a?.attendance_status;

    const atts1 = legacyAttendance.filter(a => getEvtId(a) === pair.slot1.legacyId);
    const atts2 = legacyAttendance.filter(a => getEvtId(a) === pair.slot2.legacyId);

    const m1Map = new Map(atts1.map(a => [getMemId(a), a]));
    const m2Map = new Map(atts2.map(a => [getMemId(a), a]));
    const memberIds = Array.from(new Set([...m1Map.keys(), ...m2Map.keys()]));

    memberIds.forEach(mId => {
      const a1 = m1Map.get(mId);
      const a2 = m2Map.get(mId);

      const v1 = getVote(a1) === 'YES';
      const v2 = getVote(a2) === 'YES';
      const j1 = getAtt(a1) === 'JOINED';
      const j2 = getAtt(a2) === 'JOINED';
      const d1 = getAtt(a1) === 'DIDNT_JOIN';
      const d2 = getAtt(a2) === 'DIDNT_JOIN';

      let voteStatus: 'VOTED' | 'NO_VOTE' = 'NO_VOTE';
      let selectedSlotId: string | null = null;

      if (v1 && !v2) {
        voteStatus = 'VOTED';
        selectedSlotId = slot1Id;
        votesMigratedCount++;
      } else if (v2 && !v1) {
        voteStatus = 'VOTED';
        selectedSlotId = slot2Id;
        votesMigratedCount++;
      } else if (v1 && v2) {
        // Double vote case
        voteStatus = 'VOTED';
        selectedSlotId = j2 ? slot2Id : slot1Id;
        votesMigratedCount++;
        recordsRequiringReviewCount++;
      }

      let attendanceStatus: 'ATTENDED' | 'ABSENT' | 'NOT_MARKED' = 'NOT_MARKED';
      let attendanceSlotId: string | null = null;

      if (j1) {
        attendanceStatus = 'ATTENDED';
        attendanceSlotId = slot1Id;
        attendanceRecordsMigratedCount++;
      } else if (j2) {
        attendanceStatus = 'ATTENDED';
        attendanceSlotId = slot2Id;
        attendanceRecordsMigratedCount++;
      } else if (d1 || d2 || (voteStatus === 'VOTED' && pair.status === 'Completed')) {
        attendanceStatus = 'ABSENT';
      }

      const participation = sanitizeParticipationRecord({
        id: `part-${parentId}-${mId}`,
        eventId: parentId,
        memberId: mId,
        selectedSlotId,
        voteStatus,
        attendanceStatus,
        attendanceSlotId,
        penaltyStatus: 'NONE',
        penaltyNote: null,
        createdAt: pair.date,
        updatedAt: new Date().toISOString(),
      });

      newParticipations.push(participation);
    });
  });

  // 2. Process any other remaining legacy events that weren't in HISTORICAL_PAIRS
  const remainingEvents = legacyEvents.filter(e => !handledLegacyEventIds.has(e.id));
  remainingEvents.forEach((oldEvt, rIdx) => {
    // If it's already a new parent event, keep it
    if (oldEvt.id.startsWith('evt-parent-')) {
      newEvents.push(oldEvt);
      return;
    }

    const parentId = `evt-parent-extra-${rIdx + 1}-${oldEvt.id}`;
    const slot1Id = `slot-${parentId}-1`;
    const slot2Id = `slot-${parentId}-2`;

    let eventType: string = oldEvt.eventType;
    let slot1Name = 'Slot 1';
    let slot2Name = 'Slot 2';

    if (oldEvt.eventType === 'BT1' || oldEvt.eventType === 'BT2') {
      eventType = 'Bear Trap';
      slot1Name = 'BT1';
      slot2Name = 'BT2';
    } else if (oldEvt.eventType.toLowerCase().includes('sword')) {
      eventType = 'Swordsland';
      slot1Name = 'Swordsland 1';
      slot2Name = 'Swordsland 2';
    } else if (oldEvt.eventType.toLowerCase().includes('tri')) {
      eventType = 'Tri Alliance';
      slot1Name = 'Tri Alliance 1';
      slot2Name = 'Tri Alliance 2';
    }

    newEvents.push({
      ...oldEvt,
      id: parentId,
      eventType,
      eventName: eventType,
      updatedAt: new Date().toISOString(),
    });

    const s1: EventSlot = {
      id: slot1Id,
      eventId: parentId,
      slotNumber: 1,
      slotName: slot1Name,
      startTime: oldEvt.date,
      createdAt: oldEvt.createdAt,
    };
    const s2: EventSlot = {
      id: slot2Id,
      eventId: parentId,
      slotNumber: 2,
      slotName: slot2Name,
      startTime: oldEvt.date,
      createdAt: oldEvt.createdAt,
    };
    newSlots.push(s1, s2);

    const relatedAtts = legacyAttendance.filter(a => a.eventId === oldEvt.id);
    relatedAtts.forEach(att => {
      const isVoted = att.voteStatus === 'YES';
      const isJoined = att.attendanceStatus === 'JOINED';
      const isDidnt = att.attendanceStatus === 'DIDNT_JOIN';

      let voteStatus: 'VOTED' | 'NO_VOTE' = isVoted ? 'VOTED' : 'NO_VOTE';
      let selectedSlotId: string | null = isVoted ? slot1Id : null;
      if (isVoted) votesMigratedCount++;

      let attendanceStatus: 'ATTENDED' | 'ABSENT' | 'NOT_MARKED' = 'NOT_MARKED';
      let attendanceSlotId: string | null = null;
      if (isJoined) {
        attendanceStatus = 'ATTENDED';
        attendanceSlotId = slot1Id;
        attendanceRecordsMigratedCount++;
      } else if (isDidnt || (isVoted && oldEvt.status === 'Completed')) {
        attendanceStatus = 'ABSENT';
      }

      newParticipations.push(
        sanitizeParticipationRecord({
          id: `part-${parentId}-${att.memberId}`,
          eventId: parentId,
          memberId: att.memberId,
          selectedSlotId,
          voteStatus,
          attendanceStatus,
          attendanceSlotId,
          penaltyStatus: 'NONE',
          penaltyNote: null,
          createdAt: oldEvt.createdAt,
          updatedAt: new Date().toISOString(),
        })
      );
    });
  });

  const report: MigrationReport = {
    oldEventRecordsCount: legacyEvents.length,
    newParentEventsCount: newEvents.length,
    newEventSlotsCount: newSlots.length,
    participationRecordsMigratedCount: newParticipations.length,
    votesMigratedCount,
    attendanceRecordsMigratedCount,
    penaltyRecordsMigratedCount: 0,
    recordsRequiringReviewCount,
  };

  return {
    events: newEvents,
    slots: newSlots,
    participations: newParticipations,
    report,
  };
}
