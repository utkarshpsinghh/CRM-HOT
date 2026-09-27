import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { GameButton } from '../common/GameButton';
import { ProgressBar } from '../common/ProgressBar';
import { Swords, PlusCircle, Calendar, Users, ChevronRight, Filter } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface EventsViewProps {
  onOpenCreateEvent: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onOpenCreateEvent }) => {
  const { events, attendance, setSelectedEventIdForAttendance, setActiveTab } = useCRM();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredEvents = events.filter(e => {
    if (typeFilter !== 'ALL' && e.eventType !== typeFilter) return false;
    return true;
  });

  const handleOpenAttendance = (eventId: string) => {
    sounds.playClick();
    setSelectedEventIdForAttendance(eventId);
    setActiveTab('attendance');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-[#ca8a04]" />
            <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
              Alliance War Events
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#713f12]/50 border border-[#ca8a04] text-[#fef3c7] font-bold font-mono">
              {events.length} Events
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Battle Throne, Swordland, and Tri Alliance scheduled rallies and battle logs.
          </p>
        </div>

        <GameButton
          variant="crimson"
          size="md"
          onClick={onOpenCreateEvent}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          Summon War Event
        </GameButton>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 rounded-xl bg-[#141824] border border-[#524126] flex items-center gap-2 overflow-x-auto">
        <Filter className="w-4 h-4 text-stone-400 shrink-0 ml-1" />
        <span className="text-xs font-fantasy font-bold uppercase text-[#ca8a04] shrink-0">
          Filter Type:
        </span>
        {['ALL', 'BT1', 'BT2', 'Swordland L1', 'Swordland L2', 'Tri Alliance L1', 'Tri Alliance L2'].map(
          t => (
            <button
              key={t}
              onClick={() => {
                sounds.playClick();
                setTypeFilter(t);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === t
                  ? 'bg-[#ca8a04] text-[#1e1503] shadow-md font-black'
                  : 'bg-[#0c0e16] text-stone-300 hover:text-[#fef08a] border border-[#3f311c]'
              }`}
            >
              {t}
            </button>
          )
        )}
      </div>

      {/* Event Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map(evt => {
          const records = attendance.filter(a => a.eventId === evt.id);
          const total = records.length;
          const joined = records.filter(r => r.attendanceStatus === 'JOINED').length;
          const voted = records.filter(r => r.voteStatus === 'YES' || r.voteStatus === 'NO').length;
          const didNotJoin = records.filter(
            r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
          ).length;

          const attPct = total > 0 ? (joined / total) * 100 : 0;
          const votePct = total > 0 ? (voted / total) * 100 : 0;

          const formattedDate = new Date(evt.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={evt.id}
              className="rounded-xl bg-gradient-to-b from-[#1b1f2e] to-[#111420] border-[1.5px] border-[#524126] hover:border-[#ca8a04] p-4 sm:p-5 transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="font-fantasy font-black text-lg text-[#fef08a] block truncate">
                      ⚔️ {evt.eventType}
                    </span>
                    <h3 className="text-xs text-stone-200 font-semibold truncate mt-0.5">
                      {evt.eventName}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-fantasy font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${
                      evt.status === 'Completed'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                        : evt.status === 'Live'
                        ? 'bg-red-950 text-red-200 border-red-500 animate-pulse'
                        : 'bg-blue-950/60 text-blue-300 border-blue-700'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
                  <span>{formattedDate}</span>
                </div>

                {evt.notes && (
                  <p className="text-xs text-stone-400 italic bg-[#0c0e16] p-2.5 rounded-lg border border-[#3f311c] mb-4 line-clamp-2">
                    &ldquo;{evt.notes}&rdquo;
                  </p>
                )}

                {/* Telemetry Progress Bars */}
                <div className="space-y-2.5 mb-4 bg-[#0a0c14] p-3 rounded-lg border border-[#3f311c]">
                  <ProgressBar
                    percentage={attPct}
                    label="Turnout"
                    subLabel={`${joined}/${total}`}
                    color={attPct >= 75 ? 'emerald' : attPct >= 50 ? 'gold' : 'crimson'}
                    size="sm"
                  />
                  <ProgressBar
                    percentage={votePct}
                    label="Votes Cast"
                    subLabel={`${voted}/${total}`}
                    color="blue"
                    size="sm"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-[#3f311c] flex items-center justify-between">
                <div className="text-[11px] text-stone-400">
                  {didNotJoin > 0 && (
                    <span className="text-amber-400 font-bold">
                      ⚠️ {didNotJoin} flaked
                    </span>
                  )}
                </div>

                <GameButton
                  variant="gold"
                  size="sm"
                  onClick={() => handleOpenAttendance(evt.id)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Manage Roster
                </GameButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
