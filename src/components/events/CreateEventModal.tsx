import React, { useState } from 'react';
import { AllianceEvent, EventType, EventStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { Swords, Calendar, Clock, AlertCircle } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose }) => {
  const { createEvent, members } = useCRM();

  const standardEventTypes: EventType[] = [
    'BT1',
    'BT2',
    'Swordland L1',
    'Swordland L2',
    'Tri Alliance L1',
    'Tri Alliance L2',
  ];

  const [eventType, setEventType] = useState<EventType>('BT1');
  const [customType, setCustomType] = useState('');
  const [eventName, setEventName] = useState('Battle Throne Phase 1');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState<EventStatus>('Scheduled');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate title suggestion when event type changes
  const handleTypeChange = (type: string) => {
    setEventType(type);
    if (type === 'BT1') setEventName('Battle Throne Phase 1');
    else if (type === 'BT2') setEventName('Battle Throne Phase 2 War');
    else if (type === 'Swordland L1') setEventName('Swordland Level 1 Siege');
    else if (type === 'Swordland L2') setEventName('Swordland Level 2 Championship');
    else if (type === 'Tri Alliance L1') setEventName('Tri Alliance Level 1 Showdown');
    else if (type === 'Tri Alliance L2') setEventName('Tri Alliance Level 2 Defense');
    else setEventName(`${type} War Rally`);
  };

  const activeRosterCount = members.filter(m => m.status !== 'Archived').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = eventType === 'CUSTOM' ? customType.trim() : eventType;
    if (!finalType || !eventName.trim() || !date) return;

    setIsSubmitting(true);
    await createEvent({
      eventType: finalType,
      eventName: eventName.trim(),
      date,
      status,
      notes: notes.trim(),
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚔️ Summon Alliance War Event"
      subtitle={`Automatically provisions attendance records for ${activeRosterCount} active members`}
      icon={<Swords className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Event Type (Section 19) */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
            Event Discipline / Type *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {standardEventTypes.map(t => (
              <button
                type="button"
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-2.5 py-2 rounded-lg border font-fantasy text-xs font-bold transition-all cursor-pointer ${
                  eventType === t
                    ? 'bg-[#ca8a04]/30 border-[#fef08a] text-[#fef08a] shadow-[0_0_10px_rgba(202,138,4,0.3)]'
                    : 'bg-[#141824] border-[#3f311c] text-stone-300 hover:border-[#ca8a04]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-2">
            <button
              type="button"
              onClick={() => handleTypeChange('CUSTOM')}
              className={`text-xs text-stone-400 hover:text-[#fef08a] cursor-pointer underline ${
                eventType === 'CUSTOM' ? 'text-[#fef08a] font-bold' : ''
              }`}
            >
              + Custom Event Type
            </button>
            {eventType === 'CUSTOM' && (
              <input
                type="text"
                required
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                placeholder="e.g. Castle Siege, Sanctuary Rally..."
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
              />
            )}
          </div>
        </div>

        {/* Event Name */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            War Event Codename / Title *
          </label>
          <input
            type="text"
            required
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Date / Time & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Event Date & Time *</span>
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            />
          </div>

          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Event Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as EventStatus)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="Scheduled">Scheduled (Upcoming)</option>
              <option value="Live">Live Battle (Active)</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Briefing & Strategy Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Gather at 18:45 UTC on voice comms. R4 will lead flank rallies."
            className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Auto roster note (Section 20) */}
        <div className="p-3 rounded-lg bg-[#181c28] border border-[#524126] text-xs text-stone-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#ca8a04] shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Roster Provisioning:</strong> The CRM will immediately enroll all{' '}
            <span className="text-[#fef08a] font-bold">{activeRosterCount} active members</span>{' '}
            into this event&apos;s attendance ledger.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3f311a]">
          <GameButton variant="slate" size="md" onClick={onClose} type="button">
            Cancel
          </GameButton>
          <GameButton
            variant="crimson"
            size="md"
            type="submit"
            disabled={isSubmitting}
            icon={<Swords className="w-4 h-4" />}
          >
            {isSubmitting ? 'Summoning...' : 'Summon Event'}
          </GameButton>
        </div>
      </form>
    </Modal>
  );
};
