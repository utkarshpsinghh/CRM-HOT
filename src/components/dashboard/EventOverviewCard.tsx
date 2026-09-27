import React from 'react';
import { AllianceEvent } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { ProgressBar } from '../common/ProgressBar';
import { Swords, Check, X, Minus, ChevronRight, Calendar } from 'lucide-react';
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
  const votePct = total > 0 ? (totalVoted / total) * 100 : 0;

  const handleOpenAttendance = () => {
    sounds.playClick();
    setSelectedEventIdForAttendance(event.id);
    setActiveTab('attendance');
  };

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-xl bg-gradient-to-b from-[#2e1507] to-[#1c0c04] border-2 border-[#572b0f] hover:border-[#ca8a04] p-4 transition-all duration-200 shadow-md group relative">
      {/* Event Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-kingshot text-lg text-[#fffbeb] tracking-wide truncate">
              ⚔️ {event.eventType}
            </span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#52290d] text-[#fde68a] border border-[#ca8a04]/60 shrink-0">
              {event.status}
            </span>
          </div>
          <p className="text-xs text-stone-300 truncate mt-0.5">{event.eventName}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-1">
            <Calendar className="w-3 h-3 text-[#fbbf24]" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <button
          onClick={handleOpenAttendance}
          className="btn-kingshot-gold px-2.5 py-1 text-xs font-black uppercase flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>Roster</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-3 bg-[#140802] p-2.5 rounded-lg border border-[#451f08]">
        <ProgressBar
          percentage={attendancePct}
          label="Attendance Rate"
          subLabel={`${joined}/${total}`}
          color={attendancePct >= 75 ? 'emerald' : attendancePct >= 50 ? 'gold' : 'crimson'}
          size="sm"
        />
        <ProgressBar
          percentage={votePct}
          label="Vote Turnout"
          subLabel={`${totalVoted}/${total}`}
          color="blue"
          size="sm"
        />
      </div>

      {/* Numerical Breakdown Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
        <div className="p-2 rounded bg-[#0e1d38] border border-[#1d4ed8]/50">
          <div className="text-[10px] text-blue-300 font-bold uppercase">Voted</div>
          <div className="font-kingshot text-sm text-blue-100 mt-0.5">{totalVoted}</div>
        </div>

        <div className="p-2 rounded bg-[#0a2717] border border-[#15803d]/50">
          <div className="text-[10px] text-emerald-300 font-bold uppercase flex items-center justify-center gap-1">
            <Check className="w-2.5 h-2.5" />
            <span>Joined</span>
          </div>
          <div className="font-kingshot text-sm text-emerald-200 mt-0.5">{joined}</div>
        </div>

        <div className="p-2 rounded bg-[#2b0e0e] border border-[#b91c1c]/50">
          <div className="text-[10px] text-red-300 font-bold uppercase flex items-center justify-center gap-1">
            <X className="w-2.5 h-2.5" />
            <span>Flaked</span>
          </div>
          <div className="font-kingshot text-sm text-red-200 mt-0.5">{didNotJoin}</div>
        </div>

        <div className="p-2 rounded bg-[#170a03] border border-[#4d2309]">
          <div className="text-[10px] text-stone-400 font-bold uppercase flex items-center justify-center gap-1">
            <Minus className="w-2.5 h-2.5" />
            <span>No Vote</span>
          </div>
          <div className="font-kingshot text-sm text-stone-300 mt-0.5">{noVote}</div>
        </div>
      </div>
    </div>
  );
};
