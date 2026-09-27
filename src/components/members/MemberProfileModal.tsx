import React, { useState } from 'react';
import { Member, CommunicationStatus, AllianceRank } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { RankBadge } from '../common/RankBadge';
import { CommunicationBadge, ActivityBadge, VoteBadge, AttendanceBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import {
  Shield,
  Flame,
  MessageSquare,
  Swords,
  Calendar,
  Clock,
  Trash2,
  CheckCircle,
  PlusCircle,
  Edit3,
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

  const [activeTab, setActiveTab] = useState<'events' | 'strikes' | 'comms'>('events');
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

  // Member's event history
  const memberAttendance = attendance.filter(a => a.memberId === member.id);
  const memberStrikes = strikes.filter(s => s.memberId === member.id);

  // Find inactive insight for this member if any
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
          <span>⚔️ Member Dossier</span>
          <span className="text-[#fef08a] font-black">{member.name}</span>
        </div>
      }
      subtitle={`Alliance Serial ID: ${member.id}`}
      icon={<Shield className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-stone-200">
        {/* Top Header Card (Section 9) */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#201518] via-[#161a29] to-[#10131d] border-2 border-[#ca8a04]/80 shadow-md">
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
              <GameButton
                variant="gold"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenEditMember(member);
                }}
                icon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit
              </GameButton>

              <GameButton
                variant="crimson"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAddStrike(member);
                }}
                icon={<Flame className="w-3.5 h-3.5" />}
              >
                Strike
              </GameButton>
            </div>
          </div>

          {/* Last Activity Banner (Section 9 & 15) */}
          <div className="mt-4 pt-3 border-t border-[#453820] flex items-center justify-between text-xs text-stone-400 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Last Activity:</span>
              <span className="text-stone-200 font-semibold font-mono">
                {insight ? `${insight.daysInactive} days ago (${insight.lastActivityDescription})` : 'Active in recent war cycles'}
              </span>
            </div>

            {member.communicationNote && (
              <div className="italic text-[#ca8a04] text-[11px] truncate max-w-xs">
                &ldquo;{member.communicationNote}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation for Profile Modal */}
        <div className="flex items-center gap-2 border-b border-[#3f311c] pb-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-[#ca8a04]/20 border border-[#ca8a04] text-[#fef08a]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Event History ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('strikes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'strikes'
                ? 'bg-red-950/40 border border-red-600 text-red-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Strike History ({memberStrikes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'comms'
                ? 'bg-amber-950/30 border border-amber-600 text-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communication & Notes</span>
          </button>
        </div>

        {/* TAB 1: COMPLETE EVENT HISTORY (Section 9 & 11) */}
        {activeTab === 'events' && (
          <div className="space-y-2">
            <div className="rounded-lg bg-[#0b0d14] border border-[#453820] overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-[#2a2417]">
                {events.map(evt => {
                  const rec = memberAttendance.find(a => a.eventId === evt.id);
                  const vote = rec ? rec.voteStatus : 'NO RESPONSE';
                  const att = rec ? rec.attendanceStatus : 'NOT_APPLICABLE';

                  const dateFormatted = new Date(evt.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={evt.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#151926] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-fantasy font-bold text-[#fef08a] truncate">
                            {evt.eventType}
                          </span>
                          <span className="text-stone-500 font-mono text-[11px]">• {dateFormatted}</span>
                        </div>
                        <div className="text-stone-400 text-[11px] truncate">{evt.eventName}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <VoteBadge status={vote} size="sm" />
                        <AttendanceBadge status={att} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STRIKE HISTORY (Section 16) */}
        {activeTab === 'strikes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">
                Alliance strike disciplinary record. Strikes should not be permanently deleted to maintain historical audit.
              </span>
              <GameButton
                variant="crimson"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAddStrike(member);
                }}
                icon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                Add Strike
              </GameButton>
            </div>

            {memberStrikes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 bg-[#0c0e16] rounded-lg border border-[#3f311c]">
                <Shield className="w-8 h-8 mx-auto mb-2 text-stone-600 opacity-60" />
                <p className="font-fantasy font-bold text-stone-300">Clean Alliance Record</p>
                <p>This warrior has no recorded disciplinary infractions.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {memberStrikes.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-red-950/20 border border-red-900/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-fantasy font-bold text-red-400">
                          Strike #{memberStrikes.length - idx}
                        </span>
                        <span className="text-stone-500 text-[11px] font-mono">• {s.date}</span>
                      </div>
                      <p className="text-stone-200 font-medium">{s.reason}</p>
                      <p className="text-[10px] text-stone-500">Issued by: {s.addedBy}</p>
                    </div>

                    <button
                      onClick={() => handlePardonStrike(s.id)}
                      className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 hover:text-emerald-300 hover:border-emerald-600 text-[11px] transition-colors cursor-pointer shrink-0"
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

        {/* TAB 3: COMMUNICATION & NOTES (Section 17) */}
        {activeTab === 'comms' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-[#0c0e16] border border-[#453820] space-y-3">
              <div>
                <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
                  Communication Status
                </label>
                <select
                  value={commStatusInput}
                  onChange={e => setCommStatusInput(e.target.value as CommunicationStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#524126] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
                >
                  <option value="Good">🟢 Good (Prompt & Reliable)</option>
                  <option value="Warning">🟡 Warning (Rarely reads pings)</option>
                  <option value="Poor">🔴 Poor (Unresponsive / Silent)</option>
                  <option value="Unknown">⚪ Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
                  Officer Communication Notes
                </label>
                <textarea
                  value={commNoteInput}
                  onChange={e => setCommNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Record dialogue, war availability, Discord handle, or alliance notes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#141724] border border-[#524126] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
                />
              </div>

              <div className="flex justify-end">
                <GameButton
                  variant="gold"
                  size="sm"
                  onClick={handleSaveComms}
                  disabled={isSavingComm}
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                >
                  {isSavingComm ? 'Saving...' : 'Save Communication Record'}
                </GameButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
