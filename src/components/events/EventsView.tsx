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
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus, getEventRelativeTime } from '../../utils/date';

interface EventsViewProps {
  onOpenCreateEvent: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onOpenCreateEvent }) => {
  const {
    events,
    attendance,
    setSelectedEventIdForAttendance,
    setActiveTab,
    syncGoogleSheetEvents,
    isSyncing,
  } = useCRM();
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
    <div className="space-y-6 animate-pop-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#f59e0b] to-[#b45309] border-2 border-[#fef08a] flex items-center justify-center text-black shadow-[0_4px_0_#451a03]">
              <Swords className="w-5 h-5 text-black drop-shadow" />
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fffbeb] tracking-wide game-text-shadow">
              War Operations Room
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1b1008] border-2 border-[#ca8a04] text-[#fef08a] font-fantasy font-black shadow-sm">
              {events.length} Wars
            </span>
          </div>
          <p className="text-xs text-stone-300 font-medium mt-1">
            Battle schedules, turnouts, and attendance checkpoints ordered chronologically.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => syncGoogleSheetEvents()}
            disabled={isSyncing}
            className="btn-kingshot-cream px-3.5 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            title="Sync war events from official Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Sheet</span>
          </button>

          {isMainAdmin && (
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>Schedule War</span>
            </button>
          )}
        </div>
      </div>

      {/* ALL-TIME AVERAGE ATTENDANCE STATS CARDS */}
      <div className="kingshot-card p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#facc15]" />
            <h2 className="font-fantasy font-black text-xs sm:text-sm uppercase tracking-wider text-[#fef08a]">
              All-Time War Turnout Benchmarks by Battle Type
            </h2>
          </div>
          <span className="text-[11px] font-fantasy uppercase text-amber-300/80">
            Tap badge to filter
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#382012] border-[#fde047] shadow-[0_4px_0_#78350f] transform -translate-y-1'
                    : 'bg-[#180e08] border-[#381c0c] hover:border-amber-600 shadow-[0_3px_0_#0f0703] active:translate-y-0.5'
                }`}
              >
                <div className="text-[11px] font-fantasy uppercase font-black text-stone-300 truncate">
                  {t === 'BT1' ? 'BT1 (Trap 1)' : t === 'BT2' ? 'BT2 (Trap 2)' : t}
                </div>
                <div
                  className={`text-xl sm:text-2xl font-fantasy font-black mt-1 ${
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
                <div className="text-[10px] text-stone-400 font-medium mt-0.5">
                  {eventCount} {eventCount === 1 ? 'war' : 'wars'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER & SORTING BAR */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#180e08] border-[3px] border-[#4a2610] space-y-3 shadow-[0_5px_0_#0f0703]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#100905] border-2 border-[#381c0c] self-start sm:self-auto overflow-x-auto w-full sm:w-auto shadow-inner">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatusFilter('ALL');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-fantasy font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] text-[#291304] border-2 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>All Battles</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono ml-1">
                {statusCounts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatusFilter('Upcoming');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-fantasy font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'Upcoming'
                  ? 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] text-[#291304] border-2 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>Upcoming</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono ml-1">
                {statusCounts.upcoming}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatusFilter('Completed');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-fantasy font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'Completed'
                  ? 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] text-[#291304] border-2 border-[#fef08a] shadow-[0_3px_0_#78350f]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>Completed</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono ml-1">
                {statusCounts.completed}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#100905] border-2 border-[#381c0c] text-stone-200 text-xs font-fantasy uppercase font-black focus:outline-none focus:border-[#fde047] shadow-inner cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              {coreEventTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'earliest' ? 'latest' : 'earliest')}
              className="btn-kingshot-cream px-3 py-1.5 text-xs font-fantasy font-black uppercase flex items-center gap-1.5 shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'earliest' ? 'Earliest First' : 'Latest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* EVENTS GRID */}
      {processedEvents.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#180e08] border-[3px] border-dashed border-[#4a2610] text-center space-y-3">
          <Swords className="w-10 h-10 text-stone-500 mx-auto opacity-50" />
          <h3 className="font-fantasy font-black text-base text-[#fef08a] uppercase">No War Battles Found</h3>
          <p className="text-xs text-stone-400">
            No events match the selected status or battle type filter.
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

            const computedStatus = getComputedEventStatus(evt.date);
            const relativeTime = getEventRelativeTime(evt.date);

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
                style={{
                  boxShadow: computedStatus === 'Upcoming'
                    ? '0 6px 0 #78350f, 0 12px 24px rgba(0,0,0,0.5)'
                    : '0 6px 0 #140b06, 0 12px 24px rgba(0,0,0,0.5)',
                }}
                className={`rounded-2xl border-[3px] p-4 sm:p-5 transition-all flex flex-col justify-between select-none relative overflow-hidden ${
                  computedStatus === 'Upcoming'
                    ? 'bg-gradient-to-b from-[#2a1a0e] to-[#180f08] border-[#ca8a04]'
                    : 'bg-gradient-to-b from-[#1e130b] to-[#130b06] border-[#4a2610]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="font-fantasy font-black text-lg text-[#fffbeb] game-text-shadow truncate block">
                        ⚔️ {evt.eventType}
                      </span>
                      <h3 className="text-xs text-amber-200/90 font-medium truncate mt-0.5">
                        {evt.eventName}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-fantasy font-black uppercase px-2.5 py-0.5 rounded-full border-2 flex items-center gap-1 shadow-sm ${
                          computedStatus === 'Upcoming'
                            ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-500'
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

                      {relativeTime && (
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          {relativeTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="flex items-center gap-2 text-xs text-stone-200 mb-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-bold truncate">{formattedDate}</span>
                  </div>

                  {evt.notes && (
                    <p className="text-xs text-stone-300 italic bg-black/40 p-2.5 rounded-xl border border-white/5 mb-3 line-clamp-2">
                      &ldquo;{evt.notes}&rdquo;
                    </p>
                  )}

                  {/* Turnout & Vote Progress Bars */}
                  <div className="space-y-2 mb-3 bg-black/40 p-3 rounded-xl border border-white/5">
                    <ProgressBar
                      percentage={attPct}
                      label="War Turnout"
                      subLabel={`${joined}/${total}`}
                      color={attPct >= 75 ? 'emerald' : attPct >= 50 ? 'gold' : 'crimson'}
                      size="sm"
                    />
                    <ProgressBar
                      percentage={votePct}
                      label="Votes Cast"
                      subLabel={`${voted}/${total}`}
                      color="blue"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t-2 border-[#381c0c] flex items-center justify-between gap-2">
                  <div className="text-[11px] text-stone-300 min-w-0">
                    {didNotJoin > 0 ? (
                      <span className="text-red-400 font-bold truncate block">
                        ⚠️ {didNotJoin} missed after YES
                      </span>
                    ) : (
                      <span className="text-stone-400 text-[10px] font-medium">
                        {total} warriors enrolled
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenAttendance(evt.id)}
                    className="btn-kingshot-gold px-3.5 py-1.5 text-xs font-fantasy font-black uppercase flex items-center gap-1 shadow-md"
                  >
                    <span>Ledger</span>
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
