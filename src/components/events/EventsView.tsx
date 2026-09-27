import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { GameButton } from '../common/GameButton';
import { ProgressBar } from '../common/ProgressBar';
import { calculateAllEventAverages } from '../../utils/participation';
import { Swords, PlusCircle, Calendar, ChevronRight, Filter, TrendingUp, BarChart3 } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate } from '../../utils/date';

interface EventsViewProps {
  onOpenCreateEvent: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onOpenCreateEvent }) => {
  const { events, attendance, setSelectedEventIdForAttendance, setActiveTab } = useCRM();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');

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

  const filteredEvents = events.filter(e => {
    if (typeFilter !== 'ALL' && e.eventType !== typeFilter) return false;
    return true;
  });

  const handleOpenAttendance = (eventId: string) => {
    sounds.playClick();
    setSelectedEventIdForAttendance(eventId);
    setActiveTab('attendance');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-[#ca8a04]" />
            <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
              Alliance Events
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#3e2716] border border-[#ca8a04]/40 text-[#fef3c7] font-bold font-mono">
              {events.length}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Battle schedules, attendance records, and all-time event turnout rates.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateEvent}
          className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Event</span>
        </button>
      </div>

      {/* ALL-TIME AVERAGE ATTENDANCE BY EVENT TYPE (Requirement 3) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#ca8a04]" />
            <h2 className="font-fantasy font-bold text-xs sm:text-sm uppercase tracking-wider text-[#fef08a]">
              All-Time Average Attendance by Event Type
            </h2>
          </div>
          <span className="text-[11px] text-stone-400">
            Click any event to filter
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

      {/* Filter Tabs */}
      <div className="p-3 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] flex items-center gap-2 overflow-x-auto">
        <Filter className="w-4 h-4 text-stone-400 shrink-0 ml-1" />
        <span className="text-xs font-fantasy font-bold uppercase text-[#ca8a04] shrink-0">
          Filter:
        </span>
        {['ALL', ...coreEventTypes].map(t => (
          <button
            key={t}
            onClick={() => {
              sounds.playClick();
              setTypeFilter(t);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-fantasy font-bold tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === t
                ? 'bg-[#ca8a04] text-[#1e1503] shadow-md font-black'
                : 'bg-[#120c08] text-stone-300 hover:text-[#fef08a] border border-[#3e2716]'
            }`}
          >
            {t === 'BT1' ? 'BT1 (Bear Trap 1)' : t === 'BT2' ? 'BT2 (Bear Trap 2)' : t}
          </button>
        ))}
      </div>

      {/* Event Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map(evt => {
          const records = attendance.filter(a => a.eventId === evt.id);
          const total = records.length;
          const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
          const voted = records.filter(r => r.voteStatus === 'YES' || r.voteStatus === 'NO').length;
          const didNotJoin = records.filter(
            r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
          ).length;

          const attPct = total > 0 ? (joined / total) * 100 : 0;
          const votePct = total > 0 ? (voted / total) * 100 : 0;

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
              className="rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] hover:border-[#ca8a04] p-4 sm:p-5 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="font-fantasy font-black text-lg text-[#fef08a] block truncate">
                      ⚔️ {evt.eventType}
                    </span>
                    <h3 className="text-xs text-stone-200 font-semibold truncate mt-0.5">
                      {evt.eventName}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-fantasy font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                      evt.status === 'Completed'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                        : evt.status === 'Live'
                        ? 'bg-red-950/70 text-red-200 border-red-500 animate-pulse'
                        : 'bg-blue-950/70 text-blue-300 border-blue-700'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
                  <span>{formattedDate}</span>
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

                {/* All-Time Type Average Indicator */}
                {typeAvg !== null && (
                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-[#140c08] border border-[#2c1d15] text-stone-400 mb-3">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#ca8a04]" />
                      <span>{evt.eventType} All-Time Avg:</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {typeAvg.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-[#3e2716] flex items-center justify-between">
                <div className="text-[11px] text-stone-400">
                  {didNotJoin > 0 && (
                    <span className="text-amber-400 font-bold">
                      ⚠️ {didNotJoin} missed after YES
                    </span>
                  )}
                </div>

                <GameButton
                  variant="gold"
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
    </div>
  );
};
