import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { ChevronRight, Swords, Clock, CheckCircle2 } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus } from '../../utils/date';

export const RecentEventsList: React.FC = () => {
  const { events, eventSlots, attendance, eventParticipations, members, setSelectedEventIdForAttendance, setActiveTab } = useCRM();

  // Reverse events to show most recent first
  const sorted = [...events].reverse();

  const handleSelectEvent = (eventId: string) => {
    sounds.playClick();
    setSelectedEventIdForAttendance(eventId);
    setActiveTab('attendance');
  };

  const eligibleCount = members.filter(m => m.status !== 'Archived').length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/75 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm text-slate-200">
            Recent &amp; Upcoming Alliance Events
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Click any row to open ledger
        </span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {sorted.slice(0, 6).map(evt => {
          const parts = eventParticipations.filter(p => p.eventId === evt.id);
          let total = eligibleCount;
          let joined = 0;

          if (parts.length > 0) {
            joined = parts.filter(p => p.attendanceStatus === 'ATTENDED').length;
          } else {
            const records = attendance.filter(a => a.eventId === evt.id);
            total = records.length;
            joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
          }

          const pct = total > 0 ? ((joined / total) * 100).toFixed(0) : '0';

          const formattedDate = safeFormatDate(evt.date, {
            month: 'short',
            day: 'numeric',
          });

          const slot2 = eventSlots.find(s => s.eventId === evt.id && s.slotNumber === 2);
          const computedStatus = getComputedEventStatus(evt.date, slot2?.startTime);

          return (
            <div
              key={evt.id}
              onClick={() => handleSelectEvent(evt.id)}
              className="px-4 py-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group select-none active:bg-slate-800/70"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                    {evt.eventType}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                      computedStatus === 'Upcoming'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {computedStatus}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">• {formattedDate}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium truncate mt-0.5">{evt.eventName}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-semibold text-xs text-emerald-400">
                    {joined}/{total} Joined
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono font-medium">
                    {pct}% Turnout
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-center group-hover:border-amber-400/50 transition-all">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
