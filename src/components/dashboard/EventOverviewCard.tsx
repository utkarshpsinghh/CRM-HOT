import React from 'react';
import { AllianceEvent } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { ProgressBar } from '../common/ProgressBar';
import { ChevronRight, Clock, CheckCircle2, Layers, Users } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate, getComputedEventStatus, getEventRelativeTime } from '../../utils/date';
import { calculateEventHealthMetrics } from '../../utils/eventCalculations';

interface EventOverviewCardProps {
  event: AllianceEvent;
}

export const EventOverviewCard: React.FC<EventOverviewCardProps> = ({ event }) => {
  const { eventSlots, eventParticipations, members, setSelectedEventIdForAttendance, setActiveTab } = useCRM();

  const eligibleCount = members.filter(m => m.status !== 'Archived').length;
  const metrics = calculateEventHealthMetrics(event.id, eventSlots, eventParticipations, eligibleCount);

  const slotsForEvent = eventSlots.filter(s => s.eventId === event.id);
  const slot1 = slotsForEvent.find(s => s.slotNumber === 1);
  const slot2 = slotsForEvent.find(s => s.slotNumber === 2);

  const slot1Metrics = metrics.slots.find(s => s.slotNumber === 1);
  const slot2Metrics = metrics.slots.find(s => s.slotNumber === 2);

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
        {/* Card Header: Event Type, Status, and Date */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-100 font-fantasy">
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
            <div className="font-semibold text-slate-200">{formattedDate} UTC</div>
            {relativeTime && (
              <div className="text-[10px] text-amber-400 font-medium">{relativeTime}</div>
            )}
          </div>
        </div>

        {/* Turnout Progress Bar */}
        <div className="my-3 space-y-1">
          <ProgressBar
            percentage={metrics.overallParticipationRate}
            label="Turnout Rate"
            subLabel={`${metrics.uniqueAttendees}/${metrics.eligibleMembersCount}`}
            color={
              metrics.overallParticipationRate >= 75
                ? 'emerald'
                : metrics.overallParticipationRate >= 50
                ? 'gold'
                : 'crimson'
            }
          />
        </div>

        {/* 2-Slot Breakdown (Slot 1 & Slot 2 with distinct times & attendance) */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-2.5">
          <div className="border-r border-slate-800/80 pr-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-amber-300 font-fantasy truncate">
                {slot1?.slotName || 'Slot 1'}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                {slot1Metrics?.actualAttendees || 0}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {slot1?.startTime || '16:00 UTC'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Turnout: <span className="text-slate-300 font-semibold">{slot1Metrics?.participationRate || 0}%</span>
            </div>
          </div>

          <div className="pl-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-amber-300 font-fantasy truncate">
                {slot2?.slotName || 'Slot 2'}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                {slot2Metrics?.actualAttendees || 0}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {slot2?.startTime || '02:00 UTC'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Turnout: <span className="text-slate-300 font-semibold">{slot2Metrics?.participationRate || 0}%</span>
            </div>
          </div>
        </div>

        {/* Voting & Non-voter Stats */}
        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-950/40 border border-slate-800/50 mb-3 text-slate-400">
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-400" />
            <span>Poll: <strong className="text-sky-300 font-mono">{metrics.totalVoters}</strong> ({metrics.votingRate}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-purple-400" />
            <span>Non-voters joined: <strong className="text-purple-300 font-mono">{metrics.nonVotersAttendedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">
          {metrics.noVoteCount > 0 ? `${metrics.noVoteCount} unvoted members` : 'All votes recorded'}
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
