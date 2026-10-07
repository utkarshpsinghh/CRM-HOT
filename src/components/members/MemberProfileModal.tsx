import React, { useState, useMemo } from 'react';
import { Member } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { RankBadge } from '../common/RankBadge';
import { ActivityBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ProgressBar } from '../common/ProgressBar';
import { calculateMemberEventStats } from '../../utils/eventCalculations';
import {
  Shield,
  Flame,
  Swords,
  Edit3,
  Copy,
  Check,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDateTime } from '../../utils/date';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onOpenAddStrike: (member: Member) => void;
  onOpenEditMember: (member: Member) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  onOpenAddStrike,
  onOpenEditMember,
}) => {
  const { events, eventSlots, eventParticipations, strikes, removeStrike, addCommunication } = useCRM();

  const [activeTab, setActiveTab] = useState<'events' | 'strikes' | 'notes'>('events');
  const [commNoteInput, setCommNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState(false);

  React.useEffect(() => {
    if (member) {
      setCommNoteInput(member.communicationNote || '');
    }
  }, [member]);

  const memberStrikes = useMemo(() => {
    if (!member) return [];
    return strikes.filter(s => s.memberId === member.id);
  }, [strikes, member]);

  // Requirement 16: Member Profile Event Stats per event type
  const eventStats = useMemo(() => {
    if (!member) return {};
    return calculateMemberEventStats(member.id, events, eventSlots, eventParticipations);
  }, [member, events, eventSlots, eventParticipations]);

  // Overall member participations list
  const memberParticipationsList = useMemo(() => {
    if (!member) return [];
    const eventMap = new Map(events.map(e => [e.id, e]));
    const slotMap = new Map(eventSlots.map(s => [s.id, s]));

    return eventParticipations
      .filter(p => p.memberId === member.id)
      .map(p => {
        const evt = eventMap.get(p.eventId);
        const votedSlot = p.selectedSlotId ? slotMap.get(p.selectedSlotId) : null;
        const attendedSlot = p.attendanceSlotId ? slotMap.get(p.attendanceSlotId) : null;
        return {
          participation: p,
          event: evt,
          votedSlot,
          attendedSlot,
        };
      })
      .filter(item => Boolean(item.event))
      .sort((a, b) => new Date(b.event!.date).getTime() - new Date(a.event!.date).getTime());
  }, [member, events, eventSlots, eventParticipations]);

  // Overall attendance, vote, and reliability rates across completed parent events
  const overallStats = useMemo(() => {
    const totalEvents = events.length;
    const attendedCount = memberParticipationsList.filter(item => item.participation.attendanceStatus === 'ATTENDED').length;
    const votedCount = memberParticipationsList.filter(item => item.participation.voteStatus === 'VOTED').length;
    const attendedWhenVoted = memberParticipationsList.filter(item => item.participation.voteStatus === 'VOTED' && item.participation.attendanceStatus === 'ATTENDED').length;

    const rate = totalEvents > 0 ? (attendedCount / totalEvents) * 100 : 0;
    const voteRate = totalEvents > 0 ? (votedCount / totalEvents) * 100 : 0;
    const reliabilityRate = votedCount > 0 ? (attendedWhenVoted / votedCount) * 100 : 100;

    return { totalEvents, attendedCount, rate, votedCount, voteRate, reliabilityRate };
  }, [events, memberParticipationsList]);

  if (!member) return null;

  const handleCopyGameId = () => {
    if (!member.gameId) return;
    navigator.clipboard.writeText(member.gameId);
    sounds.playClick();
    setCopiedGameId(true);
    setTimeout(() => setCopiedGameId(false), 2000);
  };

  const handleSaveNotes = async () => {
    if (!member) return;
    setIsSavingNote(true);
    await addCommunication(member.id, member.communication, commNoteInput);
    setIsSavingNote(false);
  };

  const handlePardonStrike = async (strikeId: string) => {
    sounds.playClick();
    await removeStrike(strikeId, member.id);
  };

  const mainTypes = ['Bear Trap', 'Swordsland', 'Tri Alliance'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member.name}
      subtitle="Member Profile"
      icon={<Shield className="w-5 h-5 text-amber-400" />}
      maxWidth="lg"
    >
      <div className="space-y-4 text-slate-200">
        {/* Header Summary */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-xl text-slate-100 font-fantasy">{member.name}</span>
              <RankBadge rank={member.currentRank} size="sm" />
              <ActivityBadge status={member.status} size="sm" />
              {member.gameId && (
                <button
                  type="button"
                  onClick={handleCopyGameId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-amber-300 font-mono text-xs cursor-pointer shadow-sm transition-colors"
                  title="Click to copy Game ID"
                >
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Game ID:</span>
                  <span className="font-bold">{member.gameId}</span>
                  {copiedGameId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-amber-300" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <StrikeBadge count={member.strikes} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onOpenEditMember(member);
              }}
              className="flex-1 sm:flex-initial justify-center btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenAddStrike(member);
              }}
              className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Add Strike</span>
            </button>
          </div>
        </div>

        {/* Clean Attendance, Vote, and Reliability Stats Bar */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Turnout Attendance:</span>
              <span className="font-mono font-bold text-sm text-amber-400">
                {overallStats.rate.toFixed(0)}%
                <span className="text-xs text-slate-400 font-normal ml-1">({overallStats.attendedCount}/{overallStats.totalEvents})</span>
              </span>
            </div>

            <div className="sm:border-l sm:border-slate-800 sm:pl-3">
              <span className="text-[11px] text-slate-400 block font-medium">Poll Voting Rate:</span>
              <span className="font-mono font-bold text-sm text-purple-300">
                {overallStats.voteRate.toFixed(0)}%
                <span className="text-xs text-slate-400 font-normal ml-1">({overallStats.votedCount}/{overallStats.totalEvents})</span>
              </span>
            </div>

            <div className="sm:border-l sm:border-slate-800 sm:pl-3">
              <span className="text-[11px] text-slate-400 block font-medium">Vote Reliability:</span>
              <span className={`font-mono font-bold text-sm ${overallStats.reliabilityRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallStats.votedCount > 0 ? `${overallStats.reliabilityRate.toFixed(0)}%` : '—'}
                <span className="text-xs text-slate-400 font-normal ml-1">
                  {overallStats.votedCount > 0 ? `(${overallStats.attendedCount > 0 ? Math.min(overallStats.attendedCount, overallStats.votedCount) : 0}/${overallStats.votedCount} followed)` : '(no votes)'}
                </span>
              </span>
            </div>
          </div>
          <ProgressBar
            percentage={overallStats.rate}
            color={overallStats.rate >= 75 ? 'emerald' : overallStats.rate >= 50 ? 'gold' : 'crimson'}
            size="sm"
            showPercentage={false}
          />
        </div>

        {/* 3 Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'events'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Event History ({events.length})
          </button>

          <button
            onClick={() => setActiveTab('strikes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'strikes'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Strikes ({memberStrikes.length})
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'notes'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Tab 1: Events */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Requirement 16: Breakdown for Bear Trap, Swordsland, Tri Alliance */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-fantasy flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>War Discipline by Event Type</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {mainTypes.map(eType => {
                  const s = eventStats[eType] || {
                    eventType: eType,
                    eventsParticipated: 0,
                    slot1Attendance: 0,
                    slot2Attendance: 0,
                    totalAttendance: 0,
                    totalVotes: 0,
                    voteFulfillmentCount: 0,
                    voteFulfillmentRate: 0,
                    penaltiesCount: 0,
                  };

                  const totalCyclesOfType = events.filter(e => e.eventType === eType).length;
                  const attRate = totalCyclesOfType > 0 ? Math.round((s.eventsParticipated / totalCyclesOfType) * 100) : 0;

                  const slot1Name = eType === 'Bear Trap' ? 'BT1' : `${eType} 1`;
                  const slot2Name = eType === 'Bear Trap' ? 'BT2' : `${eType} 2`;

                  return (
                    <div
                      key={eType}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-300 font-fantasy">{eType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.eventsParticipated}/{totalCyclesOfType} ({attRate}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] p-2 rounded bg-slate-900/60 border border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block text-[10px]">{slot1Name}:</span>
                          <span className="font-mono font-bold text-slate-200">{s.slot1Attendance} times</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{slot2Name}:</span>
                          <span className="font-mono font-bold text-slate-200">{s.slot2Attendance} times</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Vote Fulfillment:</span>
                        <span className="font-mono font-bold text-purple-300">
                          {s.voteFulfillmentRate}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Penalties Issued:</span>
                        <span className={`font-mono font-bold ${s.penaltiesCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {s.penaltiesCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Event Ledger */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-fantasy">
                Event Participation History
              </div>

              <div className="rounded-xl bg-slate-900/80 border border-slate-800 max-h-56 overflow-y-auto divide-y divide-slate-800">
                {memberParticipationsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No participation records found for this member.
                  </div>
                ) : (
                  memberParticipationsList.map(({ participation, event, votedSlot, attendedSlot }) => (
                    <div
                      key={participation.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-800/30 transition-colors gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 font-fantasy">{event?.eventType}</span>
                          {event?.date && (
                            <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <Calendar className="w-2.5 h-2.5 text-amber-400" />
                              <span>{safeFormatDateTime(event.date)}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{event?.eventName}</div>
                        {participation.penaltyNote && (
                          <div className="text-[10px] text-rose-300 italic mt-0.5">
                            Note: {participation.penaltyNote}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-right">
                        {/* Voted Slot */}
                        <div className="text-[10px]">
                          <span className="text-slate-500 block">Voted:</span>
                          <span className="font-mono font-semibold text-sky-300">
                            {votedSlot ? votedSlot.slotName : 'No Vote'}
                          </span>
                        </div>

                        {/* Attended Slot */}
                        <div className="text-[10px]">
                          <span className="text-slate-500 block">Attended:</span>
                          {participation.attendanceStatus === 'ATTENDED' && attendedSlot ? (
                            <span className="font-mono font-bold text-emerald-400">
                              {attendedSlot.slotName}
                            </span>
                          ) : participation.attendanceStatus === 'ABSENT' ? (
                            <span className="font-mono font-bold text-rose-400">Absent</span>
                          ) : (
                            <span className="text-slate-500 italic">Not Marked</span>
                          )}
                        </div>

                        {/* Penalty */}
                        {participation.penaltyStatus === 'ISSUED' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500 text-slate-950">
                            Penalty
                          </span>
                        )}
                        {participation.penaltyStatus === 'WAIVED' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Waived
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Strikes */}
        {activeTab === 'strikes' && (
          <div className="space-y-3">
            {memberStrikes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                No strikes recorded for this player.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {memberStrikes.map(s => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-rose-300">{s.reason}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{s.date} • by {s.addedBy}</div>
                    </div>
                    <button
                      onClick={() => handlePardonStrike(s.id)}
                      className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <textarea
              value={commNoteInput}
              onChange={e => setCommNoteInput(e.target.value)}
              rows={4}
              placeholder="Add notes about this player (e.g. availability, preferred rally role, Discord handle)..."
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNote}
                className="btn-primary px-3.5 py-1.5 text-xs font-semibold cursor-pointer shadow-sm"
              >
                {isSavingNote ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
