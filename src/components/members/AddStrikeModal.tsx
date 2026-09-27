import React, { useState } from 'react';
import { Member } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { Flame, ShieldAlert } from 'lucide-react';

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

  React.useEffect(() => {
    if (defaultReason) setReason(defaultReason);
  }, [defaultReason]);

  if (!member) return null;

  const quickPresets = [
    'Missed event after voting YES',
    'Absent without advance notice',
    'No response to officer messages',
    'Attacked NAP / allied territory',
    'Zero battle participation',
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
      title="Add Strike"
      subtitle={`Record a penalty strike for ${member.name}`}
      icon={<Flame className="w-5 h-5 text-red-500" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Preview Banner */}
        <div className="p-3 rounded-xl bg-[#2a130f] border border-red-800/40 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">Player</div>
            <div className="text-sm font-bold text-white mt-0.5">{member.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-400">Current Strikes</div>
            <div className="text-sm font-bold text-amber-400 font-mono">
              {member.strikes} Strike{member.strikes === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
            Quick Reason Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map(preset => (
              <button
                type="button"
                key={preset}
                onClick={() => setReason(preset)}
                className="text-xs px-2.5 py-1 rounded-lg bg-[#120c08] border border-[#3e2716] text-stone-300 hover:text-[#fef08a] hover:border-[#ca8a04] transition-colors cursor-pointer text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Reason / Description *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Describe the reason for issuing this strike..."
            className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Notice */}
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-700/40 text-xs text-amber-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Strikes are recorded in the member history. Current strikes will increase to {member.strikes + 1}.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#3e2716]">
          <GameButton variant="slate" size="md" onClick={onClose} type="button">
            Cancel
          </GameButton>
          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md bg-gradient-to-r from-red-600 to-amber-600"
          >
            <Flame className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording...' : 'Add Strike'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
