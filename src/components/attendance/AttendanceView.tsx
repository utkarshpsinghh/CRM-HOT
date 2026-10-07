import React, { useState, useMemo } from 'react';
import { Member, EventParticipation, EventSlot, ParticipationVoteStatus, ParticipationAttendanceStatus, PenaltyStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { RankBadge } from '../common/RankBadge';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { calculateEventHealthMetrics, isPotentialPenaltyReview } from '../../utils/eventCalculations';
import {
  Check,
  X,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Users,
  ShieldAlert,
  Edit3,
  Flame,
  CheckCheck,
  Clock,
  Layers,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus } from '../../utils/date';

interface AttendanceViewProps {
  onOpenAddStrike?: (member: Member, defaultReason: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onOpenAddStrike }) => {
  const {
    events,
    eventSlots,
    eventParticipations,
    members,
    selectedEventIdForAttendance,
    setSelectedEventIdForAttendance,
    setSelectedMemberForProfile,
    updateParticipationVote,
    updateParticipationAttendance,
    updateParticipationPenalty,
    bulkUpdateParticipations,
  } = useCRM();

  const { isMainAdmin } = useAuth();

  // Active selected event
  const currentEvent = useMemo(() => {
    if (!events.length) return null;
    if (selectedEventIdForAttendance) {
      const found = events.find(e => e.id === selectedEventIdForAttendance);
      if (found) return found;
    }
    return events[0];
  }, [events, selectedEventIdForAttendance]);

  // Slots for the active event
  const currentSlots = useMemo(() => {
    if (!currentEvent) return [];
    return eventSlots.filter(s => s.eventId === currentEvent.id);
  }, [eventSlots, currentEvent]);

  const slot1 = currentSlots.find(s => s.slotNumber === 1);
  const slot2 = currentSlots.find(s => s.slotNumber === 2);

  // Eligible alliance members map (excluding Archived)
  const activeMembersMap = useMemo(() => {
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  const eligibleMembers = useMemo(() => {
    return members.filter(m => m.status !== 'Archived');
  }, [members]);

  // Participations for current event
  const currentParticipations = useMemo(() => {
    if (!currentEvent) return [];
    const partMap = new Map(
      eventParticipations.filter(p => p.eventId === currentEvent.id).map(p => [p.memberId, p])
    );
    return eligibleMembers.map(m => {
      const existing = partMap.get(m.id);
      if (existing) return existing;
      return {
        id: `part-${currentEvent.id}-${m.id}`,
        eventId: currentEvent.id,
        memberId: m.id,
        selectedSlotId: null,
        voteStatus: 'NO_VOTE' as const,
        attendanceStatus: 'NOT_MARKED' as const,
        attendanceSlotId: null,
        penaltyStatus: 'NONE' as const,
        penaltyNote: null,
        createdAt: currentEvent.createdAt || new Date().toISOString(),
        updatedAt: currentEvent.createdAt || new Date().toISOString(),
      };
    });
  }, [eventParticipations, currentEvent, eligibleMembers]);

  // Event Health Metrics
  const metrics = useMemo(() => {
    if (!currentEvent) {
      return {
        eventId: '',
        eligibleMembersCount: eligibleMembers.length,
        totalVoters: 0,
        noVoteCount: eligibleMembers.length,
        votingRate: 0,
        uniqueAttendees: 0,
        overallParticipationRate: 0,
        slots: [],
        changedSlotCount: { slot1ToSlot2: 0, slot2ToSlot1: 0 },
        nonVotersAttendedCount: 0,
        potentialReviewsCount: 0,
        penaltiesIssuedCount: 0,
        penaltiesWaivedCount: 0,
      };
    }
    return calculateEventHealthMetrics(currentEvent.id, currentSlots, currentParticipations, eligibleMembers.length);
  }, [currentEvent, currentSlots, currentParticipations, eligibleMembers]);

  const slot1Metrics = metrics.slots.find(s => s.slotNumber === 1);
  const slot2Metrics = metrics.slots.find(s => s.slotNumber === 2);

  // UI Filters
  const [activeTabFilter, setActiveTabFilter] = useState<
    'ALL' | 'SLOT_1' | 'SLOT_2' | 'POTENTIAL_PENALTY' | 'NON_VOTERS' | 'CHANGED_SLOT' | 'ABSENT'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('rank_desc');

  // Edit / Penalty modal state
  const [editingParticipation, setEditingParticipation] = useState<EventParticipation | null>(null);
  const [editVoteStatus, setEditVoteStatus] = useState<ParticipationVoteStatus>('NO_VOTE');
  const [editVoteSlotId, setEditVoteSlotId] = useState<string | null>(null);
  const [editAttendanceStatus, setEditAttendanceStatus] = useState<ParticipationAttendanceStatus>('NOT_MARKED');
  const [editAttendanceSlotId, setEditAttendanceSlotId] = useState<string | null>(null);
  const [editPenaltyStatus, setEditPenaltyStatus] = useState<PenaltyStatus>('NONE');
  const [editPenaltyNote, setEditPenaltyNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (p: EventParticipation) => {
    sounds.playClick();
    setEditingParticipation(p);
    setEditVoteStatus(p.voteStatus);
    setEditVoteSlotId(p.selectedSlotId);
    setEditAttendanceStatus(p.attendanceStatus);
    setEditAttendanceSlotId(p.attendanceSlotId);
    setEditPenaltyStatus(p.penaltyStatus);
    setEditPenaltyNote(p.penaltyNote || '');
  };

  const handleSaveEdit = async () => {
    if (!editingParticipation || !currentEvent) return;
    setIsSavingEdit(true);

    const memberId = editingParticipation.memberId;
    const eventId = currentEvent.id;

    // Only Main Admin can update vote and attendance
    if (isMainAdmin) {
      await updateParticipationVote(eventId, memberId, editVoteSlotId, editVoteStatus);
      await updateParticipationAttendance(eventId, memberId, editAttendanceSlotId, editAttendanceStatus);
    }

    // Both Main Admin and R4 officers can update manual penalties
    await updateParticipationPenalty(eventId, memberId, editPenaltyStatus, editPenaltyNote.trim() || undefined);

    setIsSavingEdit(false);
    setEditingParticipation(null);
  };

  // Quick action: quick toggle attendance
  const handleQuickMarkAttendance = async (
    memberId: string,
    status: ParticipationAttendanceStatus,
    slotId: string | null
  ) => {
    if (!isMainAdmin || !currentEvent) return;
    sounds.playClick();
    await updateParticipationAttendance(currentEvent.id, memberId, slotId, status);
  };

  // Bulk actions: auto-fill attendance from poll votes
  const handleAutoFillFromVotes = async () => {
    if (!isMainAdmin || !currentEvent) return;
    sounds.playClick();
    const updates: EventParticipation[] = [];
    currentParticipations.forEach(p => {
      if (p.voteStatus === 'VOTED' && p.selectedSlotId && p.attendanceStatus === 'NOT_MARKED') {
        updates.push({
          ...p,
          attendanceStatus: 'ATTENDED',
          attendanceSlotId: p.selectedSlotId,
          updatedAt: new Date().toISOString(),
        });
      }
    });
    if (updates.length > 0) {
      await bulkUpdateParticipations(currentEvent.id, updates);
    }
  };

  // Bulk actions: mark remaining un-marked members as Absent
  const handleMarkUnmarkedAbsent = async () => {
    if (!isMainAdmin || !currentEvent) return;
    sounds.playClick();
    const updates: EventParticipation[] = [];
    currentParticipations.forEach(p => {
      if (p.attendanceStatus === 'NOT_MARKED') {
        updates.push({
          ...p,
          attendanceStatus: 'ABSENT',
          attendanceSlotId: null,
          updatedAt: new Date().toISOString(),
        });
      }
    });
    if (updates.length > 0) {
      await bulkUpdateParticipations(currentEvent.id, updates);
    }
  };

  // Filtered and sorted member records
  const filteredRecords = useMemo(() => {
    const list = currentParticipations.filter(p => {
      const member = activeMembersMap.get(p.memberId);
      if (!member) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = member.name.toLowerCase().includes(q);
        const matchGameId = member.gameId ? member.gameId.toLowerCase().includes(q) : false;
        if (!matchName && !matchGameId) return false;
      }

      // Rank filter
      if (rankFilter !== 'ALL' && member.currentRank !== rankFilter) {
        return false;
      }

      // Tab filter
      if (activeTabFilter === 'SLOT_1') {
        return p.attendanceStatus === 'ATTENDED' && p.attendanceSlotId === slot1?.id;
      }
      if (activeTabFilter === 'SLOT_2') {
        return p.attendanceStatus === 'ATTENDED' && p.attendanceSlotId === slot2?.id;
      }
      if (activeTabFilter === 'POTENTIAL_PENALTY') {
        return isPotentialPenaltyReview(p);
      }
      if (activeTabFilter === 'NON_VOTERS') {
        return p.voteStatus === 'NO_VOTE' && p.attendanceStatus === 'ATTENDED';
      }
      if (activeTabFilter === 'CHANGED_SLOT') {
        return (
          p.voteStatus === 'VOTED' &&
          p.attendanceStatus === 'ATTENDED' &&
          p.selectedSlotId &&
          p.attendanceSlotId &&
          p.selectedSlotId !== p.attendanceSlotId
        );
      }
      if (activeTabFilter === 'ABSENT') {
        return p.attendanceStatus === 'ABSENT';
      }

      return true;
    });

    // Sort
    const rankWeight: Record<string, number> = { R5: 5, R4: 4, R3: 3, R2: 2, R1: 1, Visitor: 0 };
    return list.sort((a, b) => {
      const mA = activeMembersMap.get(a.memberId);
      const mB = activeMembersMap.get(b.memberId);
      if (!mA || !mB) return 0;

      if (sortBy === 'rank_desc') {
        const wA = rankWeight[mA.currentRank] ?? 0;
        const wB = rankWeight[mB.currentRank] ?? 0;
        if (wB !== wA) return wB - wA;
        return mA.name.localeCompare(mB.name);
      }
      if (sortBy === 'name_asc') {
        return mA.name.localeCompare(mB.name);
      }
      if (sortBy === 'name_desc') {
        return mB.name.localeCompare(mA.name);
      }
      return 0;
    });
  }, [
    currentParticipations,
    activeMembersMap,
    searchQuery,
    rankFilter,
    activeTabFilter,
    sortBy,
    slot1,
    slot2,
  ]);

  if (!currentEvent) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
        <Calendar className="w-10 h-10 mx-auto text-slate-500" />
        <div className="text-base font-bold text-slate-200">No Alliance Events Scheduled</div>
        <p className="text-xs text-slate-400">Schedule a 2-slot war event to begin taking attendance.</p>
      </div>
    );
  }

  const computedStatus = getComputedEventStatus(currentEvent.date, slot2?.startTime);
  const isBearTrap = currentEvent.eventType === 'Bear Trap';
  const absentCount = currentParticipations.filter(p => p.attendanceStatus === 'ABSENT').length;
  const unmarkedCount = currentParticipations.filter(p => p.attendanceStatus === 'NOT_MARKED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar: Event Selector & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-slate-100 font-fantasy uppercase tracking-wide">
              {currentEvent.eventType}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${
                computedStatus === 'Upcoming'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{computedStatus}</span>
            </span>
            {!isMainAdmin && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/30">
                View Only
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
            <span>{safeFormatDate(currentEvent.date, { month: 'short', day: 'numeric', year: 'numeric' })} (UTC)</span>
            <span>•</span>
            <span className="text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Slot 1 ({slot1?.slotName || 'Slot 1'}): {slot1?.startTime || '16:00 UTC'}
            </span>
            <span>•</span>
            <span className="text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Slot 2 ({slot2?.slotName || 'Slot 2'}): {slot2?.startTime || '02:00 UTC'}
            </span>
          </div>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs text-slate-400 font-medium shrink-0">Select Event:</label>
          <select
            value={currentEvent.id}
            onChange={e => {
              sounds.playClick();
              setSelectedEventIdForAttendance(e.target.value);
            }}
            className="flex-1 md:flex-initial px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.eventType} — {safeFormatDate(e.date, { month: 'short', day: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Officer View / Penalty Notice */}
      {!isMainAdmin && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Attendance is view-only. You can review attendance and manage manual penalties.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0 text-amber-200 border border-amber-500/30">
            Officer
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Turnout */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-fantasy flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isBearTrap ? 'Turnout' : 'Joined'}</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {metrics.overallParticipationRate}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {metrics.uniqueAttendees} <span className="text-xs text-slate-400 font-normal">/ {metrics.eligibleMembersCount}</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{slot1?.slotName || 'Slot 1'}: <strong className="text-slate-200 font-mono">{slot1Metrics?.actualAttendees || 0}</strong></span>
            <span>{slot2?.slotName || 'Slot 2'}: <strong className="text-slate-200 font-mono">{slot2Metrics?.actualAttendees || 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Votes / Selected */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-fantasy flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{isBearTrap ? 'Votes' : 'Selected'}</span>
            </span>
            <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded">
              {metrics.votingRate}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {metrics.totalVoters} <span className="text-xs text-slate-400 font-normal">/ {metrics.eligibleMembersCount}</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{slot1?.slotName || 'Slot 1'}: <strong className="text-slate-200 font-mono">{slot1Metrics?.votedCount || 0}</strong></span>
            <span>{slot2?.slotName || 'Slot 2'}: <strong className="text-slate-200 font-mono">{slot2Metrics?.votedCount || 0}</strong></span>
          </div>
        </div>

        {/* Card 3: Absent */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider font-fantasy flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" />
              <span>Absent</span>
            </span>
            <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded">
              {absentCount}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {absentCount} <span className="text-xs text-slate-400 font-normal">members</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Not Marked: <strong className="text-slate-200 font-mono">{unmarkedCount}</strong></span>
            <span>{isBearTrap ? 'No Vote' : 'Unselected'}: <strong className="text-slate-200 font-mono">{metrics.noVoteCount}</strong></span>
          </div>
        </div>

        {/* Card 4: Penalties */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-fantasy flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Penalties</span>
            </span>
            {metrics.potentialReviewsCount > 0 && (
              <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                {metrics.potentialReviewsCount} Review
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {metrics.penaltiesIssuedCount} <span className="text-xs text-slate-400 font-normal">Issued</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Waived: <strong className="text-emerald-400 font-mono">{metrics.penaltiesWaivedCount}</strong></span>
            <span>Review: <strong className="text-amber-300 font-mono">{metrics.potentialReviewsCount}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 11: EVENT MEMBER TABLE & CONTROLS                                 */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeTabFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Members ({currentParticipations.length})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('SLOT_1');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeTabFilter === 'SLOT_1'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-emerald-400 hover:text-emerald-300'
            }`}
          >
            {slot1?.slotName || 'Slot 1'} {isBearTrap ? 'Attendees' : 'Joined'} ({slot1Metrics?.actualAttendees || 0})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('SLOT_2');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeTabFilter === 'SLOT_2'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-emerald-400 hover:text-emerald-300'
            }`}
          >
            {slot2?.slotName || 'Slot 2'} {isBearTrap ? 'Attendees' : 'Joined'} ({slot2Metrics?.actualAttendees || 0})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('POTENTIAL_PENALTY');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors flex items-center gap-1 ${
              activeTabFilter === 'POTENTIAL_PENALTY'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Potential Review ({metrics.potentialReviewsCount})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('NON_VOTERS');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeTabFilter === 'NON_VOTERS'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-purple-400 hover:text-purple-300'
            }`}
          >
            {isBearTrap ? 'Non-Voters Attended' : 'Unselected Joined'} ({metrics.nonVotersAttendedCount})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('CHANGED_SLOT');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeTabFilter === 'CHANGED_SLOT'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-indigo-400 hover:text-indigo-300'
            }`}
          >
            Changed Slot ({metrics.changedSlotCount.slot1ToSlot2 + metrics.changedSlotCount.slot2ToSlot1})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTabFilter('ABSENT');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeTabFilter === 'ABSENT'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Absent
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search member or Game ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={rankFilter}
              onChange={e => {
                sounds.playClick();
                setRankFilter(e.target.value);
              }}
              aria-label="Filter by Rank"
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Ranks</option>
              <option value="R5">Rank R5</option>
              <option value="R4">Rank R4</option>
              <option value="R3">Rank R3</option>
              <option value="R2">Rank R2</option>
              <option value="R1">Rank R1</option>
              <option value="Visitor">Visitor</option>
            </select>

            <select
              value={sortBy}
              onChange={e => {
                sounds.playClick();
                setSortBy(e.target.value);
              }}
              aria-label="Sort members"
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="rank_desc">Rank (High to Low)</option>
              <option value="name_asc">Name (A to Z)</option>
              <option value="name_desc">Name (Z to A)</option>
            </select>

            {/* Batch Actions */}
            {isMainAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoFillFromVotes}
                  title={
                    isBearTrap
                      ? "Automatically mark attendance based on members' selected poll votes"
                      : "Automatically mark attendance based on members' assigned slots"
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {isBearTrap ? 'Auto-Fill from Votes' : 'Auto-Fill from Slots'}
                  </span>
                  <span className="md:hidden">Auto-Fill</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkUnmarkedAbsent}
                  title="Mark all remaining un-marked members as Absent"
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Mark Unmarked Absent</span>
                  <span className="md:hidden">Mark Absent</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Member Attendance Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
              No members match the current filter.
            </div>
          ) : (
            filteredRecords.map(record => {
              const member = activeMembersMap.get(record.memberId);
              if (!member) return null;

              const votedSlot = currentSlots.find(s => s.id === record.selectedSlotId);
              const attendedSlot = currentSlots.find(s => s.id === record.attendanceSlotId);
              const isPotential = isPotentialPenaltyReview(record);

              return (
                <div
                  key={record.id}
                  className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                    isPotential
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  {/* Top row: Member info & Attendance badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <RankBadge rank={member.currentRank} size="sm" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="font-bold text-slate-100 hover:text-amber-300 text-sm truncate block text-left"
                        >
                          {member.name}
                        </button>
                        {member.gameId && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            ID: {member.gameId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {record.attendanceStatus === 'ATTENDED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          <span>{attendedSlot?.slotName || (isBearTrap ? 'Attended' : 'Joined')}</span>
                        </span>
                      ) : record.attendanceStatus === 'ABSENT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <X className="w-3 h-3" />
                          <span>Absent</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Not Marked
                        </span>
                      )}

                      {!isMainAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditModal(record)}
                          title="Apply manual penalty"
                          className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>Penalty</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        title={isMainAdmin ? 'Review / Edit participation & penalty' : 'View participation details'}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        {isMainAdmin ? <Edit3 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Middle: Vote / Slot Selection */}
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-between">
                      <span>{isBearTrap ? 'In-Game Vote:' : 'Selected Slot:'}</span>
                      <span className="font-mono text-sky-300 font-bold">
                        {votedSlot ? votedSlot.slotName : record.voteStatus === 'VOTED' ? (isBearTrap ? 'Voted' : 'Selected') : (isBearTrap ? 'No Vote' : 'Not Selected')}
                      </span>
                    </div>
                    {isMainAdmin ? (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {slot1 && (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              const isSelected = record.voteStatus === 'VOTED' && record.selectedSlotId === slot1.id;
                              updateParticipationVote(
                                currentEvent.id,
                                member.id,
                                isSelected ? null : slot1.id,
                                isSelected ? 'NO_VOTE' : 'VOTED'
                              );
                            }}
                            className={`flex-1 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                              record.voteStatus === 'VOTED' && record.selectedSlotId === slot1.id
                                ? 'bg-sky-500 text-slate-950 font-black shadow-sm border border-sky-400'
                                : 'bg-slate-950 border border-slate-800 text-sky-400'
                            }`}
                          >
                            {slot1.slotName}
                          </button>
                        )}
                        {slot2 && (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              const isSelected = record.voteStatus === 'VOTED' && record.selectedSlotId === slot2.id;
                              updateParticipationVote(
                                currentEvent.id,
                                member.id,
                                isSelected ? null : slot2.id,
                                isSelected ? 'NO_VOTE' : 'VOTED'
                              );
                            }}
                            className={`flex-1 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                              record.voteStatus === 'VOTED' && record.selectedSlotId === slot2.id
                                ? 'bg-sky-500 text-slate-950 font-black shadow-sm border border-sky-400'
                                : 'bg-slate-950 border border-slate-800 text-sky-400'
                            }`}
                          >
                            {slot2.slotName}
                          </button>
                        )}
                        {record.voteStatus === 'VOTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              updateParticipationVote(currentEvent.id, member.id, null, 'NO_VOTE');
                            }}
                            className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 font-mono cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="pt-0.5 text-xs font-mono">
                        {votedSlot ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            {votedSlot.slotName}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">
                            {isBearTrap ? 'No Vote' : 'Not Selected'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Attendance Status / Quick Mark Buttons */}
                  {isMainAdmin ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      {slot1 && (
                        <button
                          type="button"
                          onClick={() => handleQuickMarkAttendance(member.id, 'ATTENDED', slot1.id)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            record.attendanceStatus === 'ATTENDED' && record.attendanceSlotId === slot1.id
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          ✓ {slot1.slotName}
                        </button>
                      )}
                      {slot2 && (
                        <button
                          type="button"
                          onClick={() => handleQuickMarkAttendance(member.id, 'ATTENDED', slot2.id)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            record.attendanceStatus === 'ATTENDED' && record.attendanceSlotId === slot2.id
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          ✓ {slot2.slotName}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleQuickMarkAttendance(member.id, 'ABSENT', null)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          record.attendanceStatus === 'ABSENT'
                            ? 'bg-rose-500 text-white font-black shadow-sm'
                            : 'bg-slate-800/80 text-slate-400 hover:text-rose-300'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">Attendance:</span>
                      {record.attendanceStatus === 'ATTENDED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          <span>{isBearTrap ? 'Attended' : 'Joined'} {attendedSlot ? `(${attendedSlot.slotName})` : ''}</span>
                        </span>
                      ) : record.attendanceStatus === 'ABSENT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <X className="w-3 h-3" />
                          <span>Absent</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Not Marked</span>
                      )}
                    </div>
                  )}

                  {/* Penalty / Notes Alert if any */}
                  {(isPotential || record.penaltyStatus !== 'NONE' || record.penaltyNote) && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        {record.penaltyStatus === 'ISSUED' ? (
                          <span className="font-bold text-rose-400 uppercase">Penalty: Issued</span>
                        ) : record.penaltyStatus === 'WAIVED' ? (
                          <span className="font-bold text-emerald-400 uppercase">Penalty: Waived</span>
                        ) : isPotential ? (
                          <span className="font-semibold text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Needs Review
                          </span>
                        ) : null}
                      </div>
                      {record.penaltyNote && (
                        <span className="text-slate-400 italic truncate max-w-[180px]">
                          {record.penaltyNote}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Member Table (Desktop & Tablet) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-fantasy uppercase text-[11px]">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">{isBearTrap ? 'Vote' : 'Selected Slot'}</th>
                <th className="py-2.5 px-3">Attendance</th>
                <th className="py-2.5 px-3">Slot Joined</th>
                <th className="py-2.5 px-3">Penalty</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No members match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const member = activeMembersMap.get(record.memberId);
                  if (!member) return null;

                  const votedSlot = currentSlots.find(s => s.id === record.selectedSlotId);
                  const attendedSlot = currentSlots.find(s => s.id === record.attendanceSlotId);
                  const isPotential = isPotentialPenaltyReview(record);

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isPotential ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Member Info */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={member.currentRank} />
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setSelectedMemberForProfile(member);
                              }}
                              className="font-bold text-slate-200 hover:text-amber-300 cursor-pointer text-left transition-colors"
                            >
                              {member.name}
                            </button>
                            {member.gameId && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                ID: {member.gameId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Selected Slot (Vote) */}
                      <td className="py-2.5 px-3">
                        {isMainAdmin ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {slot1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  const isSelected = record.voteStatus === 'VOTED' && record.selectedSlotId === slot1.id;
                                  updateParticipationVote(
                                    currentEvent.id,
                                    member.id,
                                    isSelected ? null : slot1.id,
                                    isSelected ? 'NO_VOTE' : 'VOTED'
                                  );
                                }}
                                title={`${isBearTrap ? 'Vote' : 'Select'} ${slot1.slotName} (click again to clear)`}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  record.voteStatus === 'VOTED' && record.selectedSlotId === slot1.id
                                    ? 'bg-sky-500 text-slate-950 shadow-sm border border-sky-400 font-black'
                                    : 'bg-slate-950 border border-slate-800 text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/10'
                                }`}
                              >
                                {slot1.slotName}
                              </button>
                            )}

                            {slot2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  const isSelected = record.voteStatus === 'VOTED' && record.selectedSlotId === slot2.id;
                                  updateParticipationVote(
                                    currentEvent.id,
                                    member.id,
                                    isSelected ? null : slot2.id,
                                    isSelected ? 'NO_VOTE' : 'VOTED'
                                  );
                                }}
                                title={`${isBearTrap ? 'Vote' : 'Select'} ${slot2.slotName} (click again to clear)`}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  record.voteStatus === 'VOTED' && record.selectedSlotId === slot2.id
                                    ? 'bg-sky-500 text-slate-950 shadow-sm border border-sky-400 font-black'
                                    : 'bg-slate-950 border border-slate-800 text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/10'
                                }`}
                              >
                                {slot2.slotName}
                              </button>
                            )}

                            {record.voteStatus === 'VOTED' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  updateParticipationVote(currentEvent.id, member.id, null, 'NO_VOTE');
                                }}
                                title={`Clear ${isBearTrap ? 'Vote' : 'Selection'}`}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                Clear
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic ml-0.5">
                                {isBearTrap ? 'No Vote' : 'Not Selected'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            {votedSlot ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                {votedSlot.slotName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                {isBearTrap ? 'No Vote' : 'Not Selected'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Attendance Status */}
                      <td className="py-2.5 px-3">
                        {record.attendanceStatus === 'ATTENDED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Check className="w-3 h-3" />
                            <span>{isBearTrap ? 'Attended' : 'Joined'}</span>
                          </span>
                        ) : record.attendanceStatus === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <X className="w-3 h-3" />
                            <span>Absent</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Not Marked</span>
                        )}
                      </td>

                      {/* Actual Slot */}
                      <td className="py-2.5 px-3 font-mono">
                        {attendedSlot ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-300">
                            {attendedSlot.slotName}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Penalty */}
                      <td className="py-2.5 px-3">
                        {record.penaltyStatus === 'ISSUED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500 text-slate-950 shadow-sm">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Issued</span>
                          </span>
                        ) : record.penaltyStatus === 'WAIVED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Waived
                          </span>
                        ) : isPotential ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Needs Review</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">None</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                        {record.penaltyNote || (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        {isMainAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Attend Slot 1 */}
                            {slot1 && (
                              <button
                                type="button"
                                onClick={() => handleQuickMarkAttendance(member.id, 'ATTENDED', slot1.id)}
                                title={`Mark ${isBearTrap ? 'attended' : 'joined'}: ${slot1.slotName}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                                  record.attendanceStatus === 'ATTENDED' && record.attendanceSlotId === slot1.id
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {slot1.slotName}
                              </button>
                            )}

                            {/* Quick Attend Slot 2 */}
                            {slot2 && (
                              <button
                                type="button"
                                onClick={() => handleQuickMarkAttendance(member.id, 'ATTENDED', slot2.id)}
                                title={`Mark ${isBearTrap ? 'attended' : 'joined'}: ${slot2.slotName}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                                  record.attendanceStatus === 'ATTENDED' && record.attendanceSlotId === slot2.id
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {slot2.slotName}
                              </button>
                            )}

                            {/* Quick Mark Absent */}
                            <button
                              type="button"
                              onClick={() => handleQuickMarkAttendance(member.id, 'ABSENT', null)}
                              title="Mark Absent"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                                record.attendanceStatus === 'ABSENT'
                                  ? 'bg-rose-500 text-white font-black'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-rose-300'
                              }`}
                            >
                              ABS
                            </button>

                            {/* Full Edit Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => openEditModal(record)}
                              title="Review / Edit participation & penalty"
                              className="p-1 rounded bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 cursor-pointer transition-colors ml-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(record)}
                              title="Manual Penalty"
                              className="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                            >
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              <span>Penalty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(record)}
                              title="View details"
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>View</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT / VIEW PARTICIPATION & PENALTY MODAL                                 */}
      {/* ========================================================================= */}
      {editingParticipation && (
        <Modal
          isOpen={Boolean(editingParticipation)}
          onClose={() => setEditingParticipation(null)}
          title={isMainAdmin ? "Member Attendance & Penalty" : "Member Record & Penalty"}
          subtitle={
            isMainAdmin
              ? `Update slot, attendance, and manual penalties`
              : `Review member attendance and manage manual penalties`
          }
          icon={isMainAdmin ? <Edit3 className="w-5 h-5 text-[#ca8a04]" /> : <ShieldAlert className="w-5 h-5 text-rose-400" />}
          maxWidth="md"
          position="top"
        >
          {(() => {
            const member = activeMembersMap.get(editingParticipation.memberId);
            if (!member) return null;

            return (
              <div className="space-y-4 text-xs sm:text-sm">
                {!isMainAdmin && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Attendance is view-only. You can apply manual penalties below.</span>
                  </div>
                )}

                {/* Member Header */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RankBadge rank={member.currentRank} />
                    <div>
                      <div className="font-bold text-slate-200 text-sm">{member.name}</div>
                      {member.gameId && (
                        <div className="text-[11px] text-slate-400 font-mono">Game ID: {member.gameId}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>Strikes: <span className="text-rose-400 font-bold">{member.strikes}</span></div>
                  </div>
                </div>

                {/* Slot Selection / In-Game Vote */}
                <div>
                  <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
                    {isBearTrap ? 'In-Game Vote (Pledged Slot)' : 'Selected Slot'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={!isMainAdmin}
                      onClick={() => {
                        if (!isMainAdmin) return;
                        setEditVoteStatus('NO_VOTE');
                        setEditVoteSlotId(null);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                      } ${
                        editVoteStatus === 'NO_VOTE'
                          ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                          : 'bg-[#120c08] border-[#3e2716] text-stone-400 hover:border-slate-600'
                      }`}
                    >
                      {isBearTrap ? 'No Vote' : 'Not Selected'}
                    </button>

                    {slot1 && (
                      <button
                        type="button"
                        disabled={!isMainAdmin}
                        onClick={() => {
                          if (!isMainAdmin) return;
                          setEditVoteStatus('VOTED');
                          setEditVoteSlotId(slot1.id);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all font-mono ${
                          !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                        } ${
                          editVoteStatus === 'VOTED' && editVoteSlotId === slot1.id
                            ? 'bg-sky-500 text-slate-950 border-sky-300 font-black shadow-sm'
                            : 'bg-[#120c08] border-[#3e2716] text-sky-400 hover:border-sky-500'
                        }`}
                      >
                        {slot1.slotName}
                      </button>
                    )}

                    {slot2 && (
                      <button
                        type="button"
                        disabled={!isMainAdmin}
                        onClick={() => {
                          if (!isMainAdmin) return;
                          setEditVoteStatus('VOTED');
                          setEditVoteSlotId(slot2.id);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all font-mono ${
                          !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                        } ${
                          editVoteStatus === 'VOTED' && editVoteSlotId === slot2.id
                            ? 'bg-sky-500 text-slate-950 border-sky-300 font-black shadow-sm'
                            : 'bg-[#120c08] border-[#3e2716] text-sky-400 hover:border-sky-500'
                        }`}
                      >
                        {slot2.slotName}
                      </button>
                    )}
                  </div>
                </div>

                {/* Actual Attendance Status & Slot */}
                <div>
                  <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
                    {isBearTrap ? 'Actual Event Turnout' : 'Turnout (Joined / Absent)'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Attended / Joined Slot 1 */}
                    {slot1 && (
                      <button
                        type="button"
                        disabled={!isMainAdmin}
                        onClick={() => {
                          if (!isMainAdmin) return;
                          setEditAttendanceStatus('ATTENDED');
                          setEditAttendanceSlotId(slot1.id);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all font-mono ${
                          !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                        } ${
                          editAttendanceStatus === 'ATTENDED' && editAttendanceSlotId === slot1.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-sm'
                            : 'bg-[#120c08] border-[#3e2716] text-emerald-400 hover:border-emerald-500'
                        }`}
                      >
                        {isBearTrap ? 'Attended' : 'Joined'} {slot1.slotName}
                      </button>
                    )}

                    {/* Attended / Joined Slot 2 */}
                    {slot2 && (
                      <button
                        type="button"
                        disabled={!isMainAdmin}
                        onClick={() => {
                          if (!isMainAdmin) return;
                          setEditAttendanceStatus('ATTENDED');
                          setEditAttendanceSlotId(slot2.id);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all font-mono ${
                          !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                        } ${
                          editAttendanceStatus === 'ATTENDED' && editAttendanceSlotId === slot2.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-sm'
                            : 'bg-[#120c08] border-[#3e2716] text-emerald-400 hover:border-emerald-500'
                        }`}
                      >
                        {isBearTrap ? 'Attended' : 'Joined'} {slot2.slotName}
                      </button>
                    )}

                    {/* Absent */}
                    <button
                      type="button"
                      disabled={!isMainAdmin}
                      onClick={() => {
                        if (!isMainAdmin) return;
                        setEditAttendanceStatus('ABSENT');
                        setEditAttendanceSlotId(null);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                      } ${
                        editAttendanceStatus === 'ABSENT'
                          ? 'bg-rose-500 text-white border-rose-300 font-black shadow-sm'
                          : 'bg-[#120c08] border-[#3e2716] text-rose-400 hover:border-rose-500'
                      }`}
                    >
                      Absent
                    </button>

                    {/* Not Marked */}
                    <button
                      type="button"
                      disabled={!isMainAdmin}
                      onClick={() => {
                        if (!isMainAdmin) return;
                        setEditAttendanceStatus('NOT_MARKED');
                        setEditAttendanceSlotId(null);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        !isMainAdmin ? 'cursor-default opacity-80' : 'cursor-pointer'
                      } ${
                        editAttendanceStatus === 'NOT_MARKED'
                          ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                          : 'bg-[#120c08] border-[#3e2716] text-stone-400 hover:border-slate-600'
                      }`}
                    >
                      Not Marked
                    </button>
                  </div>
                </div>

                {/* Section: Manual Penalty Decision */}
                <div className="p-3.5 rounded-xl bg-[#17100b] border border-[#452d19] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-fantasy font-bold text-[#fef08a] uppercase flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Manual Penalty</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPenaltyStatus('NONE')}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        editPenaltyStatus === 'NONE'
                          ? 'bg-slate-800 text-slate-200 border-slate-600'
                          : 'bg-[#120c08] border-[#3e2716] text-stone-400 hover:border-slate-700'
                      }`}
                    >
                      None
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditPenaltyStatus('ISSUED');
                        if (!editPenaltyNote) setEditPenaltyNote('Missed event without notice');
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        editPenaltyStatus === 'ISSUED'
                          ? 'bg-rose-500 text-white border-rose-300 font-black shadow-md'
                          : 'bg-[#120c08] border-[#3e2716] text-rose-400 hover:border-rose-500'
                      }`}
                    >
                      Issue Penalty
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditPenaltyStatus('WAIVED');
                        if (!editPenaltyNote) setEditPenaltyNote('Excused by R4');
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        editPenaltyStatus === 'WAIVED'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-md'
                          : 'bg-[#120c08] border-[#3e2716] text-emerald-400 hover:border-emerald-500'
                      }`}
                    >
                      Waive Penalty
                    </button>
                  </div>

                  {/* Penalty Reason */}
                  <div>
                    <label className="block text-[11px] text-amber-300/80 mb-1 font-semibold">
                      Reason / Note:
                    </label>
                    <input
                      type="text"
                      value={editPenaltyNote}
                      onChange={e => setEditPenaltyNote(e.target.value)}
                      placeholder='e.g. "Missed event without notice" or "Excused by R4"'
                      className="w-full px-3 py-2 rounded-lg bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
                    />

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-stone-500">Presets:</span>
                      {['Missed event without notice', 'Excused by R4', 'Real life emergency', 'Work conflict'].map(preset => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => setEditPenaltyNote(preset)}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-stone-400 hover:text-amber-300 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#3e2716]">
                  {onOpenAddStrike && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingParticipation(null);
                        onOpenAddStrike(member, `Missed ${currentEvent.eventType} on ${currentEvent.date.slice(0, 10)}`);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>Issue Strike</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <GameButton
                      variant="slate"
                      size="md"
                      onClick={() => setEditingParticipation(null)}
                      type="button"
                    >
                      Cancel
                    </GameButton>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSavingEdit ? 'Saving...' : isMainAdmin ? 'Save Changes' : 'Save Penalty'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
