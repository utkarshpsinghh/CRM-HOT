import React, { useState } from 'react';
import { MainEventType, EventStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { Modal } from '../common/Modal';
import { GameButton } from '../common/GameButton';
import { Swords, Calendar, AlertCircle, Clock } from 'lucide-react';
import { parseDateAsUtc, getComputedEventStatus, safeFormatDateTime } from '../../utils/date';
import { MAIN_EVENT_TYPES } from '../../utils/eventCalculations';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose }) => {
  const { createParentEvent, members } = useCRM();

  const [eventType, setEventType] = useState<MainEventType>('Bear Trap');
  const [customType, setCustomType] = useState('');
  const [eventName, setEventName] = useState('Bear Trap');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const currentUtcHour = now.getUTCHours();
    const targetUtc = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + (currentUtcHour >= 19 ? 1 : 0),
      currentUtcHour >= 19 ? 19 : Math.max(16, currentUtcHour + 1),
      0,
      0
    ));
    const y = targetUtc.getUTCFullYear();
    const m = String(targetUtc.getUTCMonth() + 1).padStart(2, '0');
    const d = String(targetUtc.getUTCDate()).padStart(2, '0');
    const h = String(targetUtc.getUTCHours()).padStart(2, '0');
    const mi = String(targetUtc.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${mi}`;
  });

  const [slot1Time, setSlot1Time] = useState(() => {
    const now = new Date();
    const dStr = now.toISOString().split('T')[0];
    return `${dStr} 16:00 UTC`;
  });
  const [slot2Time, setSlot2Time] = useState(() => {
    const now = new Date();
    const nextD = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dStr2 = nextD.toISOString().split('T')[0];
    return `${dStr2} 00:30 UTC`;
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSlotDefaults = (type: MainEventType, baseDateStr: string) => {
    const matched = MAIN_EVENT_TYPES.find(m => m.type === type);
    const datePart = (baseDateStr || '').split('T')[0] || new Date().toISOString().split('T')[0];
    const time1 = matched ? matched.defaultTime1 : '16:00';
    const time2 = matched ? matched.defaultTime2 : '00:30';

    let datePart2 = datePart;
    if (type === 'Bear Trap') {
      const d = new Date(baseDateStr || Date.now());
      if (!isNaN(d.getTime())) {
        const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        datePart2 = nextD.toISOString().split('T')[0];
      }
    }

    return {
      s1: `${datePart} ${time1} UTC`,
      s2: `${datePart2} ${time2} UTC`,
    };
  };

  const handleTypeChange = (type: MainEventType) => {
    setEventType(type);
    const matched = MAIN_EVENT_TYPES.find(m => m.type === type);
    if (matched) {
      setEventName(type);
    } else {
      setEventName(type === 'CUSTOM' ? '' : `${type} Event`);
    }
    const defs = getSlotDefaults(type, date);
    setSlot1Time(defs.s1);
    setSlot2Time(defs.s2);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const defs = getSlotDefaults(eventType, newDate);
    setSlot1Time(defs.s1);
    setSlot2Time(defs.s2);
  };

  const activeRosterCount = members.filter(m => m.status !== 'Archived').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = eventType === 'CUSTOM' ? customType.trim() : eventType;
    if (!finalType || !eventName.trim() || !date) return;

    const parsedUtc = parseDateAsUtc(date);
    const finalDateIso = parsedUtc ? parsedUtc.toISOString() : date;

    setIsSubmitting(true);
    await createParentEvent({
      eventType: finalType,
      eventName: eventName.trim(),
      date: finalDateIso,
      notes: notes.trim(),
      slot1Time: slot1Time.trim(),
      slot2Time: slot2Time.trim(),
    });
    setIsSubmitting(false);
    onClose();
  };

  const matchedConfig = MAIN_EVENT_TYPES.find(m => m.type === eventType);
  const slot1Label = matchedConfig ? matchedConfig.slot1Name : 'Slot 1';
  const slot2Label = matchedConfig ? matchedConfig.slot2Name : 'Slot 2';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Alliance Event"
      subtitle={`Enrolls all ${activeRosterCount} active alliance members into 2-slot event`}
      icon={<Swords className="w-5 h-5 text-[#ca8a04]" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Event Type */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1.5">
            Event Type *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Bear Trap', 'Swordsland', 'Tri Alliance', 'CUSTOM'] as const).map(t => (
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
                {t === 'CUSTOM' ? '+ Custom' : t}
              </button>
            ))}
          </div>

          {eventType === 'CUSTOM' && (
            <input
              type="text"
              required
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder="e.g. Castle Siege..."
              className="mt-2 w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
            />
          )}
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

        {/* Date / Time */}
        <div>
          <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Event Date *</span>
            </span>
            <span className="text-[10px] text-sky-400 font-mono font-bold">Game Time (UTC)</span>
          </label>
          <input
            type="datetime-local"
            required
            value={date}
            onChange={e => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 focus:outline-none focus:border-[#ca8a04]"
          />
          {date && (
            <div className="text-[11px] text-sky-400 font-mono mt-1 flex items-center justify-between">
              <span>Game Time: {safeFormatDateTime(date)}</span>
              <span className={getComputedEventStatus(date) === 'Upcoming' ? 'text-emerald-400 font-bold' : 'text-stone-400'}>
                {getComputedEventStatus(date) === 'Upcoming' ? '● Upcoming' : '● Completed'}
              </span>
            </div>
          )}
        </div>

        {/* 2-Slot Times */}
        <div className="p-3 rounded-xl bg-[#17100b] border border-[#452d19] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-fantasy font-bold text-[#fef08a] uppercase">
            <Clock className="w-3.5 h-3.5 text-[#ca8a04]" />
            <span>Event Slots (Two Slots Per Event)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-amber-300/80 mb-1 font-semibold">
                Slot 1: {slot1Label}
              </label>
              <input
                type="text"
                value={slot1Time}
                onChange={e => setSlot1Time(e.target.value)}
                placeholder="16:00 UTC"
                className="w-full px-3 py-1.5 rounded-lg bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-amber-300/80 mb-1 font-semibold">
                Slot 2: {slot2Label}
              </label>
              <input
                type="text"
                value={slot2Time}
                onChange={e => setSlot2Time(e.target.value)}
                placeholder="02:00 UTC"
                className="w-full px-3 py-1.5 rounded-lg bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
              />
            </div>
          </div>
          <p className="text-[10px] text-stone-400 italic">
            Alliance members will select Slot 1 or Slot 2 during the in-game vote.
          </p>
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
            Participation ledger will be initialized for all{' '}
            <strong className="text-[#fef08a]">{activeRosterCount} active members</strong> with independent voting & actual attendance tracking.
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
