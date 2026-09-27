import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { GameCard } from '../common/GameCard';
import { Swords, ChevronRight, Users, CheckCircle2 } from 'lucide-react';
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
    <GameCard
      title="⚔️ Recent War Events"
      subtitle="Chronological event log. Click an event to manage attendance."
      icon={<Swords className="w-5 h-5 text-[#eab308]" />}
      noPadding
    >
      <div className="divide-y divide-[#3b301c]">
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
              className="p-3.5 sm:p-4 hover:bg-[#23293a] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#991b1b]/30 border border-[#ca8a04]/50 flex items-center justify-center text-[#fef08a] font-fantasy font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                  {evt.eventType.split(' ')[0]}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-fantasy font-bold text-sm text-[#fef08a] group-hover:text-amber-300 transition-colors truncate">
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] text-stone-400 font-sans">
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
                  <div className="flex items-center gap-1.5 justify-end font-fantasy font-bold text-xs sm:text-sm text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{joined} / {total} Joined</span>
                  </div>
                  <div className="text-[11px] text-[#ca8a04] font-mono font-bold">
                    {pct}% Attendance
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-[#fef08a] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </GameCard>
  );
};
