import React from 'react';
import { AllianceEvent } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { ProgressBar } from '../common/ProgressBar';
import { ChevronRight, Calendar, Clock, CheckCircle2, Swords } from 'lucide-react';
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
    <div
      className={`rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between select-none relative overflow-hidden bg-slate-900/75 hover:bg-slate-900 ${
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
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
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

        {/* Attendance Bar */}
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

        {/* Voting & Attendance Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-3">
          <div>
            <span className="text-slate-400 text-[11px] block">Poll Votes:</span>
            <span className="font-mono font-semibold text-slate-200">
              <span className="text-emerald-400">{votedYes} YES</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-rose-400">{votedNo} NO</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Attendance:</span>
            <span className="font-mono font-semibold text-slate-200">
              <span className="text-emerald-400">{joined} Joined</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-rose-400">{didNotJoin} Missed</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">
          {noVote > 0 ? `${noVote} unvoted members` : 'All votes recorded'}
        </span>
        <button
          onClick={handleOpenAttendance}
          className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>War Ledger</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
