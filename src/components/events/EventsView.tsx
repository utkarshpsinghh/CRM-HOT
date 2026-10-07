import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { calculateEventHealthMetrics } from '../../utils/eventCalculations';
import {
  Swords,
  Plus,
  Calendar,
  Clock,
  ChevronRight,
  BarChart3,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus, getEventRelativeTime, parseDateAsUtc } from '../../utils/date';

interface EventsViewProps {
  onOpenCreateEvent: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onOpenCreateEvent }) => {
  const {
    events,
    eventSlots,
    eventParticipations,
    members,
    setSelectedEventIdForAttendance,
    setActiveTab,
  } = useCRM();
  const { isMainAdmin } = useAuth();

  // Filters and Sorting
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Upcoming' | 'Completed'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'earliest' | 'latest'>('latest');

  const mainEventTypes = ['Bear Trap', 'Swordsland', 'Tri Alliance'];

  // Count upcoming vs completed based strictly on date/time (including Slot 2)
  const statusCounts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    events.forEach(e => {
      const slot2 = eventSlots.find(s => s.eventId === e.id && s.slotNumber === 2);
      const s = getComputedEventStatus(e.date, slot2?.startTime);
      if (s === 'Upcoming') upcoming++;
      else completed++;
    });
    return { total: events.length, upcoming, completed };
  }, [events, eventSlots]);

  // Overall benchmark participation stats per main event type
  const typeAverages = useMemo(() => {
    const map: Record<string, { totalEvents: number; avgParticipation: number; avgVoting: number }> = {
      'Bear Trap': { totalEvents: 0, avgParticipation: 0, avgVoting: 0 },
      'Swordsland': { totalEvents: 0, avgParticipation: 0, avgVoting: 0 },
      'Tri Alliance': { totalEvents: 0, avgParticipation: 0, avgVoting: 0 },
    };

    let btSum = 0, btCount = 0;
    let slSum = 0, slCount = 0;
    let triSum = 0, triCount = 0;

    const eligibleCount = members.filter(m => m.status !== 'Archived').length;
    events.forEach(e => {
      const metrics = calculateEventHealthMetrics(e.id, eventSlots, eventParticipations, eligibleCount);
      const t = e.eventType;
      if (t === 'Bear Trap') {
        btSum += metrics.overallParticipationRate;
        btCount++;
      } else if (t === 'Swordsland') {
        slSum += metrics.overallParticipationRate;
        slCount++;
      } else if (t === 'Tri Alliance') {
        triSum += metrics.overallParticipationRate;
        triCount++;
      }
    });

    map['Bear Trap'] = { totalEvents: btCount, avgParticipation: btCount > 0 ? Math.round(btSum / btCount) : 0, avgVoting: 0 };
    map['Swordsland'] = { totalEvents: slCount, avgParticipation: slCount > 0 ? Math.round(slSum / slCount) : 0, avgVoting: 0 };
    map['Tri Alliance'] = { totalEvents: triCount, avgParticipation: triCount > 0 ? Math.round(triSum / triCount) : 0, avgVoting: 0 };

    return map;
  }, [events, members, eventSlots, eventParticipations]);

  // Filter and sort events
  const processedEvents = useMemo(() => {
    return events
      .filter(e => {
        const slot2 = eventSlots.find(s => s.eventId === e.id && s.slotNumber === 2);
        const computedStatus = getComputedEventStatus(e.date, slot2?.startTime);
        if (statusFilter !== 'ALL' && computedStatus !== statusFilter) return false;
        if (typeFilter !== 'ALL' && e.eventType !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const tA = parseDateAsUtc(a.date)?.getTime() || new Date(a.date).getTime() || 0;
        const tB = parseDateAsUtc(b.date)?.getTime() || new Date(b.date).getTime() || 0;
        return sortOrder === 'earliest' ? tA - tB : tB - tA;
      });
  }, [events, eventSlots, statusFilter, typeFilter, sortOrder]);

  const handleOpenAttendance = (eventId: string) => {
    sounds.playClick();
    setSelectedEventIdForAttendance(eventId);
    setActiveTab('attendance');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight font-fantasy">
              Alliance Events
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            2-Slot War Events (Bear Trap, Swordsland, Tri Alliance) with independent voting & slot attendance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isMainAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenCreateEvent();
              }}
              className="btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Benchmark Turnout Rates Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-fantasy">
            Event Turnout Benchmarks
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {mainEventTypes.map(eType => {
            const stats = typeAverages[eType] || { totalEvents: 0, avgParticipation: 0 };
            const isFilterActive = typeFilter === eType;

            return (
              <div
                key={eType}
                onClick={() => {
                  sounds.playClick();
                  setTypeFilter(prev => (prev === eType ? 'ALL' : eType));
                }}
                className={`p-2.5 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isFilterActive
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-200 font-fantasy truncate">{eType}</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">{stats.totalEvents} Cycles</span>
                </div>
                <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between">
                  <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono">
                    {stats.avgParticipation}%
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400">Avg Turnout</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/80 border border-slate-800 w-full sm:w-fit overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('ALL');
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({statusCounts.total})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('Upcoming');
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              statusFilter === 'Upcoming'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Upcoming ({statusCounts.upcoming})</span>
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('Completed');
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              statusFilter === 'Completed'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed ({statusCounts.completed})</span>
          </button>
        </div>

        {/* Type & Sort Controls */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            {mainEventTypes.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              sounds.playClick();
              setSortOrder(prev => (prev === 'earliest' ? 'latest' : 'earliest'));
            }}
            className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{sortOrder === 'earliest' ? 'Earliest First' : 'Latest First'}</span>
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {processedEvents.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-slate-200">
            No Events Found
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {events.length === 0
              ? 'No alliance events have been scheduled yet.'
              : 'No events match your current filter selection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedEvents.map(event => {
            const eligibleCount = members.filter(m => m.status !== 'Archived').length;
            const metrics = calculateEventHealthMetrics(event.id, eventSlots, eventParticipations, eligibleCount);
            const slotsForEvent = eventSlots.filter(s => s.eventId === event.id);
            const slot1 = slotsForEvent.find(s => s.slotNumber === 1);
            const slot2 = slotsForEvent.find(s => s.slotNumber === 2);
            const computedStatus = getComputedEventStatus(event.date, slot2?.startTime);
            const relativeTime = getEventRelativeTime(event.date);

            const formattedDate = safeFormatDate(event.date, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const slot1Metrics = metrics.slots.find(s => s.slotNumber === 1);
            const slot2Metrics = metrics.slots.find(s => s.slotNumber === 2);

            return (
              <div
                key={event.id}
                className={`rounded-xl border p-4 transition-all flex flex-col justify-between bg-slate-900/80 hover:bg-slate-900 ${
                  computedStatus === 'Upcoming'
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top: Event Type & Date */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-base text-slate-100 font-fantasy">
                          {event.eventType}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                            computedStatus === 'Upcoming'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {computedStatus === 'Upcoming' ? (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              <span>Upcoming</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Completed</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{event.eventName}</p>
                    </div>

                    <div className="text-right text-xs text-slate-400 font-mono shrink-0">
                      <div className="font-semibold text-slate-200">{formattedDate} UTC</div>
                      {relativeTime && (
                        <div className="text-[10px] text-amber-400 font-medium">{relativeTime}</div>
                      )}
                    </div>
                  </div>

                  {/* Overall Turnout Stats */}
                  <div className="my-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {event.eventType === 'Bear Trap' ? 'Actual Turnout:' : 'Turnout (Joined):'}
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {metrics.overallParticipationRate}% ({metrics.uniqueAttendees}/{metrics.eligibleMembersCount})
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-600 to-amber-400 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, metrics.overallParticipationRate)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>
                        {event.eventType === 'Bear Trap' ? 'Voted: ' : 'Selected: '}
                        {metrics.votingRate}% ({metrics.totalVoters})
                      </span>
                      <span>
                        {event.eventType === 'Bear Trap' ? 'No Vote: ' : 'Not Selected: '}
                        {metrics.noVoteCount}
                      </span>
                    </div>
                  </div>

                  {/* 2-Slot Health Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-slate-950/40 border border-slate-800/60 mb-3">
                    <div className="border-r border-slate-800 pr-2">
                      <div className="text-[11px] font-bold text-amber-300 font-fantasy truncate">
                        {slot1?.slotName || 'Slot 1'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{slot1?.startTime || '16:00 UTC'}</div>
                      <div className="mt-1 font-mono text-xs">
                        <span className="text-slate-200 font-bold">{slot1Metrics?.actualAttendees || 0}</span>
                        <span className="text-slate-400 text-[10px]"> ({slot1Metrics?.participationRate || 0}%)</span>
                      </div>
                    </div>

                    <div className="pl-1">
                      <div className="text-[11px] font-bold text-amber-300 font-fantasy truncate">
                        {slot2?.slotName || 'Slot 2'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{slot2?.startTime || '02:00 UTC'}</div>
                      <div className="mt-1 font-mono text-xs">
                        <span className="text-slate-200 font-bold">{slot2Metrics?.actualAttendees || 0}</span>
                        <span className="text-slate-400 text-[10px]"> ({slot2Metrics?.participationRate || 0}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Potential Penalty Notice */}
                  {metrics.potentialReviewsCount > 0 && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Potential Penalty Review</span>
                      </span>
                      <span className="font-mono font-bold bg-rose-500/20 px-1.5 py-0.2 rounded text-rose-200">
                        {metrics.potentialReviewsCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span>{metrics.eligibleMembersCount} members</span>
                  </span>
                  <button
                    onClick={() => handleOpenAttendance(event.id)}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Dashboard & Attendance</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
