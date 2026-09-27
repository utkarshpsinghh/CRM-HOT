import React, { useState, useEffect } from 'react';
import { Member, AllianceRank, CommunicationStatus, MemberStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { UserPlus, UserCog } from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
}) => {
  const { createMember, updateMember } = useCRM();

  const [name, setName] = useState('');
  const [currentRank, setCurrentRank] = useState<AllianceRank>('R1');
  const [formerRank, setFormerRank] = useState<AllianceRank | 'None'>('None');
  const [communication, setCommunication] = useState<CommunicationStatus>('Good');
  const [communicationNote, setCommunicationNote] = useState('');
  const [status, setStatus] = useState<MemberStatus>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setCurrentRank(memberToEdit.currentRank);
      setFormerRank(memberToEdit.formerRank || 'None');
      setCommunication(memberToEdit.communication);
      setCommunicationNote(memberToEdit.communicationNote || '');
      setStatus(memberToEdit.status);
    } else {
      setName('');
      setCurrentRank('R1');
      setFormerRank('None');
      setCommunication('Good');
      setCommunicationNote('');
      setStatus('Active');
    }
  }, [memberToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    if (memberToEdit) {
      await updateMember({
        ...memberToEdit,
        name: name.trim(),
        currentRank,
        formerRank,
        communication,
        communicationNote: communicationNote.trim(),
        status,
      });
    } else {
      await createMember({
        name: name.trim(),
        currentRank,
        formerRank,
        communication,
        communicationNote: communicationNote.trim(),
        status,
      });
    }
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={memberToEdit ? `⚔️ Edit ${memberToEdit.name}` : '🛡️ Induct New Member'}
      subtitle={memberToEdit ? 'Modify alliance rank and status' : 'Enlist new recruit into HOT Alliance roster'}
      icon={memberToEdit ? <UserCog className="w-5 h-5 text-[#ca8a04]" /> : <UserPlus className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Member In-Game Name */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            In-Game Name (IGN) *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Warlord_HOT"
            className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Rank Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Current Rank
            </label>
            <select
              value={currentRank}
              onChange={e => setCurrentRank(e.target.value as AllianceRank)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="R5">R5 — Supreme Leader</option>
              <option value="R4">R4 — War Officer</option>
              <option value="R3">R3 — Veteran Elite</option>
              <option value="R2">R2 — Proven Warrior</option>
              <option value="R1">R1 — Recruit / Footman</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Former Rank
            </label>
            <select
              value={formerRank}
              onChange={e => setFormerRank(e.target.value as AllianceRank | 'None')}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="None">None (Fresh Recruit)</option>
              <option value="R5">R5</option>
              <option value="R4">R4</option>
              <option value="R3">R3</option>
              <option value="R2">R2</option>
              <option value="R1">R1</option>
            </select>
          </div>
        </div>

        {/* Communication & Alliance Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Communication
            </label>
            <select
              value={communication}
              onChange={e => setCommunication(e.target.value as CommunicationStatus)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="Good">🟢 Good (Responsive)</option>
              <option value="Warning">🟡 Warning (Slow / Inconsistent)</option>
              <option value="Poor">🔴 Poor (Unresponsive)</option>
              <option value="Unknown">⚪ Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Roster Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MemberStatus)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="Active">Active Combatant</option>
              <option value="Inactive">Inactive / On Leave</option>
              <option value="Archived">Archived (Soft Deleted)</option>
            </select>
          </div>
        </div>

        {/* Communication Note */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Communication / Officer Notes
          </label>
          <textarea
            value={communicationNote}
            onChange={e => setCommunicationNote(e.target.value)}
            rows={2}
            placeholder="e.g. Active in voice chat during throne wars, prefers rallies at 19:00 UTC"
            className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3f311a]">
          <GameButton variant="slate" size="md" onClick={onClose} type="button">
            Cancel
          </GameButton>
          <GameButton
            variant="gold"
            size="md"
            type="submit"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Saving...' : memberToEdit ? 'Save Changes' : 'Confirm Induction'}
          </GameButton>
        </div>
      </form>
    </Modal>
  );
};
