import { AllianceEvent, EventSlot, EventParticipation, Member } from '../types/crm';
import { getComputedEventStatus, parseDateAsUtc } from '../utils/date';

/**
 * Standard Bear Trap Cadence:
 * Occurs strictly every 48 hours (every 2 days).
 * Anchor: 27 Sep 2026, 16:00 UTC (Slot 1) and 28 Sep 2026, 00:30 UTC (Slot 2).
 * Sequence:
 * 1st Bear Trap: 27 Sep 2026, 16:00 UTC (BT1) / 28 Sep 2026, 00:30 UTC (BT2)
 * 2nd Bear Trap: 29 Sep 2026, 16:00 UTC (BT1) / 30 Sep 2026, 00:30 UTC (BT2)
 * 3rd Bear Trap: 01 Oct 2026, 16:00 UTC (BT1) / 02 Oct 2026, 00:30 UTC (BT2)
 * 4th Bear Trap: 03 Oct 2026, 16:00 UTC (BT1) / 04 Oct 2026, 00:30 UTC (BT2)
 * 5th Bear Trap: 05 Oct 2026, 16:00 UTC (BT1) / 06 Oct 2026, 00:30 UTC (BT2)
 * 6th Bear Trap: 07 Oct 2026, 16:00 UTC (BT1) / 08 Oct 2026, 00:30 UTC (BT2)
 *
 * CRITICAL RULE: "only schedule 24 hours before the event"
 * An upcoming Bear Trap cycle is ONLY scheduled when the current time is within
 * 24 hours before Slot 1 (i.e. eventStartTime - now <= 24 hours).
 * Any auto-scheduled cycle farther than 24 hours in advance is pruned/removed.
 */

const KNOWN_BEAR_TRAP_DATES = [
  '2026-09-27',
  '2026-09-29',
  '2026-10-01',
  '2026-10-03',
  '2026-10-05',
  '2026-10-07',
];

const ANCHOR_UTC_MS = Date.UTC(2026, 8, 27, 16, 0, 0); // 2026-09-27 16:00:00 UTC
const CADENCE_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 hours
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 24 hours

function getNextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextD = new Date(Date.UTC(y, m - 1, d + 1, 0, 30, 0));
  const ny = nextD.getUTCFullYear();
  const nm = String(nextD.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(nextD.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function syncAndAutoScheduleBearTraps(
  events: AllianceEvent[],
  slots: EventSlot[],
  participations: EventParticipation[],
  members: Member[],
  referenceNowMs?: number,
  deletedEventIds: string[] = []
): {
  events: AllianceEvent[];
  slots: EventSlot[];
  participations: EventParticipation[];
  updatedCount: number;
  prunedEventIds: string[];
} {
  const nowMs = referenceNowMs ?? Date.now();
  const deletedSet = new Set(deletedEventIds);
  let updatedEvents = events.filter(e => !deletedSet.has(e.id));
  let updatedSlots = slots.filter(s => !deletedSet.has(s.eventId) && !deletedSet.has(s.id));
  let updatedParticipations = participations.filter(p => !deletedSet.has(p.eventId));
  let updatedCount = 0;
  const prunedEventIds: string[] = [];

  // 1. Prune any auto-generated Bear Trap events that duplicate known historical dates or are >24 hours away
  // Auto-generated Bear Trap events have ID prefix 'evt-parent-bt-'
  const toRemoveIds = new Set<string>();
  updatedEvents.forEach(evt => {
    if (evt.eventType === 'Bear Trap' && evt.id.startsWith('evt-parent-bt-')) {
      const evtDateStr = evt.date.split('T')[0];
      const isHistoricalDuplicate = KNOWN_BEAR_TRAP_DATES.includes(evtDateStr);
      const eventTime = parseDateAsUtc(evt.date)?.getTime() ?? new Date(evt.date).getTime();
      // If duplicates historical date or start time is more than 24 hours in the future
      if (isHistoricalDuplicate || (eventTime - nowMs > TWENTY_FOUR_HOURS_MS)) {
        toRemoveIds.add(evt.id);
        prunedEventIds.push(evt.id);
        updatedCount++;
      }
    }
  });

  if (toRemoveIds.size > 0) {
    updatedEvents = updatedEvents.filter(e => !toRemoveIds.has(e.id));
    updatedSlots = updatedSlots.filter(s => !toRemoveIds.has(s.eventId));
    updatedParticipations = updatedParticipations.filter(p => !toRemoveIds.has(p.eventId));
  }

  // 2. Identify and sequence all remaining Bear Trap events
  const bearTrapEvents = updatedEvents.filter(e => e.eventType === 'Bear Trap');
  bearTrapEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Correct dates and slot times for known existing Bear Trap cycles
  bearTrapEvents.forEach((evt, idx) => {
    let dateStr = evt.date.split('T')[0];
    if (idx < KNOWN_BEAR_TRAP_DATES.length) {
      dateStr = KNOWN_BEAR_TRAP_DATES[idx];
      const correctIso = `${dateStr}T16:00:00.000Z`;
      const nextDayStr = getNextDayStr(dateStr);
      const expectedSlot2Time = `${nextDayStr} 00:30 UTC`;
      if (evt.date !== correctIso) {
        evt.date = correctIso;
        evt.status = getComputedEventStatus(correctIso, expectedSlot2Time) === 'Upcoming' ? 'Scheduled' : 'Completed';
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

  // 3. Auto-schedule: ONLY within 24 hours before the event (eventStartTime - now <= 24h)
  const activeMembers = members.filter(m => m.status !== 'Archived');
  const nowIso = new Date().toISOString();

  // Iterate forward along 48h cadence starting from anchor
  let k = 0;
  while (true) {
    const cycleTimeMs = ANCHOR_UTC_MS + k * CADENCE_INTERVAL_MS;
    // If cycle is more than 24 hours into the future, stop immediately!
    if (cycleTimeMs - nowMs > TWENTY_FOUR_HOURS_MS) {
      break;
    }

    // Format target cycle UTC date (YYYY-MM-DD)
    const cycleDate = new Date(cycleTimeMs);
    const y = cycleDate.getUTCFullYear();
    const m = String(cycleDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cycleDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const futureIso = `${dateStr}T16:00:00.000Z`;
    const nextDayStr = getNextDayStr(dateStr);
    const expectedSlot2Time = `${nextDayStr} 00:30 UTC`;

    // Check if event already exists for this date
    const exists = updatedEvents.some(
      e => e.eventType === 'Bear Trap' && e.date.split('T')[0] === dateStr
    );

    if (!exists) {
      const parentId = `evt-parent-bt-${dateStr}`;
      if (deletedSet.has(parentId) || deletedSet.has(dateStr)) {
        k++;
        continue;
      }

      // Within 24 hours before the event! Auto-schedule now.
      const slot1Id = `slot-${parentId}-1`;
      const slot2Id = `slot-${parentId}-2`;

      const newParentEvent: AllianceEvent = {
        id: parentId,
        eventType: 'Bear Trap',
        eventName: 'Bear Trap',
        date: futureIso,
        status: getComputedEventStatus(futureIso, expectedSlot2Time) === 'Upcoming' ? 'Scheduled' : 'Completed',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const slot1: EventSlot = {
        id: slot1Id,
        eventId: parentId,
        slotNumber: 1,
        slotName: 'BT1',
        startTime: `${dateStr} 16:00 UTC`,
        createdAt: nowIso,
      };

      const slot2: EventSlot = {
        id: slot2Id,
        eventId: parentId,
        slotNumber: 2,
        slotName: 'BT2',
        startTime: expectedSlot2Time,
        createdAt: nowIso,
      };

      const existingPartKeys = new Set(updatedParticipations.map(p => `${p.eventId}_${p.memberId}`));
      const newParts: EventParticipation[] = activeMembers
        .filter(m => !existingPartKeys.has(`${parentId}_${m.id}`))
        .map(m => ({
          id: `part-${parentId}-${m.id}`,
          eventId: parentId,
          memberId: m.id,
          selectedSlotId: null,
          voteStatus: 'NO_VOTE',
          attendanceStatus: 'NOT_MARKED',
          attendanceSlotId: null,
          penaltyStatus: 'NONE',
          penaltyNote: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        }));

      updatedEvents.push(newParentEvent);
      updatedSlots.push(slot1, slot2);
      updatedParticipations.push(...newParts);
      updatedCount++;
    }

    k++;
  }

  return {
    events: updatedEvents,
    slots: updatedSlots,
    participations: updatedParticipations,
    updatedCount,
    prunedEventIds,
  };
}
