import React, { useState } from 'react';
import { EventType, EventStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { Swords, Calendar, AlertCircle } from 'lucide-react';

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
  const [eventName, setEventName] = useState('Bear Trap 1');
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
    if (type === 'BT1') setEventName('Bear Trap 1');
    else if (type === 'BT2') setEventName('Bear Trap 2');
    else if (type === 'Swordland L1') setEventName('Swordland Legion 1');
    else if (type === 'Swordland L2') setEventName('Swordland Legion 2');
    else if (type === 'Tri Alliance L1') setEventName('Tri Alliance Legion 1');
    else if (type === 'Tri Alliance L2') setEventName('Tri Alliance Legion 2');
    else setEventName(`${type} Event`);
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
      title="Create New Event"
      subtitle={`Enrolls all ${activeRosterCount} active alliance members`}
      icon={<Swords className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Event Type */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
            Event Type *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {standardEventTypes.map(t => (
              <button
                type="button"
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-2.5 py-2 rounded-xl border font-fantasy text-xs font-bold transition-all cursor-pointer ${
                  eventType === t
                    ? 'bg-[#ca8a04] text-[#1a1410] border-[#fef08a] shadow-md font-black'
                    : 'bg-[#120c08] border-[#3e2716] text-stone-300 hover:border-[#ca8a04]'
                }`}
              >
                {t === 'BT1' ? 'BT1 (Bear Trap 1)' : t === 'BT2' ? 'BT2 (Bear Trap 2)' : t}
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
                placeholder="e.g. Castle Siege..."
                className="mt-1.5 w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
              />
            )}
          </div>
        </div>

        {/* Event Name */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Event Title *
          </label>
          <input
            type="text"
            required
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Date / Time & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Date & Time *</span>
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            />
          </div>

          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as EventStatus)}
              className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Gather 15 minutes before start..."
            className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Info notice */}
        <div className="p-3 rounded-xl bg-[#120c08] border border-[#3e2716] text-xs text-stone-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#ca8a04] shrink-0 mt-0.5" />
          <span>
            Attendance ledger will be automatically initialized for all{' '}
            <strong className="text-[#fef08a]">{activeRosterCount} active members</strong>.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3e2716]">
          <GameButton variant="slate" size="md" onClick={onClose} type="button">
            Cancel
          </GameButton>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Swords className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating...' : 'Create Event'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
