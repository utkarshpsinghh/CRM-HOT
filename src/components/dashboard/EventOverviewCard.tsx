import React from 'react';
import { AllianceEvent } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { ProgressBar } from '../common/ProgressBar';
import { ChevronRight, Calendar } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface EventOverviewCardProps {
  event: AllianceEvent;
}

export const EventOverviewCard: React.FC<EventOverviewCardProps> = ({ event }) => {
  const { attendance, setSelectedEventIdForAttendance, setActiveTab } = useCRM();

  const eventRecords = attendance.filter(a => a.eventId === event.id);
  const total = eventRecords.length;

  const votedYes = eventRecords.filter(r => r.voteStatus === 'YES').length;
  const votedNo = eventRecords.filter(r => r.voteStatus === 'NO').length;
  const totalVoted = votedYes + votedNo;
  const noVote = eventRecords.filter(r => r.voteStatus === 'NO RESPONSE').length;

  const joined = eventRecords.filter(r => r.attendanceStatus === 'JOINED').length;
  const didNotJoin = eventRecords.filter(r => r.attendanceStatus === 'DIDNT_JOIN').length;

  const attendancePct = total > 0 ? (joined / total) * 100 : 0;

  const handleOpenAttendance = () => {
    sounds.playClick();
    setSelectedEventIdForAttendance(event.id);
    setActiveTab('attendance');
  };

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl bg-[#20150f] border border-[#4d2b14] hover:border-[#b45309] p-4 transition-all shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#fffbeb]">
                {event.eventType}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#331c0d] text-amber-300">
                {event.status}
              </span>
            </div>
            <p className="text-xs text-stone-300 truncate mt-0.5">{event.eventName}</p>
          </div>

          <div className="text-right text-xs text-stone-400 font-mono">
            {formattedDate}
          </div>
        </div>

        {/* Clean Attendance Bar */}
        <div className="my-3 space-y-1">
          <ProgressBar
            percentage={attendancePct}
            label="Attendance"
            subLabel={`${joined}/${total}`}
            color={attendancePct >= 75 ? 'emerald' : attendancePct >= 50 ? 'gold' : 'crimson'}
            size="sm"
          />
        </div>

        {/* Simple Summary */}
        <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1">
          <span>{totalVoted} Voted</span>
          <span>{didNotJoin} Missed</span>
          <span>{noVote} No Vote</span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#381e0e] flex justify-end">
        <button
          onClick={handleOpenAttendance}
          className="text-xs font-semibold text-[#fbbf24] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View Attendance</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
