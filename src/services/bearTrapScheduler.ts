import { AllianceEvent, EventSlot, EventParticipation, Member } from '../types/crm';
import { getComputedEventStatus } from '../utils/date';

/**
 * Standard Bear Trap Cadence:
 * Occurs every 48 hours (every 2 days).
 * Sequence:
 * 1st Bear Trap: Slot 1 - 27 Sep 2026, 16:00 UTC | Slot 2 - 28 Sep 2026, 00:30 UTC
 * 2nd Bear Trap: Slot 1 - 29 Sep 2026, 16:00 UTC | Slot 2 - 30 Sep 2026, 00:30 UTC
 * 3rd Bear Trap: Slot 1 - 01 Oct 2026, 16:00 UTC | Slot 2 - 02 Oct 2026, 00:30 UTC
 * 4th Bear Trap: Slot 1 - 03 Oct 2026, 16:00 UTC | Slot 2 - 04 Oct 2026, 00:30 UTC
 * 5th Bear Trap: Slot 1 - 05 Oct 2026, 16:00 UTC | Slot 2 - 06 Oct 2026, 00:30 UTC
 * 6th Bear Trap: Slot 1 - 07 Oct 2026, 16:00 UTC | Slot 2 - 08 Oct 2026, 00:30 UTC
 * Future Bear Traps continue seamlessly every 2 days (48 hrs) at 16:00 UTC (Slot 1) and next day 00:30 UTC (Slot 2).
 */

const KNOWN_BEAR_TRAP_DATES = [
  '2026-09-27',
  '2026-09-29',
  '2026-10-01',
  '2026-10-03',
  '2026-10-05',
  '2026-10-07',
];

function getNextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextD = new Date(Date.UTC(y, m - 1, d + 1, 0, 30, 0));
  const ny = nextD.getUTCFullYear();
  const nm = String(nextD.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(nextD.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + days, 16, 0, 0));
  const ty = target.getUTCFullYear();
  const tm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const td = String(target.getUTCDate()).padStart(2, '0');
  return `${ty}-${tm}-${td}`;
}

export function syncAndAutoScheduleBearTraps(
  events: AllianceEvent[],
  slots: EventSlot[],
  participations: EventParticipation[],
  members: Member[],
  futureCyclesCount = 4
): {
  events: AllianceEvent[];
  slots: EventSlot[];
  participations: EventParticipation[];
  updatedCount: number;
} {
  const updatedEvents = [...events];
  const updatedSlots = [...slots];
  const updatedParticipations = [...participations];
  let updatedCount = 0;

  // 1. Identify and sequence all existing Bear Trap events
  const bearTrapEvents = updatedEvents.filter(e => e.eventType === 'Bear Trap');
  // Sort chronologically
  bearTrapEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Correct dates and slot times for known existing Bear Trap cycles
  bearTrapEvents.forEach((evt, idx) => {
    let dateStr = evt.date.split('T')[0];
    if (idx < KNOWN_BEAR_TRAP_DATES.length) {
      dateStr = KNOWN_BEAR_TRAP_DATES[idx];
      const correctIso = `${dateStr}T16:00:00.000Z`;
      if (evt.date !== correctIso) {
        evt.date = correctIso;
        evt.status = getComputedEventStatus(correctIso) === 'Upcoming' ? 'Scheduled' : 'Completed';
        updatedCount++;
      }
    }

    const nextDayStr = getNextDayStr(dateStr);
    const expectedSlot1Time = `${dateStr} 16:00 UTC`;
    const expectedSlot2Time = `${nextDayStr} 00:30 UTC`;

    // Ensure slot 1 and slot 2 match exact sequence
    const s1 = updatedSlots.find(s => s.eventId === evt.id && s.slotNumber === 1);
    if (s1 && s1.startTime !== expectedSlot1Time) {
      s1.startTime = expectedSlot1Time;
      s1.slotName = 'BT1';
      updatedCount++;
    }

    const s2 = updatedSlots.find(s => s.eventId === evt.id && s.slotNumber === 2);
    if (s2 && s2.startTime !== expectedSlot2Time) {
      s2.startTime = expectedSlot2Time;
      s2.slotName = 'BT2';
      updatedCount++;
    }
  });

  // 2. Find the latest Bear Trap date
  let latestDateStr = '2026-10-07';
  if (bearTrapEvents.length > 0) {
    const lastEvt = bearTrapEvents[bearTrapEvents.length - 1];
    latestDateStr = lastEvt.date.split('T')[0];
  }

  // 3. Automatically schedule future Bear Traps (every 48 hours / 2 days)
  const activeMembers = members.filter(m => m.status !== 'Archived');
  const now = new Date().toISOString();

  for (let step = 1; step <= futureCyclesCount; step++) {
    const futureDateStr = addDaysToDateStr(latestDateStr, step * 2);
    const futureIso = `${futureDateStr}T16:00:00.000Z`;
    const nextDayStr = getNextDayStr(futureDateStr);

    // Check if event already exists
    const exists = updatedEvents.some(
      e => e.eventType === 'Bear Trap' && e.date.split('T')[0] === futureDateStr
    );

    if (!exists) {
      const parentId = `evt-parent-bt-${futureDateStr}`;
      const slot1Id = `slot-${parentId}-1`;
      const slot2Id = `slot-${parentId}-2`;

      const newParentEvent: AllianceEvent = {
        id: parentId,
        eventType: 'Bear Trap',
        eventName: 'Bear Trap',
        date: futureIso,
        status: getComputedEventStatus(futureIso) === 'Upcoming' ? 'Scheduled' : 'Completed',
        createdAt: now,
        updatedAt: now,
      };

      const slot1: EventSlot = {
        id: slot1Id,
        eventId: parentId,
        slotNumber: 1,
        slotName: 'BT1',
        startTime: `${futureDateStr} 16:00 UTC`,
        createdAt: now,
      };

      const slot2: EventSlot = {
        id: slot2Id,
        eventId: parentId,
        slotNumber: 2,
        slotName: 'BT2',
        startTime: `${nextDayStr} 00:30 UTC`,
        createdAt: now,
      };

      const newParts: EventParticipation[] = activeMembers.map(m => ({
        id: `part-${parentId}-${m.id}`,
        eventId: parentId,
        memberId: m.id,
        selectedSlotId: null,
        voteStatus: 'NO_VOTE',
        attendanceStatus: 'NOT_MARKED',
        attendanceSlotId: null,
        penaltyStatus: 'NONE',
        penaltyNote: null,
        createdAt: now,
        updatedAt: now,
      }));

      updatedEvents.push(newParentEvent);
      updatedSlots.push(slot1, slot2);
      updatedParticipations.push(...newParts);
      updatedCount++;
    }
  }

  return {
    events: updatedEvents,
    slots: updatedSlots,
    participations: updatedParticipations,
    updatedCount,
  };
}
