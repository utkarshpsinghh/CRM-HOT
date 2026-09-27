import React, { useState } from 'react';
import { Member } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { Flame, AlertTriangle, ShieldAlert } from 'lucide-react';

interface AddStrikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  defaultReason?: string;
}

export const AddStrikeModal: React.FC<AddStrikeModalProps> = ({
  isOpen,
  onClose,
  member,
  defaultReason = '',
}) => {
  const { addStrike } = useCRM();
  const [reason, setReason] = useState(defaultReason);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync reason if defaultReason changes
  React.useEffect(() => {
    if (defaultReason) setReason(defaultReason);
  }, [defaultReason]);

  if (!member) return null;

  const quickPresets = [
    'Missed event after voting YES',
    'Absent from war without advance notice',
    'No response to officer call-signs in alliance chat',
    'Attacked allied tile or broken NAP agreement',
    'Zero contribution during alliance showdown',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    await addStrike(member.id, reason.trim());
    setIsSubmitting(false);
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚠️ Issue Alliance Strike"
      subtitle={`Enforcing war discipline for ${member.name}`}
      icon={<Flame className="w-5 h-5 text-red-500" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Preview Banner */}
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-red-300 font-fantasy uppercase font-bold">Target Officer / Member</div>
            <div className="text-sm font-bold text-white mt-0.5">{member.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-400">Current Penalty</div>
            <div className="text-sm font-bold text-amber-400 font-mono">
              {member.strikes} Strike{member.strikes === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
            Quick Strike Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map(preset => (
              <button
                type="button"
                key={preset}
                onClick={() => setReason(preset)}
                className="text-[11px] px-2.5 py-1 rounded bg-[#181c28] border border-[#524126] text-stone-300 hover:text-[#fef08a] hover:border-[#ca8a04] transition-colors cursor-pointer text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
            Strike Infraction Description *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Specify reason for penalization..."
            className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Notice */}
        <div className="p-2.5 rounded bg-amber-950/30 border border-amber-700/40 text-[11px] text-amber-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Strikes are permanently recorded in the member&apos;s alliance dossier. Member strike count will increment to {member.strikes + 1}.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <GameButton variant="slate" size="md" onClick={onClose} type="button">
            Dismiss
          </GameButton>
          <GameButton
            variant="crimson"
            size="md"
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            icon={<Flame className="w-4 h-4" />}
          >
            {isSubmitting ? 'Recording...' : 'Impose Strike'}
          </GameButton>
        </div>
      </form>
    </Modal>
  );
};
