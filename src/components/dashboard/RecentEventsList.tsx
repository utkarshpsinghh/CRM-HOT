import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Swords, ChevronRight, CheckCircle2 } from 'lucide-react';
import { sounds } from '../../utils/sound';

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
    <div className="rounded-xl bg-gradient-to-b from-[#2e1507] to-[#1c0c04] border-2 border-[#572b0f] shadow-lg overflow-hidden">
      <div className="px-5 py-3.5 bg-[#1f0d03] border-b-2 border-[#52290d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-[#fbbf24]" />
          <h3 className="font-kingshot text-base sm:text-lg text-[#fffbeb]">
            ⚔️ Recent War Events Log
          </h3>
        </div>
        <span className="text-xs text-stone-400 font-sans">
          Click event to inspect roster
        </span>
      </div>

      <div className="divide-y divide-[#3d1d0a]">
        {sorted.map(evt => {
          const records = attendance.filter(a => a.eventId === evt.id);
          const total = records.length;
          const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
          const pct = total > 0 ? ((joined / total) * 100).toFixed(1) : '0';

          const formattedDate = new Date(evt.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={evt.id}
              onClick={() => handleSelectEvent(evt.id)}
              className="p-3.5 sm:p-4 hover:bg-[#381a09]/90 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#57290d] border border-[#fbbf24]/50 flex items-center justify-center text-[#fef08a] font-kingshot text-xs shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                  {evt.eventType.split(' ')[0]}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#fffbeb] group-hover:text-[#fbbf24] transition-colors truncate">
                      {evt.eventType}
                    </span>
                    <span className="text-[11px] text-stone-400 font-sans">
                      • {formattedDate}
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 truncate">
                    {evt.eventName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end font-bold text-xs sm:text-sm text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{joined} / {total} Joined</span>
                  </div>
                  <div className="text-[11px] text-[#fbbf24] font-mono font-bold">
                    {pct}% Turnout
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-[#fef08a] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
