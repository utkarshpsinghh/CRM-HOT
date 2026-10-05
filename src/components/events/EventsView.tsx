import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { GameButton } from '../common/GameButton';
import { ProgressBar } from '../common/ProgressBar';
import { calculateAllEventAverages } from '../../utils/participation';
import {
  Swords,
  PlusCircle,
  Calendar,
  Clock,
  ChevronRight,
  Filter,
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus, getEventRelativeTime } from '../../utils/date';

interface EventsViewProps {
  onOpenCreateEvent: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onOpenCreateEvent }) => {
  const { events, attendance, setSelectedEventIdForAttendance, setActiveTab } = useCRM();
  const { isMainAdmin } = useAuth();

  // Filters and Sorting
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Upcoming' | 'Completed'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'earliest' | 'latest'>('earliest');

  // Compute all-time averages for each event type
  const eventAverages = useMemo(() => {
    return calculateAllEventAverages(events, attendance);
  }, [events, attendance]);

  const coreEventTypes = [
    'BT1',
    'BT2',
    'Swordland L1',
    'Swordland L2',
    'Tri Alliance L1',
    'Tri Alliance L2',
  ];

  // Count upcoming vs completed based strictly on date/time
  const statusCounts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    events.forEach(e => {
      const s = getComputedEventStatus(e.date);
      if (s === 'Upcoming') upcoming++;
      else completed++;
    });
    return { total: events.length, upcoming, completed };
  }, [events]);

  // Filter and sort events (Earliest First by default)
  const processedEvents = useMemo(() => {
    return events
      .filter(e => {
        const computedStatus = getComputedEventStatus(e.date);
        if (statusFilter !== 'ALL' && computedStatus !== statusFilter) return false;
        if (typeFilter !== 'ALL' && e.eventType !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const tA = new Date(a.date).getTime() || 0;
        const tB = new Date(b.date).getTime() || 0;
        return sortOrder === 'earliest' ? tA - tB : tB - tA;
      });
  }, [events, statusFilter, typeFilter, sortOrder]);

  const handleOpenAttendance = (eventId: string) => {
    sounds.playClick();
    setSelectedEventIdForAttendance(eventId);
    setActiveTab('attendance');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#ca8a04] to-[#854d0e] flex items-center justify-center text-black shadow-md">
              <Swords className="w-4 h-4 text-black" />
            </div>
            <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
              Alliance War Events
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#2a170a] border border-[#ca8a04]/40 text-[#fef3c7] font-bold font-mono">
              {events.length}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Battle schedules, attendance records, and turnouts ordered chronologically (earliest first).
          </p>
        </div>

        {isMainAdmin && (
          <button
            type="button"
            onClick={onOpenCreateEvent}
            className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md self-start sm:self-auto hover:scale-105 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {/* ALL-TIME AVERAGE ATTENDANCE STATS CARDS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#ca8a04]" />
            <h2 className="font-fantasy font-bold text-xs sm:text-sm uppercase tracking-wider text-[#fef08a]">
              All-Time Average Attendance by Event Type
            </h2>
          </div>
          <span className="text-[11px] text-stone-400">
            Click badge to quick-filter
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {coreEventTypes.map(t => {
            const stats = eventAverages[t];
            const avgPct = stats ? stats.averageAttendancePercentage : 0;
            const eventCount = stats ? stats.totalEvents : 0;
            const isSelected = typeFilter === t;

            return (
              <button
                key={t}
                onClick={() => {
                  sounds.playClick();
                  setTypeFilter(prev => (prev === t ? 'ALL' : t));
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#331c0d] border-[#fbbf24] shadow-md scale-[1.02]'
                    : 'bg-[#120c08] border-[#3e2716] hover:border-[#ca8a04]'
                }`}
              >
                <div className="text-[11px] font-bold text-stone-300 truncate">
                  {t === 'BT1' ? 'BT1 (Bear Trap 1)' : t === 'BT2' ? 'BT2 (Bear Trap 2)' : t}
                </div>
                <div
                  className={`text-lg sm:text-xl font-fantasy font-black mt-0.5 ${
                    avgPct >= 75
                      ? 'text-emerald-400'
                      : avgPct >= 50
                      ? 'text-amber-400'
                      : avgPct > 0
                      ? 'text-red-400'
                      : 'text-stone-500'
                  }`}
                >
                  {eventCount > 0 ? `${avgPct.toFixed(0)}%` : '—'}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  {eventCount} {eventCount === 1 ? 'event' : 'events'} all-time
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER & SORTING BAR */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] space-y-3 shadow-sm">
        {/* Status Filter Tabs (Upcoming & Completed Only - No Live) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#120c08] border border-[#3e2716] self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>All Events</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                {statusCounts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatusFilter('Upcoming');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === 'Upcoming'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md font-black'
                  : 'text-amber-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Upcoming</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-200 border border-amber-600/40 font-mono font-bold">
                {statusCounts.upcoming}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatusFilter('Completed');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === 'Completed'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-black shadow-md font-black'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-600/40 font-mono font-bold">
                {statusCounts.completed}
              </span>
            </button>
          </div>

          {/* Sort Order Toggle (Earliest First by default) */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] text-stone-400 font-medium">Sort Order:</span>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setSortOrder(prev => (prev === 'earliest' ? 'latest' : 'earliest'));
              }}
              className="px-3 py-1.5 rounded-xl bg-[#120c08] border border-[#3e2716] hover:border-[#ca8a04] text-xs font-fantasy font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>{sortOrder === 'earliest' ? 'Earliest First (Default)' : 'Latest First'}</span>
            </button>
          </div>
        </div>

        {/* Event Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-0.5" />
          <span className="text-[11px] font-fantasy font-bold uppercase text-[#ca8a04] shrink-0 mr-1">
            Type:
          </span>
          {['ALL', ...coreEventTypes].map(t => (
            <button
              key={t}
              onClick={() => {
                sounds.playClick();
                setTypeFilter(t);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-fantasy font-bold tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === t
                  ? 'bg-[#ca8a04] text-[#1e1503] font-black shadow-sm'
                  : 'bg-[#120c08] text-stone-400 hover:text-stone-200 border border-[#2c1d15]'
              }`}
            >
              {t === 'BT1' ? 'BT1' : t === 'BT2' ? 'BT2' : t}
            </button>
          ))}
        </div>
      </div>

      {/* EVENTS GRID */}
      {processedEvents.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#1a1410] border-2 border-dashed border-[#3e2716] text-center space-y-2">
          <Swords className="w-8 h-8 text-stone-500 mx-auto opacity-40" />
          <h3 className="font-fantasy font-bold text-sm text-[#fef08a]">No events found</h3>
          <p className="text-xs text-stone-400">
            No events match the selected status or type filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedEvents.map(evt => {
            const records = attendance.filter(a => a.eventId === evt.id);
            const total = records.length;
            const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
            const voted = records.filter(r => r.voteStatus === 'YES' || r.voteStatus === 'NO').length;
            const didNotJoin = records.filter(
              r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
            ).length;

            const attPct = total > 0 ? (joined / total) * 100 : 0;
            const votePct = total > 0 ? (voted / total) * 100 : 0;

            // Computed status based on date/time (Upcoming vs Completed - No Live)
            const computedStatus = getComputedEventStatus(evt.date);
            const relativeTime = getEventRelativeTime(evt.date);

            // Event type all-time average
            const typeAvg = eventAverages[evt.eventType]?.averageAttendancePercentage ?? null;

            const formattedDate = safeFormatDate(evt.date, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={evt.id}
                className={`rounded-2xl bg-[#1a1410] border-2 transition-all p-4 sm:p-5 shadow-md flex flex-col justify-between hover:shadow-xl ${
                  computedStatus === 'Upcoming'
                    ? 'border-[#ca8a04]/60 hover:border-[#fbbf24] bg-gradient-to-b from-[#21160d] to-[#1a1410]'
                    : 'border-[#3e2716] hover:border-[#6b4224]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-fantasy font-black text-lg text-[#fef08a] truncate">
                          ⚔️ {evt.eventType}
                        </span>
                      </div>
                      <h3 className="text-xs text-stone-200 font-semibold truncate mt-0.5">
                        {evt.eventName}
                      </h3>
                    </div>

                    {/* Auto Tagged Status (Upcoming vs Completed Only) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-fantasy font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 ${
                          computedStatus === 'Upcoming'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                        }`}
                      >
                        {computedStatus === 'Upcoming' ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Upcoming</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Completed</span>
                          </>
                        )}
                      </span>

                      {/* Countdown or relative label */}
                      {relativeTime && (
                        <span className="text-[10px] text-stone-400 font-mono">
                          {relativeTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-3 bg-[#120c08] px-2.5 py-1.5 rounded-xl border border-[#2c1d15]">
                    <Calendar className="w-3.5 h-3.5 text-[#ca8a04] shrink-0" />
                    <span className="font-medium truncate">{formattedDate}</span>
                  </div>

                  {evt.notes && (
                    <p className="text-xs text-stone-400 italic bg-[#120c08] p-2.5 rounded-xl border border-[#3e2716] mb-3 line-clamp-2">
                      &ldquo;{evt.notes}&rdquo;
                    </p>
                  )}

                  {/* Turnout & Vote Progress Bars */}
                  <div className="space-y-2 mb-3 bg-[#120c08] p-3 rounded-xl border border-[#3e2716]">
                    <ProgressBar
                      percentage={attPct}
                      label="Turnout"
                      subLabel={`${joined}/${total}`}
                      color={attPct >= 75 ? 'emerald' : attPct >= 50 ? 'gold' : 'crimson'}
                      size="sm"
                    />
                    <ProgressBar
                      percentage={votePct}
                      label="Voted"
                      subLabel={`${voted}/${total}`}
                      color="blue"
                      size="sm"
                    />
                  </div>

                  {/* All-Time Type Average Comparison */}
                  {typeAvg !== null && (
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-[#140c08] border border-[#2c1d15] text-stone-400 mb-3">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-[#ca8a04]" />
                        <span>{evt.eventType} Turnout Benchmark:</span>
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {typeAvg.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-[#3e2716] flex items-center justify-between gap-2">
                  <div className="text-[11px] text-stone-400 min-w-0">
                    {didNotJoin > 0 ? (
                      <span className="text-amber-400 font-bold truncate block">
                        ⚠️ {didNotJoin} missed after YES
                      </span>
                    ) : (
                      <span className="text-stone-400 text-[10px]">
                        {total} members enrolled
                      </span>
                    )}
                  </div>

                  <GameButton
                    variant={computedStatus === 'Upcoming' ? 'gold' : 'slate'}
                    size="sm"
                    onClick={() => handleOpenAttendance(evt.id)}
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    Attendance
                  </GameButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
