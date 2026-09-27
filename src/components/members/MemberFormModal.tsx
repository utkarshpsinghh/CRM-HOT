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
      title={memberToEdit ? `Edit ${memberToEdit.name}` : 'Add Alliance Member'}
      subtitle={memberToEdit ? 'Update rank, notes, and activity status' : 'Add player to the HOT Alliance roster'}
      icon={memberToEdit ? <UserCog className="w-5 h-5 text-[#ca8a04]" /> : <UserPlus className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Name */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Player Name (IGN) *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Warlord_HOT"
            className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Current & Former Rank */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Current Rank *
            </label>
            <select
              value={currentRank}
              onChange={e => setCurrentRank(e.target.value as AllianceRank)}
              className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="R5">R5 - Alliance Leader</option>
              <option value="R4">R4 - Officer</option>
              <option value="R3">R3 - Elite Member</option>
              <option value="R2">R2 - Senior Member</option>
              <option value="R1">R1 - Member</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-fantasy font-bold text-stone-300 uppercase mb-1 font-fantasy">
              Former Rank
            </label>
            <select
              value={formerRank}
              onChange={e => setFormerRank(e.target.value as AllianceRank | 'None')}
              className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="None">None</option>
              <option value="R5">Former R5</option>
              <option value="R4">Former R4</option>
              <option value="R3">Former R3</option>
              <option value="R2">Former R2</option>
              <option value="R1">Former R1</option>
            </select>
          </div>
        </div>

        {/* Communication & Activity Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Communication Status *
            </label>
            <select
              value={communication}
              onChange={e => setCommunication(e.target.value as CommunicationStatus)}
              className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="Good">Good (Responsive)</option>
              <option value="Warning">Warning (Slow Response)</option>
              <option value="Unreachable">Unreachable (No Response)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Activity Status *
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MemberStatus)}
              className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Archived">Archived (Left Alliance)</option>
            </select>
          </div>
        </div>

        {/* Communication Note */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Communication Note (Optional)
          </label>
          <input
            type="text"
            value={communicationNote}
            onChange={e => setCommunicationNote(e.target.value)}
            placeholder="e.g. Active on Discord, traveling this weekend..."
            className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3e2716]">
          <GameButton variant="slate" size="md" onClick={onClose} type="button">
            Cancel
          </GameButton>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            {memberToEdit ? <UserCog className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{isSubmitting ? 'Saving...' : memberToEdit ? 'Save Changes' : 'Add Member'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
