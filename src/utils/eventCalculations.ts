import {
  AllianceEvent,
  EventSlot,
  EventParticipation,
  EventHealthMetrics,
  SlotHealthMetric,
  MemberEventTypeStats,
  MainEventType,
} from '../types/crm';

/**
 * Standard event types recognized by the alliance
 */
export const MAIN_EVENT_TYPES: Array<{
  type: MainEventType;
  slot1Name: string;
  slot2Name: string;
  defaultTime1: string;
  defaultTime2: string;
}> = [
  {
    type: 'Bear Trap',
    slot1Name: 'BT1',
    slot2Name: 'BT2',
    defaultTime1: '16:00',
    defaultTime2: '00:30',
  },
  {
    type: 'Swordsland',
    slot1Name: 'Swordsland 1',
    slot2Name: 'Swordsland 2',
    defaultTime1: '02:00',
    defaultTime2: '14:00',
  },
  {
    type: 'Tri Alliance',
    slot1Name: 'Tri Alliance 1',
    slot2Name: 'Tri Alliance 2',
    defaultTime1: '02:00',
    defaultTime2: '14:00',
  },
];

/**
 * Generate default slot definitions for any event type
 */
export function getDefaultSlotsForEventType(
  eventType: string,
  eventId: string,
  baseDate: string
): EventSlot[] {
  const matched = MAIN_EVENT_TYPES.find(
    m => m.type.toLowerCase() === eventType.toLowerCase()
  );

  const slot1Name = matched ? matched.slot1Name : `${eventType} 1`;
  const slot2Name = matched ? matched.slot2Name : `${eventType} 2`;
  const time1 = matched ? matched.defaultTime1 : '16:00';
  const time2 = matched ? matched.defaultTime2 : '02:00';

  const datePart = (baseDate || '').split('T')[0] || new Date().toISOString().split('T')[0];
  
  // For Bear Trap, Slot 1 is typically 16:00 UTC and Slot 2 is at 02:00 UTC the following day
  let slot2DatePart = datePart;
  if (matched?.type === 'Bear Trap') {
    const baseD = new Date(baseDate || Date.now());
    if (!isNaN(baseD.getTime())) {
      const nextD = new Date(baseD.getTime() + 24 * 60 * 60 * 1000);
      slot2DatePart = nextD.toISOString().split('T')[0];
    }
  }

  return [
    {
      id: `slot-${eventId}-1`,
      eventId,
      slotNumber: 1,
      slotName: slot1Name,
      startTime: `${datePart} ${time1} UTC`,
      createdAt: new Date().toISOString(),
    },
    {
      id: `slot-${eventId}-2`,
      eventId,
      slotNumber: 2,
      slotName: slot2Name,
      startTime: `${slot2DatePart} ${time2} UTC`,
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Data integrity validation rules (Requirement 12)
 */
export function validateParticipationRecord(participation: EventParticipation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // If attendance_status = ATTENDED: attendance_slot_id MUST NOT be null
  if (participation.attendanceStatus === 'ATTENDED' && !participation.attendanceSlotId) {
    errors.push('Attended status requires an attendance slot.');
  }

  // If attendance_status = ABSENT: attendance_slot_id MUST be null
  if (participation.attendanceStatus === 'ABSENT' && participation.attendanceSlotId) {
    errors.push('Absent status cannot have an attendance slot.');
  }

  // If vote_status = NO_VOTE: selected_slot_id MUST be null
  if (participation.voteStatus === 'NO_VOTE' && participation.selectedSlotId) {
    errors.push('No vote status cannot have a selected slot.');
  }

  // If vote_status = VOTED: selected_slot_id MUST NOT be null
  if (participation.voteStatus === 'VOTED' && !participation.selectedSlotId) {
    errors.push('Voted status requires a selected slot.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize / fix a participation record to guarantee consistency
 */
export function sanitizeParticipationRecord(
  p: Partial<EventParticipation> & { id: string; eventId: string; memberId: string }
): EventParticipation {
  let voteStatus = p.voteStatus || 'NO_VOTE';
  let selectedSlotId = p.selectedSlotId || null;
  if (voteStatus === 'NO_VOTE') {
    selectedSlotId = null;
  } else if (!selectedSlotId) {
    voteStatus = 'NO_VOTE';
  }

  let attendanceStatus = p.attendanceStatus || 'NOT_MARKED';
  let attendanceSlotId = p.attendanceSlotId || null;
  if (attendanceStatus !== 'ATTENDED') {
    attendanceSlotId = null;
  } else if (!attendanceSlotId) {
    attendanceStatus = 'NOT_MARKED';
  }

  return {
    id: p.id,
    eventId: p.eventId,
    memberId: p.memberId,
    selectedSlotId,
    voteStatus,
    attendanceStatus,
    attendanceSlotId,
    penaltyStatus: p.penaltyStatus || 'NONE',
    penaltyNote: p.penaltyNote || null,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  };
}

/**
 * Check if a participation qualifies as a "Potential Penalty Review"
 * Definition: Member voted for a slot but was marked ABSENT
 */
export function isPotentialPenaltyReview(p: EventParticipation): boolean {
  return p.voteStatus === 'VOTED' && p.attendanceStatus === 'ABSENT';
}

/**
 * Dynamically calculate event health & slot metrics (Requirement 5, 6, 7, 8, 9, 10, 17)
 * Never permanently stored; computed on the fly from raw data.
 */
export function calculateEventHealthMetrics(
  eventId: string,
  slots: EventSlot[],
  participations: EventParticipation[],
  eligibleMembersCount: number
): EventHealthMetrics {
  const eligible = Math.max(1, eligibleMembersCount);

  const eventParts = participations.filter(p => p.eventId === eventId);
  const eventSlots = slots.filter(s => s.eventId === eventId).sort((a, b) => a.slotNumber - b.slotNumber);

  const slot1 = eventSlots[0] || null;
  const slot2 = eventSlots[1] || null;

  let totalVoters = 0;
  let noVoteCount = 0;
  let nonVotersAttendedCount = 0;
  let potentialReviewsCount = 0;
  let penaltiesIssuedCount = 0;
  let penaltiesWaivedCount = 0;

  let slot1ToSlot2 = 0;
  let slot2ToSlot1 = 0;

  const uniqueAttendeesSet = new Set<string>();

  // Slot-specific tallies
  const slotMetricsMap = new Map<string, {
    votedCount: number;
    actualAttendees: number;
    followedVoteCount: number;
  }>();

  eventSlots.forEach(s => {
    slotMetricsMap.set(s.id, { votedCount: 0, actualAttendees: 0, followedVoteCount: 0 });
  });

  eventParts.forEach(p => {
    // 1. Voting status
    if (p.voteStatus === 'VOTED' && p.selectedSlotId) {
      totalVoters++;
      const slotStats = slotMetricsMap.get(p.selectedSlotId);
      if (slotStats) {
        slotStats.votedCount++;
      }
    } else {
      noVoteCount++;
    }

    // 2. Attendance status
    if (p.attendanceStatus === 'ATTENDED' && p.attendanceSlotId) {
      uniqueAttendeesSet.add(p.memberId);
      const slotStats = slotMetricsMap.get(p.attendanceSlotId);
      if (slotStats) {
        slotStats.actualAttendees++;
      }

      // Check vote fulfillment (voted that slot and attended that slot)
      if (p.voteStatus === 'VOTED' && p.selectedSlotId === p.attendanceSlotId) {
        if (slotStats) {
          slotStats.followedVoteCount++;
        }
      }

      // Check non-voters who attended (Requirement 8)
      if (p.voteStatus === 'NO_VOTE') {
        nonVotersAttendedCount++;
      }

      // Check changed slots (Requirement 9)
      if (slot1 && slot2 && p.voteStatus === 'VOTED') {
        if (p.selectedSlotId === slot1.id && p.attendanceSlotId === slot2.id) {
          slot1ToSlot2++;
        } else if (p.selectedSlotId === slot2.id && p.attendanceSlotId === slot1.id) {
          slot2ToSlot1++;
        }
      }
    }

    // 3. Penalty status & reviews (Requirement 4)
    if (isPotentialPenaltyReview(p)) {
      potentialReviewsCount++;
    }
    if (p.penaltyStatus === 'ISSUED') {
      penaltiesIssuedCount++;
    } else if (p.penaltyStatus === 'WAIVED') {
      penaltiesWaivedCount++;
    }
  });

  const uniqueAttendees = uniqueAttendeesSet.size;
  const votingRate = Math.round((totalVoters / eligible) * 100);
  const overallParticipationRate = Math.round((uniqueAttendees / eligible) * 100);

  const slotMetrics: SlotHealthMetric[] = eventSlots.map(s => {
    const data = slotMetricsMap.get(s.id) || { votedCount: 0, actualAttendees: 0, followedVoteCount: 0 };
    const participationRate = Math.round((data.actualAttendees / eligible) * 100);
    const fulfillmentRate = data.votedCount > 0
      ? Math.round((data.followedVoteCount / data.votedCount) * 100)
      : 0;

    return {
      slotId: s.id,
      slotNumber: s.slotNumber,
      slotName: s.slotName,
      startTime: s.startTime,
      actualAttendees: data.actualAttendees,
      participationRate,
      votedCount: data.votedCount,
      followedVoteCount: data.followedVoteCount,
      fulfillmentRate,
    };
  });

  return {
    eventId,
    eligibleMembersCount: eligible,
    totalVoters,
    noVoteCount,
    votingRate,
    uniqueAttendees,
    overallParticipationRate,
    slots: slotMetrics,
    changedSlotCount: {
      slot1ToSlot2,
      slot2ToSlot1,
    },
    nonVotersAttendedCount,
    potentialReviewsCount,
    penaltiesIssuedCount,
    penaltiesWaivedCount,
  };
}

/**
 * Calculate member event history across Bear Trap, Swordsland, and Tri Alliance (Requirement 16)
 */
export function calculateMemberEventStats(
  memberId: string,
  events: AllianceEvent[],
  slots: EventSlot[],
  participations: EventParticipation[]
): Record<string, MemberEventTypeStats> {
  const result: Record<string, MemberEventTypeStats> = {
    'Bear Trap': {
      eventType: 'Bear Trap',
      eventsParticipated: 0,
      slot1Attendance: 0,
      slot2Attendance: 0,
      totalAttendance: 0,
      totalVotes: 0,
      voteFulfillmentCount: 0,
      voteFulfillmentRate: 0,
      penaltiesCount: 0,
    },
    'Swordsland': {
      eventType: 'Swordsland',
      eventsParticipated: 0,
      slot1Attendance: 0,
      slot2Attendance: 0,
      totalAttendance: 0,
      totalVotes: 0,
      voteFulfillmentCount: 0,
      voteFulfillmentRate: 0,
      penaltiesCount: 0,
    },
    'Tri Alliance': {
      eventType: 'Tri Alliance',
      eventsParticipated: 0,
      slot1Attendance: 0,
      slot2Attendance: 0,
      totalAttendance: 0,
      totalVotes: 0,
      voteFulfillmentCount: 0,
      voteFulfillmentRate: 0,
      penaltiesCount: 0,
    },
  };

  const slotMap = new Map(slots.map(s => [s.id, s]));
  const eventMap = new Map(events.map(e => [e.id, e]));

  const memberParts = participations.filter(p => p.memberId === memberId);

  memberParts.forEach(p => {
    const evt = eventMap.get(p.eventId);
    if (!evt) return;

    // Normalize event type key
    let key: string = evt.eventType;
    if (evt.eventType.toLowerCase().includes('bear')) key = 'Bear Trap';
    else if (evt.eventType.toLowerCase().includes('sword')) key = 'Swordsland';
    else if (evt.eventType.toLowerCase().includes('tri')) key = 'Tri Alliance';

    if (!result[key]) {
      result[key] = {
        eventType: key,
        eventsParticipated: 0,
        slot1Attendance: 0,
        slot2Attendance: 0,
        totalAttendance: 0,
        totalVotes: 0,
        voteFulfillmentCount: 0,
        voteFulfillmentRate: 0,
        penaltiesCount: 0,
      };
    }

    const stats = result[key];

    // Votes
    if (p.voteStatus === 'VOTED' && p.selectedSlotId) {
      stats.totalVotes++;
    }

    // Attendance
    if (p.attendanceStatus === 'ATTENDED' && p.attendanceSlotId) {
      stats.eventsParticipated++;
      stats.totalAttendance++;

      const slot = slotMap.get(p.attendanceSlotId);
      if (slot?.slotNumber === 1) {
        stats.slot1Attendance++;
      } else if (slot?.slotNumber === 2) {
        stats.slot2Attendance++;
      }

      // Vote fulfillment
      if (p.voteStatus === 'VOTED' && p.selectedSlotId === p.attendanceSlotId) {
        stats.voteFulfillmentCount++;
      }
    }

    // Penalties
    if (p.penaltyStatus === 'ISSUED') {
      stats.penaltiesCount++;
    }
  });

  // Calculate fulfillment rates
  Object.values(result).forEach(stats => {
    stats.voteFulfillmentRate = stats.totalVotes > 0
      ? Math.round((stats.voteFulfillmentCount / stats.totalVotes) * 100)
      : 0;
  });

  return result;
}
