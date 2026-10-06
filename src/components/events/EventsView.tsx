import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { ProgressBar } from '../common/ProgressBar';
import { calculateAllEventAverages } from '../../utils/participation';
import {
  Swords,
  Plus,
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
    members,
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight">
              War Operations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Track alliance battle turnout benchmarks and upcoming operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Direct Google Sheets Sync */}
          {isMainAdmin && (
            <button
              type="button"
              onClick={async () => {
                sounds.playClick();
                await syncGoogleSheetEvents();
              }}
              disabled={isSyncing}
              className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Sync war events from official Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Wars Sheet'}</span>
            </button>
          )}

          {isMainAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenCreateEvent();
              }}
              className="btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule War</span>
            </button>
          )}
        </div>
      </div>

      {/* Benchmark Turnout Rates Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Historical Turnout Benchmarks
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {coreEventTypes.map(eType => {
            const stats = eventAverages[eType] || { totalEvents: 0, averageAttendancePercentage: 0 };
            const isFilterActive = typeFilter === eType;

            return (
              <div
                key={eType}
                onClick={() => {
                  sounds.playClick();
                  setTypeFilter(prev => (prev === eType ? 'ALL' : eType));
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isFilterActive
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {eType}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {stats.totalEvents} recorded
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div className={`text-xl font-bold font-mono ${
                    stats.averageAttendancePercentage >= 75
                      ? 'text-emerald-400'
                      : stats.averageAttendancePercentage >= 50
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}>
                    {stats.totalEvents > 0 ? `${stats.averageAttendancePercentage.toFixed(0)}%` : '—'}
                  </div>
                  {stats.totalEvents > 0 && (
                    <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800/80 overflow-x-auto scrollbar-none">
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type dropdown */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            {coreEventTypes.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Sort button */}
          <button
            onClick={() => {
              sounds.playClick();
              setSortOrder(prev => (prev === 'earliest' ? 'latest' : 'earliest'));
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'earliest' ? 'Earliest First' : 'Latest First'}</span>
          </button>
        </div>
      </div>

      {/* War Events Grid */}
      {processedEvents.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-slate-200">
            No War Events Found
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {events.length === 0
              ? 'No alliance war events have been scheduled yet.'
              : 'No war events match your current filter selection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedEvents.map(event => {
            const EVENT_ID_ALIASES: Record<string, string> = {
              'evt-1790607589476-kins': 'evt-c233df90',
              'evt-1791048690819-7icl': 'evt-6f6a9d3a',
              'evt-1791048703740-v7b9': 'evt-61922e28',
              'evt-1791049152771-k1qw': 'evt-c031d684',
              'evt-1791049171203-10e5': 'evt-f9234e34',
              'evt-1791223308841-6mkk': 'evt-4eee1101',
            };
            const records = attendance.filter(a => a.eventId === event.id || EVENT_ID_ALIASES[a.eventId] === event.id);
            const total = records.length > 0 ? records.length : (members.length || 94);
            const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
            const missed = records.filter(r => r.attendanceStatus === 'DIDNT_JOIN').length;
            const votedYes = records.filter(r => r.voteStatus === 'YES').length;
            const votedNo = records.filter(r => r.voteStatus === 'NO').length;
            const attendancePct = total > 0 ? (joined / total) * 100 : 0;
            const computedStatus = getComputedEventStatus(event.date);
            const relativeTime = getEventRelativeTime(event.date);

            const formattedDate = safeFormatDate(event.date, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

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
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-100">
                          {event.eventType}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${
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

                    <div className="text-right text-xs text-slate-400 font-mono">
                      <div className="font-semibold text-slate-200">{formattedDate}</div>
                      {relativeTime && (
                        <div className="text-[10px] text-amber-400 font-medium">{relativeTime}</div>
                      )}
                    </div>
                  </div>

                  {/* Turnout Progress Bar */}
                  <div className="my-3 space-y-1">
                    <ProgressBar
                      percentage={attendancePct}
                      label="Turnout Rate"
                      subLabel={`${joined}/${total}`}
                      color={
                        attendancePct >= 75 ? 'emerald' : attendancePct >= 50 ? 'gold' : 'crimson'
                      }
                    />
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-3">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Committed Votes:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        <span className="text-emerald-400">{votedYes} YES</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-rose-400">{votedNo} NO</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Turnout Count:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        <span className="text-emerald-400">{joined} Joined</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-rose-400">{missed} Missed</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {total} members registered
                  </span>
                  <button
                    onClick={() => handleOpenAttendance(event.id)}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>War Ledger</span>
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
