import React, { useState, useMemo } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { useAuth } from '../../../context/AuthContext';
import { Swords, Flame, Clock, CheckCircle2, XCircle, Users, ChevronRight, Vote, Calendar, Award } from 'lucide-react';
import { sounds } from '../../../utils/sound';

export const AndroidWarRoomView: React.FC = () => {
  const { events, eventSlots, eventParticipations, members, updateParticipationAttendance, updateParticipationVote } = useCRM();
  const { isMainAdmin, isAuthenticated } = useAuth();
  const canManage = isAuthenticated;

  const [searchMember, setSearchMember] = useState('');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<'ALL' | string>('ALL');

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
      {/* Featured Battle Hero Card */}
      {upcomingEvent && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/30 p-4 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Tag & Status */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {upcomingEvent.eventType || 'Battle Event'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {new Date(upcomingEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Event Name */}
          <h2 className="text-xl font-extrabold text-white mt-2 tracking-tight">
            {upcomingEvent.eventName}
          </h2>

          {/* Slots Strip */}
          {currentSlots.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {currentSlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center"
                >
                  <div className="text-[11px] text-amber-400 font-bold uppercase">
                    {slot.slotName}
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    {slot.startTime ? `${slot.startTime} UTC` : `Slot ${idx + 1}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Battle Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-400">Battle Attendance</span>
              <span className="text-amber-400 font-mono font-bold">
                {stats.attended} / {stats.total} ({stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.attended / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Attendance Checklist for Officers */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">Live Attendance Ledger</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {filteredMembers.length} members
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchMember}
          onChange={e => setSearchMember(e.target.value)}
          placeholder="Search member to mark..."
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />

        {/* Member list with instant one-tap buttons */}
        <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto space-y-1 pr-1 overscroll-contain">
          {filteredMembers.slice(0, 30).map(member => {
            const part = currentParticipations.find(p => p.memberId === member.id);
            const isAttended = part?.attendanceStatus === 'ATTENDED';
            const isAbsent = part?.attendanceStatus === 'ABSENT';

            return (
              <div
                key={member.id}
                className="pt-2 pb-2 flex items-center justify-between gap-2 active:bg-slate-800/40 rounded-lg px-1 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{member.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono font-bold">
                      {member.currentRank}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Vote: {part?.voteStatus === 'VOTED' ? '✅ Yes' : '—'}
                  </div>
                </div>

                {/* Instant Tap Attendance Button */}
                {canManage ? (
                  <button
                    onClick={() => handleToggleAttendance(member.id, part?.attendanceStatus || 'NOT_MARKED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${
                      isAttended
                        ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                        : isAbsent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isAttended ? 'Attended' : isAbsent ? 'Absent' : 'Mark'}
                  </button>
                ) : (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      isAttended ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {isAttended ? 'Attended' : '—'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Past Events Carousel */}
      <div className="space-y-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">
          Recent Battle History
        </h3>
        <div className="space-y-2">
          {sortedEvents.slice(1, 4).map(evt => (
            <div
              key={evt.id}
              className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{evt.eventName}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {new Date(evt.date).toLocaleDateString()} • {evt.eventType}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                Completed
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
