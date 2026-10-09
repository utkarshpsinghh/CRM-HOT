import React, { useState, useMemo } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { useAuth } from '../../../context/AuthContext';
import { Swords, Flame, Clock, CheckCircle2, XCircle, Users, ChevronRight, Vote, Calendar, Award, Trash2, AlertTriangle } from 'lucide-react';
import { sounds } from '../../../utils/sound';

export const AndroidWarRoomView: React.FC = () => {
  const { events, eventSlots, eventParticipations, members, updateParticipationAttendance, updateParticipationVote, deleteEvent } = useCRM();
  const { isMainAdmin, isAuthenticated } = useAuth();
  const canManage = isAuthenticated;

  const [searchMember, setSearchMember] = useState('');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<'ALL' | string>('ALL');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find upcoming or most recent battle
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events]);

  const upcomingEvent = useMemo(() => {
    const now = Date.now();
    return sortedEvents.find(e => new Date(e.date).getTime() >= now - 6 * 3600 * 1000) || sortedEvents[0];
  }, [sortedEvents]);

  const currentSlots = useMemo(() => {
    if (!upcomingEvent) return [];
    return eventSlots.filter(s => s.eventId === upcomingEvent.id);
  }, [upcomingEvent, eventSlots]);

  const currentParticipations = useMemo(() => {
    if (!upcomingEvent) return [];
    return eventParticipations.filter(p => p.eventId === upcomingEvent.id);
  }, [upcomingEvent, eventParticipations]);

  // Participation breakdown
  const stats = useMemo(() => {
    const attended = currentParticipations.filter(p => p.attendanceStatus === 'ATTENDED').length;
    const absent = currentParticipations.filter(p => p.attendanceStatus === 'ABSENT').length;
    const voted = currentParticipations.filter(p => p.voteStatus === 'VOTED').length;
    const total = members.filter(m => m.status !== 'Archived').length;
    return { attended, absent, voted, total };
  }, [currentParticipations, members]);

  // Attendance checklist search
  const filteredMembers = useMemo(() => {
    let list = members.filter(m => m.status !== 'Archived');
    if (searchMember.trim()) {
      const q = searchMember.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || (m.currentRank || '').toLowerCase().includes(q));
    }
    return list;
  }, [members, searchMember]);

  const handleToggleAttendance = async (memberId: string, currentStatus: string) => {
    if (!upcomingEvent || !canManage) return;
    sounds.playClick();
    const newStatus = currentStatus === 'ATTENDED' ? 'ABSENT' : 'ATTENDED';
    await updateParticipationAttendance(upcomingEvent.id, memberId, null, newStatus as any);
  };

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Featured Battle Hero Card - Cyberpunk Combat Deck */}
      {upcomingEvent && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950/70 via-[#070b16] to-[#02040a] border border-rose-500/40 p-4 shadow-[0_10px_35px_-5px_rgba(225,29,72,0.3)]">
          <div className="absolute top-0 right-0 w-36 h-36 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Tag & Status */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-black font-mono uppercase tracking-widest android-pulse-crimson">
              <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              {upcomingEvent.eventType || 'COMBAT OPERATION'}
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
              {new Date(upcomingEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Event Name */}
          <div className="flex items-center justify-between gap-2 mt-2.5">
            <h2 className="text-xl font-black text-white tracking-tight font-sans">
              {upcomingEvent.eventName}
            </h2>
            {isMainAdmin && (
              <button
                onClick={() => {
                  sounds.playAlert();
                  setIsConfirmDeleteOpen(true);
                }}
                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Slots Strip */}
          {currentSlots.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3.5">
              {currentSlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="p-2.5 rounded-2xl bg-[#090e1f]/90 border border-cyan-500/30 text-center shadow-[0_2px_12px_rgba(6,182,212,0.15)]"
                >
                  <div className="text-[10px] text-cyan-400 font-mono font-black uppercase tracking-wider">
                    {slot.slotName}
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {slot.startTime ? `${slot.startTime} UTC` : `Slot ${idx + 1}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Battle Progress Bar */}
          <div className="mt-4 pt-3.5 border-t border-rose-500/20">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium font-mono">
              <span className="text-slate-300 uppercase tracking-wider">Deployed Troops</span>
              <span className="text-rose-400 font-black">
                {stats.attended} / {stats.total} ({stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#050812] border border-rose-500/20 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                style={{ width: `${stats.total > 0 ? (stats.attended / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Attendance Checklist for Officers */}
      <div className="rounded-3xl bg-[#060914]/90 border border-cyan-500/25 p-4 space-y-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="font-black text-xs text-white uppercase tracking-wider font-mono">
              Live Attendance Matrix
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            {filteredMembers.length} AGENTS
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchMember}
          onChange={e => setSearchMember(e.target.value)}
          placeholder="Filter agent by name or rank..."
          className="w-full px-3.5 py-2.5 rounded-2xl bg-[#090d1c] border border-cyan-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all font-mono"
        />

        {/* Member list with instant one-tap buttons */}
        <div className="divide-y divide-rose-500/10 max-h-80 overflow-y-auto space-y-1 pr-1 overscroll-contain">
          {filteredMembers.slice(0, 35).map(member => {
            const part = currentParticipations.find(p => p.memberId === member.id);
            const isAttended = part?.attendanceStatus === 'ATTENDED';
            const isAbsent = part?.attendanceStatus === 'ABSENT';

            return (
              <div
                key={member.id}
                className="pt-2 pb-2 flex items-center justify-between gap-2 active:bg-rose-500/5 rounded-xl px-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5 font-sans">
                    <span className="truncate">{member.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-black border border-rose-500/40">
                      {member.currentRank}
                    </span>
                  </div>
                  <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                    Vote: {part?.voteStatus === 'VOTED' ? '✅ Confirmed' : '—'}
                  </div>
                </div>

                {/* Instant Tap Attendance Button */}
                {canManage ? (
                  <button
                    onClick={() => handleToggleAttendance(member.id, part?.attendanceStatus || 'NOT_MARKED')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black font-mono uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                      isAttended
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : isAbsent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                        : 'bg-[#090d1c] text-slate-300 border border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    {isAttended ? 'Present' : isAbsent ? 'Absent' : 'Mark'}
                  </button>
                ) : (
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isAttended ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  >
                    {isAttended ? 'Present' : '—'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Past Events Carousel */}
      <div className="space-y-2">
        <h3 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-400 px-1">
          Recent Combat Operations
        </h3>
        <div className="space-y-2">
          {sortedEvents.slice(1, 4).map(evt => (
            <div
              key={evt.id}
              className="p-3.5 rounded-2xl bg-[#060914]/80 border border-slate-800/80 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{evt.eventName}</div>
                <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                  {new Date(evt.date).toLocaleDateString()} • {evt.eventType}
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                Completed
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && upcomingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b0f19] border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Permanently Delete Event?</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="text-rose-400 font-semibold">{upcomingEvent.eventName}</span>? All turnout and attendance records for this battle will be permanently eradicated.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsConfirmDeleteOpen(false);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  await deleteEvent(upcomingEvent.id);
                  setIsDeleting(false);
                  setIsConfirmDeleteOpen(false);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold font-mono shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
