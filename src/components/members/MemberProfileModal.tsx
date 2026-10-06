import React, { useState } from 'react';
import { Member, CommunicationStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { RankBadge } from '../common/RankBadge';
import { ActivityBadge, VoteBadge, AttendanceBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ProgressBar } from '../common/ProgressBar';
import { calculateMemberParticipation } from '../../utils/participation';
import {
  Shield,
  Flame,
  MessageSquare,
  Swords,
  PlusCircle,
  Edit3,
  Copy,
  Check,
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
  const { events, attendance, strikes, removeStrike, addCommunication } = useCRM();

  const [activeTab, setActiveTab] = useState<'events' | 'strikes' | 'notes'>('events');
  const [commNoteInput, setCommNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState(false);

  React.useEffect(() => {
    if (member) {
      setCommNoteInput(member.communicationNote || '');
    }
  }, [member]);

  if (!member) return null;

  const partStats = calculateMemberParticipation(member.id, events, attendance);
  const memberStrikes = strikes.filter(s => s.memberId === member.id);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member.name}
      subtitle="Member Profile"
      icon={<Shield className="w-5 h-5 text-[#fbbf24]" />}
      maxWidth="lg"
    >
      <div className="space-y-4 text-stone-200">
        {/* Header Summary */}
        <div className="p-4 rounded-xl bg-[#170e09] border border-[#3d200e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-xl text-[#fffbeb]">{member.name}</span>
              <RankBadge rank={member.currentRank} size="sm" />
              <ActivityBadge status={member.status} size="sm" />
              {member.gameId && (
                <button
                  type="button"
                  onClick={handleCopyGameId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-mono text-xs cursor-pointer shadow-sm transition-colors"
                  title="Click to copy Game ID"
                >
                  <span className="text-[10px] text-stone-400 uppercase font-sans font-semibold">Game ID:</span>
                  <span className="font-bold">{member.gameId}</span>
                  {copiedGameId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-400 hover:text-amber-300" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <StrikeBadge count={member.strikes} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenEditMember(member);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#2b170c] border border-[#52290d] text-xs font-semibold text-stone-200 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenAddStrike(member);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-950/70 border border-red-800 text-xs font-semibold text-red-200 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Add Strike</span>
            </button>
          </div>
        </div>

        {/* Clean Attendance Bar */}
        <div className="p-3.5 rounded-xl bg-[#170e09] border border-[#3d200e] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-300">Attendance Rate</span>
            <span className="font-mono font-bold text-emerald-400">
              {partStats.percentage.toFixed(0)}% ({partStats.joinedCount} of {partStats.totalEvents} joined)
            </span>
          </div>
          <ProgressBar
            percentage={partStats.percentage}
            color={partStats.percentage >= 75 ? 'emerald' : partStats.percentage >= 50 ? 'gold' : 'crimson'}
            size="sm"
            showPercentage={false}
          />
        </div>

        {/* 3 Simple Tabs */}
        <div className="flex items-center gap-2 border-b border-[#3d200e] pb-1">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'events' ? 'bg-[#331c0d] text-[#fbbf24]' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Events ({events.length})
          </button>

          <button
            onClick={() => setActiveTab('strikes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'strikes' ? 'bg-[#331c0d] text-[#fbbf24]' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Strikes ({memberStrikes.length})
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'notes' ? 'bg-[#331c0d] text-[#fbbf24]' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Tab 1: Events */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {/* All-Time Specific Event Type Attendance Percentages (Requirement 1) */}
            <div className="p-3.5 rounded-xl bg-[#120c08] border border-[#3d200e] space-y-2.5">
              <div className="text-xs font-fantasy font-bold text-[#fef08a] uppercase tracking-wider">
                All-Time Attendance by Specific Event
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['BT1', 'BT2', 'Swordland L1', 'Swordland L2', 'Tri Alliance L1', 'Tri Alliance L2'].map(eventType => {
                  const typeData = partStats.perType[eventType];
                  const total = typeData ? typeData.total : 0;
                  const joined = typeData ? typeData.joined : 0;
                  const pct = total > 0 ? (joined / total) * 100 : 0;

                  return (
                    <div
                      key={eventType}
                      className="p-2.5 rounded-lg bg-[#1a110a] border border-[#2c1d15] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-200 truncate">{eventType}</span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            pct >= 75
                              ? 'text-emerald-400'
                              : pct >= 50
                              ? 'text-amber-400'
                              : total > 0
                              ? 'text-red-400'
                              : 'text-stone-500'
                          }`}
                        >
                          {total > 0 ? `${pct.toFixed(0)}%` : '—'}
                        </span>
                      </div>

                      <div className="w-full bg-[#0c0806] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-stone-500 font-mono text-right">
                        {joined}/{total} joined
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Battle Attendance Ledger */}
            <div className="rounded-xl bg-[#140c08] border border-[#3d200e] max-h-56 overflow-y-auto divide-y divide-[#261307]">
              {partStats.perEvent.map(pe => (
                <div
                  key={pe.eventId}
                  className="p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-200">{pe.eventType}</span>
                    <div className="text-[11px] text-stone-400">{pe.eventName}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <VoteBadge status={pe.voteStatus as any} size="sm" />
                    <AttendanceBadge status={pe.attendanceStatus as any} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Strikes */}
        {activeTab === 'strikes' && (
          <div className="space-y-3">
            {memberStrikes.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-[#140c08] rounded-lg border border-[#3d200e]">
                No strikes recorded for this player.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {memberStrikes.map(s => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-red-950/20 border border-red-900/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-red-300">{s.reason}</div>
                      <div className="text-[11px] text-stone-400 font-mono mt-0.5">{s.date} • by {s.addedBy}</div>
                    </div>
                    <button
                      onClick={() => handlePardonStrike(s.id)}
                      className="px-2 py-1 rounded bg-[#2b170c] text-stone-300 hover:text-white text-[11px] cursor-pointer"
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
              className="w-full p-3 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNote}
                className="btn-kingshot-gold px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer"
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
