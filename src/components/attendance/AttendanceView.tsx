import React, { useState, useMemo } from 'react';
import { Member } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import { calculateMemberParticipation } from '../../utils/participation';
import {
  Check,
  X,
  Minus,
  Search,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { safeFormatDate } from '../../utils/date';

interface AttendanceViewProps {
  onOpenAddStrike: (member: Member, defaultReason: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onOpenAddStrike }) => {
  const {
    events,
    members,
    attendance,
    updateVote,
    updateAttendance,
    bulkUpdateAttendance,
    selectedEventIdForAttendance,
    setSelectedEventIdForAttendance,
    setSelectedMemberForProfile,
  } = useCRM();

  const currentEvent = useMemo(() => {
    if (!events.length) return null;
    if (selectedEventIdForAttendance) {
      const found = events.find(e => e.id === selectedEventIdForAttendance);
      if (found) return found;
    }
    return events[0];
  }, [events, selectedEventIdForAttendance]);

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'JOINED' | 'FLAKED' | 'NO_VOTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const activeMembersMap = useMemo(() => {
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  // All non-archived members of the alliance (Active, Visitor, Inactive)
  const eligibleMembers = useMemo(() => {
    return members.filter(m => m.status !== 'Archived');
  }, [members]);

  // Ensure every eligible member has a valid attendance row for this event
  const eventAttendanceRecords = useMemo(() => {
    if (!currentEvent) return [];
    const existingMap = new Map(
      attendance.filter(a => a.eventId === currentEvent.id).map(a => [a.memberId, a])
    );
    return eligibleMembers.map(member => {
      const existing = existingMap.get(member.id);
      if (existing) return existing;
      return {
        id: `att-${currentEvent.id}-${member.id}`,
        eventId: currentEvent.id,
        memberId: member.id,
        voteStatus: 'NO RESPONSE' as const,
        attendanceStatus: 'NOT_APPLICABLE' as const,
        updatedAt: currentEvent.createdAt || new Date().toISOString(),
      };
    });
  }, [attendance, currentEvent, eligibleMembers]);

  // Clean stats
  const stats = useMemo(() => {
    const total = eventAttendanceRecords.length;
    const votedYes = eventAttendanceRecords.filter(r => r.voteStatus === 'YES').length;
    const joined = eventAttendanceRecords.filter(r => r.attendanceStatus === 'JOINED').length;
    const flaked = eventAttendanceRecords.filter(
      r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
    ).length;
    const noVote = eventAttendanceRecords.filter(r => r.voteStatus === 'NO RESPONSE').length;
    const attRate = total > 0 ? (joined / total) * 100 : 0;

    return { total, votedYes, joined, flaked, noVote, attRate };
  }, [eventAttendanceRecords]);

  // Categorize
  const categorizedRecords = useMemo(() => {
    return eventAttendanceRecords.filter(record => {
      const member = activeMembersMap.get(record.memberId);
      if (!member || member.status === 'Archived') return false;

      if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (activeCategory === 'JOINED') return record.attendanceStatus === 'JOINED';
      if (activeCategory === 'FLAKED') return record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';
      if (activeCategory === 'NO_VOTE') return record.voteStatus === 'NO RESPONSE';
      return true;
    });
  }, [eventAttendanceRecords, activeMembersMap, activeCategory, searchQuery]);

  const handleBulkYesJoined = async () => {
    if (!currentEvent) return;
    const updates = eventAttendanceRecords
      .filter(r => r.voteStatus === 'YES')
      .map(r => ({ memberId: r.memberId, attendanceStatus: 'JOINED' as const }));
    await bulkUpdateAttendance(currentEvent.id, updates);
    setShowBulkConfirm(false);
  };

  if (!currentEvent) {
    return (
      <div className="p-8 text-center text-stone-400 bg-[#20150f] rounded-xl border border-[#4d2b14]">
        No events created yet. Create an event to record attendance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Event Header & Selector */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#20150f] border border-[#4d2b14] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-amber-400 font-bold uppercase">
            Event Attendance
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#fffbeb] tracking-tight mt-0.5">
            {currentEvent.eventType} — {currentEvent.eventName}
          </h1>
          <div className="text-xs text-stone-400 mt-1">
            {stats.joined} / {stats.total} joined ({stats.attRate.toFixed(0)}% attendance) • {stats.flaked} missed after voting YES
          </div>
        </div>

        {/* Event Switcher & Bulk Action */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={currentEvent.id}
            onChange={e => {
              sounds.playClick();
              setSelectedEventIdForAttendance(e.target.value);
            }}
            className="flex-1 sm:flex-initial min-w-0 px-3 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-[#fbbf24] font-semibold text-xs focus:outline-none cursor-pointer"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.eventType} ({safeFormatDate(e.date, { month: 'numeric', day: 'numeric' })})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowBulkConfirm(true)}
            className="btn-kingshot-gold px-3 py-1.5 text-xs font-bold uppercase flex items-center justify-center gap-1 cursor-pointer flex-1 sm:flex-initial min-w-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mark All YES as Joined</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none overscroll-contain max-w-full pb-1">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
              activeCategory === 'ALL' ? 'bg-[#331c0d] text-[#fbbf24]' : 'bg-[#20150f] text-stone-400 hover:text-white'
            }`}
          >
            All ({stats.total})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('JOINED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
              activeCategory === 'JOINED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-[#20150f] text-emerald-400 hover:text-white'
            }`}
          >
            Joined ({stats.joined})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('FLAKED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
              activeCategory === 'FLAKED' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-[#20150f] text-red-400 hover:text-white'
            }`}
          >
            Missed after YES ({stats.flaked})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('NO_VOTE');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
              activeCategory === 'NO_VOTE' ? 'bg-[#331c0d] text-stone-200' : 'bg-[#20150f] text-stone-400 hover:text-white'
            }`}
          >
            No Vote ({stats.noVote})
          </button>
        </div>

        <div className="relative w-full sm:w-64 min-w-0">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#20150f] border border-[#4d2b14] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
          />
        </div>
      </div>

      {/* Mobile Attendance Cards (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {categorizedRecords.length === 0 ? (
          <div className="p-8 text-center text-stone-400 bg-[#20150f] rounded-2xl border border-[#4d2b14]">
            No members in this category.
          </div>
        ) : (
          categorizedRecords.map(record => {
            const member = activeMembersMap.get(record.memberId);
            if (!member) return null;

            const isFlaked = record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';

            return (
              <div
                key={record.id}
                className={`p-3.5 rounded-2xl bg-[#20150f] border-2 space-y-2.5 transition-colors ${
                  isFlaked ? 'border-red-600/70 bg-[#2a130f]' : 'border-[#4d2b14]'
                }`}
              >
                {/* Header: Player Name + Rank */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      onClick={() => {
                        sounds.playClick();
                        setSelectedMemberForProfile(member);
                      }}
                      className="font-fantasy font-black text-sm text-[#fffbeb] hover:text-[#fbbf24] cursor-pointer truncate"
                    >
                      {member.name}
                    </span>
                    <RankBadge rank={member.currentRank} size="sm" />
                    {member.status === 'Visitor' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-bold shrink-0">
                        Visitor
                      </span>
                    )}
                  </div>

                  {isFlaked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-200 border border-red-500 font-bold shrink-0">
                      ⚠️ Flaked
                    </span>
                  )}
                </div>

                {/* Vote Row */}
                <div className="p-2 rounded-xl bg-[#140c08] border border-[#3d200e] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-stone-400 uppercase">Vote Cast:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateVote(currentEvent.id, member.id, 'YES')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        record.voteStatus === 'YES'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#20150f] text-stone-400 hover:text-white'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => updateVote(currentEvent.id, member.id, 'NO')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        record.voteStatus === 'NO'
                          ? 'bg-red-700 text-white shadow-sm'
                          : 'bg-[#20150f] text-stone-400 hover:text-white'
                      }`}
                    >
                      NO
                    </button>
                    <button
                      type="button"
                      onClick={() => updateVote(currentEvent.id, member.id, 'NO RESPONSE')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        record.voteStatus === 'NO RESPONSE'
                          ? 'bg-stone-700 text-stone-200'
                          : 'bg-[#20150f] text-stone-500 hover:text-white'
                      }`}
                    >
                      —
                    </button>
                  </div>
                </div>

                {/* Attendance Toggle Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateAttendance(
                        currentEvent.id,
                        member.id,
                        record.attendanceStatus === 'JOINED' ? 'NOT_APPLICABLE' : 'JOINED'
                      )
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                      record.attendanceStatus === 'JOINED'
                        ? 'bg-emerald-600 text-white shadow-md border-2 border-emerald-400'
                        : 'bg-[#140c08] border border-[#3d200e] text-stone-400 hover:text-emerald-300'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Joined Battle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateAttendance(
                        currentEvent.id,
                        member.id,
                        record.attendanceStatus === 'DIDNT_JOIN' ? 'NOT_APPLICABLE' : 'DIDNT_JOIN'
                      )
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                      record.attendanceStatus === 'DIDNT_JOIN'
                        ? 'bg-red-700 text-white shadow-md border-2 border-red-400'
                        : 'bg-[#140c08] border border-[#3d200e] text-stone-400 hover:text-red-300'
                    }`}
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>Missed</span>
                  </button>
                </div>

                {/* Strike action if flaked */}
                {isFlaked && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAddStrike(
                          member,
                          `Missed ${currentEvent.eventType} after voting YES`
                        )
                      }
                      className="w-full py-1.5 rounded-xl bg-red-950/80 border border-red-600 text-red-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                      <span>Issue Penalty Strike</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Attendance Table (Hidden on screens < md) */}
      <div className="hidden md:block rounded-xl bg-[#20150f] border border-[#4d2b14] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#170e09] text-stone-300 font-semibold text-xs border-b border-[#3d200e]">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Vote</th>
              <th className="py-3 px-4">Attendance</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a170b] text-stone-200">
            {categorizedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-400">
                  No members in this category.
                </td>
              </tr>
            ) : (
              categorizedRecords.map(record => {
                const member = activeMembersMap.get(record.memberId);
                if (!member) return null;

                const isFlaked = record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';

                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-[#271a13] transition-colors ${isFlaked ? 'bg-red-950/20' : ''}`}
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="font-bold text-stone-100 hover:text-[#fbbf24] cursor-pointer"
                        >
                          {member.name}
                        </span>
                        {member.status === 'Visitor' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-bold shrink-0">
                            Visitor
                          </span>
                        )}
                      </div>
                      {isFlaked && (
                        <span className="block text-[11px] text-red-400 font-medium">
                          Voted YES but missed
                        </span>
                      )}
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    {/* Vote Toggle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'YES')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                            record.voteStatus === 'YES'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#140c08] text-stone-400 hover:text-white'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'NO')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                            record.voteStatus === 'NO'
                              ? 'bg-red-600 text-white'
                              : 'bg-[#140c08] text-stone-400 hover:text-white'
                          }`}
                        >
                          NO
                        </button>
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'NO RESPONSE')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                            record.voteStatus === 'NO RESPONSE'
                              ? 'bg-stone-700 text-stone-200'
                              : 'bg-[#140c08] text-stone-500 hover:text-white'
                          }`}
                        >
                          —
                        </button>
                      </div>
                    </td>

                    {/* Attendance Toggle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateAttendance(
                              currentEvent.id,
                              member.id,
                              record.attendanceStatus === 'JOINED' ? 'NOT_APPLICABLE' : 'JOINED'
                            )
                          }
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1 ${
                            record.attendanceStatus === 'JOINED'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-[#140c08] text-stone-400 hover:text-white'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>Joined</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateAttendance(
                              currentEvent.id,
                              member.id,
                              record.attendanceStatus === 'DIDNT_JOIN' ? 'NOT_APPLICABLE' : 'DIDNT_JOIN'
                            )
                          }
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1 ${
                            record.attendanceStatus === 'DIDNT_JOIN'
                              ? 'bg-red-700 text-white shadow-sm'
                              : 'bg-[#140c08] text-stone-400 hover:text-white'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          <span>Missed</span>
                        </button>
                      </div>
                    </td>

                    {/* Quick Strike */}
                    <td className="py-3 px-4 text-right">
                      {isFlaked ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenAddStrike(
                              member,
                              `Missed ${currentEvent.eventType} after voting YES`
                            )
                          }
                          className="px-2 py-1 rounded bg-red-950/60 border border-red-700 text-red-300 hover:text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Flame className="w-3 h-3" />
                          <span>Strike</span>
                        </button>
                      ) : (
                        <span className="text-stone-500 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkYesJoined}
        title="Mark Attendance"
        message={`Mark all ${stats.votedYes} members who voted YES as Joined for ${currentEvent.eventType}?`}
        confirmLabel="Confirm"
        variant="gold"
        position="top"
      />
    </div>
  );
};
