import React from 'react';
import { AllianceEvent } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { ProgressBar } from '../common/ProgressBar';
import { ChevronRight, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus, getEventRelativeTime } from '../../utils/date';

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
  const computedStatus = getComputedEventStatus(event.date);
  const relativeTime = getEventRelativeTime(event.date);

  const handleOpenAttendance = () => {
    sounds.playClick();
    setSelectedEventIdForAttendance(event.id);
    setActiveTab('attendance');
  };

  const formattedDate = safeFormatDate(event.date, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`rounded-xl border p-4 transition-all shadow-sm flex flex-col justify-between ${
      computedStatus === 'Upcoming'
        ? 'bg-[#22160e] border-[#b45309]/70 hover:border-[#f59e0b]'
        : 'bg-[#20150f] border-[#4d2b14] hover:border-[#b45309]'
    }`}>
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#fffbeb]">
                {event.eventType}
              </span>
              <span
                className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  computedStatus === 'Upcoming'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
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
            <p className="text-xs text-stone-300 truncate mt-0.5">{event.eventName}</p>
          </div>

          <div className="text-right text-xs text-stone-400 font-mono">
            <div>{formattedDate}</div>
            {relativeTime && (
              <div className="text-[10px] text-amber-300/80">{relativeTime}</div>
            )}
          </div>
        </div>

        {/* Attendance Bar */}
        <div className="my-3 space-y-1">
          <ProgressBar
            percentage={attendancePct}
            label="Attendance"
            subLabel={`${joined}/${total}`}
            color={attendancePct >= 75 ? 'emerald' : attendancePct >= 50 ? 'gold' : 'crimson'}
            size="sm"
          />
        </div>

        {/* Summary */}
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
