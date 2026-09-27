import React, { useState } from 'react';
import { Member, CommunicationStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { RankBadge } from '../common/RankBadge';
import { CommunicationBadge, ActivityBadge, VoteBadge, AttendanceBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ProgressBar } from '../common/ProgressBar';
import { calculateMemberParticipation } from '../../utils/participation';
import {
  Shield,
  Flame,
  MessageSquare,
  Swords,
  Clock,
  CheckCircle,
  PlusCircle,
  Edit3,
  TrendingUp,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

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
  const { events, attendance, strikes, removeStrike, addCommunication, inactiveInsights } = useCRM();

  const [activeTab, setActiveTab] = useState<'events' | 'participation' | 'strikes' | 'comms'>('events');
  const [commNoteInput, setCommNoteInput] = useState('');
  const [commStatusInput, setCommStatusInput] = useState<CommunicationStatus>('Good');
  const [isSavingComm, setIsSavingComm] = useState(false);

  // Sync state when member changes
  React.useEffect(() => {
    if (member) {
      setCommNoteInput(member.communicationNote || '');
      setCommStatusInput(member.communication);
    }
  }, [member]);

  if (!member) return null;

  // Member's participation stats across events
  const partStats = calculateMemberParticipation(member.id, events, attendance);
  const memberStrikes = strikes.filter(s => s.memberId === member.id);
  const insight = inactiveInsights.find(i => i.member.id === member.id);

  const handleSaveComms = async () => {
    if (!member) return;
    setIsSavingComm(true);
    await addCommunication(member.id, commStatusInput, commNoteInput);
    setIsSavingComm(false);
  };

  const handlePardonStrike = async (strikeId: string) => {
    sounds.playClick();
    await removeStrike(strikeId, member.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>⚔️ Member Dossier:</span>
          <span className="text-[#fef08a] font-black">{member.name}</span>
        </div>
      }
      subtitle={`Alliance Serial ID: ${member.id}`}
      icon={<Shield className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-stone-200">
        {/* Top Header Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#2e1507] via-[#241005] to-[#1c0c04] border-2 border-[#ca8a04]/80 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
                  {member.name}
                </span>
                <RankBadge rank={member.currentRank} size="md" showLabel />
                {member.formerRank && member.formerRank !== 'None' && (
                  <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                    (Ex: {member.formerRank})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                <ActivityBadge
                  status={
                    member.status === 'Active'
                      ? insight
                        ? 'Needs Attention'
                        : 'Active'
                      : 'Inactive'
                  }
                  size="sm"
                />
                <CommunicationBadge status={member.communication} size="sm" />
                <StrikeBadge count={member.strikes} size="sm" />
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => {
                  onClose();
                  onOpenEditMember(member);
                }}
                className="btn-kingshot-gold px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenAddStrike(member);
                }}
                className="btn-kingshot-orange px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Strike</span>
              </button>
            </div>
          </div>

          {/* TOTAL PERCENTAGE OF THIS MEMBER PARTICIPATED IN EACH EVENT */}
          <div className="mt-4 pt-3.5 border-t border-[#52290d] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#140802] border border-[#451f08]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#fbbf24]" />
                  <span>War Participation Rate</span>
                </span>
                <span className="font-mono font-black text-sm text-emerald-400">
                  {partStats.percentage.toFixed(1)}%
                </span>
              </div>
              <ProgressBar
                percentage={partStats.percentage}
                color={partStats.percentage >= 75 ? 'emerald' : partStats.percentage >= 50 ? 'gold' : 'crimson'}
                size="sm"
                showPercentage={false}
              />
              <div className="text-[11px] text-stone-400 mt-1 flex justify-between">
                <span>Joined {partStats.joinedCount} of {partStats.totalEvents} completed wars</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#140802] border border-[#451f08]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-300 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>Vote Response Rate</span>
                </span>
                <span className="font-mono font-black text-sm text-blue-300">
                  {partStats.votePercentage.toFixed(1)}%
                </span>
              </div>
              <ProgressBar
                percentage={partStats.votePercentage}
                color="blue"
                size="sm"
                showPercentage={false}
              />
              <div className="text-[11px] text-stone-400 mt-1 flex justify-between">
                <span>Responded to {partStats.votedCount} of {partStats.totalEvents} summons</span>
              </div>
            </div>
          </div>

          {/* Last Activity Banner */}
          <div className="mt-3 text-xs text-stone-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>Last Activity:</span>
            <span className="text-stone-200 font-semibold font-mono">
              {insight ? `${insight.daysInactive} days ago (${insight.lastActivityDescription})` : 'Active in recent war cycles'}
            </span>
          </div>
        </div>

        {/* Tab Navigation for Profile Modal */}
        <div className="flex items-center gap-1.5 border-b border-[#52290d] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'events'
                ? 'btn-kingshot-gold text-[#381a07] font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Event History ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('participation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'participation'
                ? 'btn-kingshot-gold text-[#381a07] font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Participation By Event</span>
          </button>

          <button
            onClick={() => setActiveTab('strikes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'strikes'
                ? 'btn-kingshot-orange font-black text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Strikes ({memberStrikes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'comms'
                ? 'btn-kingshot-cream text-[#381a07] font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communication Notes</span>
          </button>
        </div>

        {/* TAB 1: COMPLETE EVENT HISTORY */}
        {activeTab === 'events' && (
          <div className="space-y-2">
            <div className="rounded-lg bg-[#140802] border border-[#52290d] overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-[#3d1d0a]">
                {partStats.perEvent.map(pe => (
                  <div
                    key={pe.eventId}
                    className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#200c03] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#fef08a] truncate">
                          ⚔️ {pe.eventType}
                        </span>
                        <span className="text-stone-400 font-mono text-[11px]">
                          • {new Date(pe.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-stone-300 text-[11px] truncate">{pe.eventName}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <VoteBadge status={pe.voteStatus as any} size="sm" />
                      <AttendanceBadge status={pe.attendanceStatus as any} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOTAL PARTICIPATION PERCENTAGE IN EACH EVENT TYPE */}
        {activeTab === 'participation' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-300">
              Breakdown of {member.name}&apos;s participation consistency across each event discipline:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto">
              {Object.keys(partStats.perType).map(typeKey => {
                const item = partStats.perType[typeKey];
                return (
                  <div
                    key={typeKey}
                    className="p-3 rounded-lg bg-[#170a03] border border-[#4d2309] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#fef08a]">{typeKey}</span>
                      <span
                        className={`font-mono font-bold ${
                          item.percentage >= 75
                            ? 'text-emerald-400'
                            : item.percentage >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>

                    <ProgressBar
                      percentage={item.percentage}
                      color={item.percentage >= 75 ? 'emerald' : item.percentage >= 50 ? 'gold' : 'crimson'}
                      size="sm"
                      showPercentage={false}
                    />

                    <div className="text-[10px] text-stone-400 text-right">
                      {item.joined} / {item.total} events attended
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: STRIKE HISTORY */}
        {activeTab === 'strikes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300">
                Disciplinary infractions recorded against {member.name}.
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddStrike(member);
                }}
                className="btn-kingshot-orange px-2.5 py-1 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Strike</span>
              </button>
            </div>

            {memberStrikes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-[#140802] rounded-lg border border-[#451f08]">
                <Shield className="w-8 h-8 mx-auto mb-2 text-stone-600 opacity-60" />
                <p className="font-bold text-stone-200">Clean Alliance Record</p>
                <p>This warrior has no recorded disciplinary infractions.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {memberStrikes.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-red-950/30 border border-red-900/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-400">
                          Strike #{memberStrikes.length - idx}
                        </span>
                        <span className="text-stone-400 text-[11px] font-mono">• {s.date}</span>
                      </div>
                      <p className="text-stone-200 font-medium">{s.reason}</p>
                      <p className="text-[10px] text-stone-500">Issued by: {s.addedBy}</p>
                    </div>

                    <button
                      onClick={() => handlePardonStrike(s.id)}
                      className="px-2 py-1 rounded bg-[#291307] border border-[#5c2a0d] text-stone-300 hover:text-emerald-300 hover:border-emerald-600 text-[11px] transition-colors cursor-pointer shrink-0"
                      title="Pardon this strike"
                    >
                      Pardon
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: COMMUNICATION & NOTES */}
        {activeTab === 'comms' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-[#140802] border border-[#451f08] space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#fef08a] uppercase mb-1">
                  Communication Status
                </label>
                <select
                  value={commStatusInput}
                  onChange={e => setCommStatusInput(e.target.value as CommunicationStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-[#200c03] border border-[#52290d] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
                >
                  <option value="Good">🟢 Good (Prompt & Reliable)</option>
                  <option value="Warning">🟡 Warning (Slow / Rarely reads pings)</option>
                  <option value="Poor">🔴 Poor (Unresponsive / Silent)</option>
                  <option value="Unknown">⚪ Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#fef08a] uppercase mb-1">
                  Officer Communication Notes
                </label>
                <textarea
                  value={commNoteInput}
                  onChange={e => setCommNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Record dialogue, war availability, Discord handle, or alliance notes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#200c03] border border-[#52290d] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveComms}
                  disabled={isSavingComm}
                  className="btn-kingshot-gold px-3.5 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSavingComm ? 'Saving...' : 'Save Communication Record'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
