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
      style={{
        boxShadow: computedStatus === 'Upcoming'
          ? '0 6px 0 #78350f, 0 10px 20px rgba(0,0,0,0.45)'
          : '0 6px 0 #180d07, 0 10px 20px rgba(0,0,0,0.45)',
      }}
      className={`rounded-2xl border-[3px] p-4 transition-all flex flex-col justify-between select-none relative overflow-hidden ${
        computedStatus === 'Upcoming'
          ? 'bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] border-[#ca8a04]'
          : 'bg-gradient-to-b from-[#20150d] to-[#140d07] border-[#4d2812]'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-fantasy font-black text-lg text-[#fffbeb] game-text-shadow">
                {event.eventType}
              </span>
              <span
                className={`text-[9px] uppercase font-fantasy font-black px-2 py-0.5 rounded-full border-2 flex items-center gap-1 shadow-sm ${
                  computedStatus === 'Upcoming'
                    ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-500'
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
            <p className="text-xs text-stone-300 font-medium truncate mt-0.5">{event.eventName}</p>
          </div>

          <div className="text-right text-xs text-stone-300 font-mono">
            <div className="font-bold">{formattedDate}</div>
            {relativeTime && (
              <div className="text-[10px] text-amber-400 font-bold">{relativeTime}</div>
            )}
          </div>
        </div>

        {/* Attendance Bar */}
        <div className="my-3 space-y-1">
          <ProgressBar
            percentage={attendancePct}
            label="War Attendance"
            subLabel={`${joined}/${total}`}
            color={attendancePct >= 75 ? 'emerald' : attendancePct >= 50 ? 'gold' : 'crimson'}
            size="md"
          />
        </div>

        {/* Voting breakdown badge capsule */}
        <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono flex items-center justify-between text-stone-300">
          <span className="text-stone-400">Votes:</span>
          <span>
            <strong className="text-emerald-400">{votedYes} YES</strong> / <strong className="text-red-400">{votedNo} NO</strong> / <strong className="text-stone-500">{noVote} Idle</strong>
          </span>
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-[#3b1f0d]">
        <button
          onClick={handleOpenAttendance}
          className="w-full btn-kingshot-gold py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
        >
          <Swords className="w-3.5 h-3.5 text-black" />
          <span>Open War Ledger</span>
        </button>
      </div>
    </div>
  );
};
