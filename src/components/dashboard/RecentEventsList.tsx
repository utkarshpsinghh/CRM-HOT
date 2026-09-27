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
    <div className="rounded-xl bg-[#20150f] border border-[#4d2b14] shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-[#19100a] border-b border-[#3d200e] flex items-center justify-between">
        <h3 className="font-bold text-sm text-[#fffbeb]">
          Recent Events
        </h3>
        <span className="text-xs text-stone-400">Click to view roster</span>
      </div>

      <div className="divide-y divide-[#2e170b]">
        {sorted.map(evt => {
          const records = attendance.filter(a => a.eventId === evt.id);
          const total = records.length;
          const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
          const pct = total > 0 ? ((joined / total) * 100).toFixed(0) : '0';

          const formattedDate = new Date(evt.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={evt.id}
              onClick={() => handleSelectEvent(evt.id)}
              className="px-4 py-3 hover:bg-[#271a13] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#fffbeb] group-hover:text-[#fbbf24] transition-colors truncate">
                    {evt.eventType}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">• {formattedDate}</span>
                </div>
                <div className="text-xs text-stone-300 truncate">{evt.eventName}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-semibold text-xs text-emerald-300">
                    {joined}/{total} Joined
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono font-bold">
                    {pct}% Turnout
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-white" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
