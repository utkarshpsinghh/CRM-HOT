import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { ChevronRight, Swords, Clock, CheckCircle2 } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus } from '../../utils/date';

export const RecentEventsList: React.FC = () => {
  const { events, attendance, setSelectedEventIdForAttendance, setActiveTab } = useCRM();

  // Reverse events to show most recent first
  const sorted = [...events].reverse();

  const handleSelectEvent = (eventId: string) => {
    sounds.playClick();
    setSelectedEventIdForAttendance(eventId);
    setActiveTab('attendance');
  };

  return (
    <div className="kingshot-card shadow-lg overflow-hidden">
      <div className="kingshot-card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <h3 className="font-fantasy font-black text-sm sm:text-base text-[#fef08a] uppercase tracking-wide">
            Recent &amp; Upcoming Battle Events
          </h3>
        </div>
        <span className="text-[11px] font-fantasy font-black uppercase text-amber-300/80 tracking-wider">
          Tap row to enter ledger
        </span>
      </div>

      <div className="divide-y-2 divide-[#381c0c]">
        {sorted.slice(0, 6).map(evt => {
          const records = attendance.filter(a => a.eventId === evt.id);
          const total = records.length;
          const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
          const pct = total > 0 ? ((joined / total) * 100).toFixed(0) : '0';

          const formattedDate = safeFormatDate(evt.date, {
            month: 'short',
            day: 'numeric',
          });

          const computedStatus = getComputedEventStatus(evt.date);

          return (
            <div
              key={evt.id}
              onClick={() => handleSelectEvent(evt.id)}
              className="px-4 py-3 hover:bg-[#2c1a0e] transition-colors flex items-center justify-between gap-3 cursor-pointer group select-none active:bg-[#382012]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-fantasy font-black text-sm sm:text-base text-[#fffbeb] group-hover:text-[#fde047] transition-colors truncate">
                    {evt.eventType}
                  </span>
                  <span
                    className={`text-[9px] font-fantasy font-black uppercase px-2 py-0.5 rounded-full border-2 ${
                      computedStatus === 'Upcoming'
                        ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    }`}
                  >
                    {computedStatus}
                  </span>
                  <span className="text-xs text-stone-400 font-mono font-bold">• {formattedDate}</span>
                </div>
                <div className="text-xs text-stone-300 font-medium truncate mt-0.5">{evt.eventName}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-fantasy font-black text-xs text-emerald-300">
                    {joined}/{total} Joined
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono font-black">
                    {pct}% Turnout
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#27150c] border border-[#52290d] flex items-center justify-center group-hover:border-amber-400 group-hover:bg-[#3d1f0e] transition-all">
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
