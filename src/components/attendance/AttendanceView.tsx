import React, { useState, useMemo } from 'react';
import {
  AllianceEvent,
  Member,
  AttendanceRecord,
  VoteStatus,
  AttendanceStatus,
} from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ProgressBar } from '../common/ProgressBar';
import { GameButton } from '../common/GameButton';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  BarChart3,
  Calendar,
  Check,
  X,
  Minus,
  Search,
  Filter,
  Flame,
  AlertTriangle,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

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

  // Active event selection (default to selectedEventIdForAttendance, or latest event)
  const currentEventId = selectedEventIdForAttendance || events[events.length - 1]?.id || '';
  const currentEvent = events.find(e => e.id === currentEventId) || events[0];

  // Category view tabs (Section 12 & 13)
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'JOINED' | 'FLAKED' | 'NO_VOTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk action confirmation dialog state
  const [bulkActionType, setBulkActionType] = useState<
    'ALL_JOINED' | 'ALL_YES_JOINED' | 'ALL_NO_VOTE' | null
  >(null);

  // Get active roster (exclude archived)
  const activeMembersMap = useMemo(() => {
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  // Current event attendance rows
  const eventAttendanceRecords = useMemo(() => {
    if (!currentEvent) return [];
    return attendance.filter(a => a.eventId === currentEvent.id);
  }, [attendance, currentEvent]);

  // Statistics calculation for this event (Section 13)
  const stats = useMemo(() => {
    const total = eventAttendanceRecords.length;
    const votedYes = eventAttendanceRecords.filter(r => r.voteStatus === 'YES').length;
    const votedNo = eventAttendanceRecords.filter(r => r.voteStatus === 'NO').length;
    const totalVoted = votedYes + votedNo;
    const joined = eventAttendanceRecords.filter(r => r.attendanceStatus === 'JOINED').length;
    const flaked = eventAttendanceRecords.filter(
      r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
    ).length;
    const noVote = eventAttendanceRecords.filter(r => r.voteStatus === 'NO RESPONSE').length;

    const attRate = total > 0 ? (joined / total) * 100 : 0;
    const voteRate = total > 0 ? (totalVoted / total) * 100 : 0;

    return {
      total,
      voted: totalVoted,
      votedYes,
      votedNo,
      joined,
      flaked,
      noVote,
      attRate,
      voteRate,
    };
  }, [eventAttendanceRecords]);

  // Categorize members (Section 12)
  const categorizedRecords = useMemo(() => {
    return eventAttendanceRecords.filter(record => {
      const member = activeMembersMap.get(record.memberId);
      if (!member || member.status === 'Archived') return false;

      // Filter by search
      if (
        searchQuery &&
        !member.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Filter by category
      if (activeCategory === 'JOINED') {
        return record.attendanceStatus === 'JOINED';
      }
      if (activeCategory === 'FLAKED') {
        // Voted YES but didn't join!
        return record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';
      }
      if (activeCategory === 'NO_VOTE') {
        return record.voteStatus === 'NO RESPONSE';
      }
      return true;
    });
  }, [eventAttendanceRecords, activeMembersMap, activeCategory, searchQuery]);

  // Bulk actions executor (Section 22)
  const handleExecuteBulkAction = async () => {
    if (!currentEvent || !bulkActionType) return;

    if (bulkActionType === 'ALL_YES_JOINED') {
      const updates = eventAttendanceRecords
        .filter(r => r.voteStatus === 'YES')
        .map(r => ({ memberId: r.memberId, attendanceStatus: 'JOINED' as const }));
      await bulkUpdateAttendance(currentEvent.id, updates);
    } else if (bulkActionType === 'ALL_JOINED') {
      const updates = eventAttendanceRecords.map(r => ({
        memberId: r.memberId,
        attendanceStatus: 'JOINED' as const,
      }));
      await bulkUpdateAttendance(currentEvent.id, updates);
    } else if (bulkActionType === 'ALL_NO_VOTE') {
      const updates = eventAttendanceRecords.map(r => ({
        memberId: r.memberId,
        voteStatus: 'NO RESPONSE' as const,
      }));
      await bulkUpdateAttendance(currentEvent.id, updates);
    }

    setBulkActionType(null);
  };

  if (!currentEvent) {
    return (
      <div className="p-12 text-center text-stone-500 bg-[#141824] rounded-xl border border-[#524126]">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="font-fantasy font-bold text-lg text-stone-300">No Events Scheduled</p>
        <p className="text-xs">Create an alliance event first to manage attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Selector & Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#22171b] via-[#161a29] to-[#0f121d] border-2 border-[#ca8a04] shadow-[0_0_30px_rgba(202,138,4,0.2)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-fantasy font-bold uppercase tracking-wider text-[#ca8a04]">
                Event Attendance Command
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-bold uppercase">
                {currentEvent.status}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fef08a] tracking-wide">
                ⚔️ {currentEvent.eventType}
              </h1>
              <span className="text-sm font-semibold text-stone-300 font-sans">
                — {currentEvent.eventName}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>
                {new Date(currentEvent.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Event Picker Dropdown */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-fantasy font-bold uppercase text-stone-300 shrink-0">
              Select Event:
            </label>
            <select
              value={currentEvent.id}
              onChange={e => {
                sounds.playClick();
                setSelectedEventIdForAttendance(e.target.value);
              }}
              className="px-3 py-2 rounded-lg bg-[#0c0e16] border-2 border-[#ca8a04] text-[#fef08a] font-fantasy font-bold text-xs sm:text-sm focus:outline-none cursor-pointer"
            >
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.eventType} — {e.eventName} ({new Date(e.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Telemetry Summary Counters (Section 13) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-[#453820]">
          <div className="p-3 rounded-lg bg-[#0b0d14] border border-[#3f311c] text-center">
            <div className="text-[10px] font-fantasy uppercase text-stone-400">Total Roster</div>
            <div className="font-fantasy font-black text-xl text-[#fef08a] mt-0.5">{stats.total}</div>
          </div>

          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-center">
            <div className="text-[10px] font-fantasy uppercase text-blue-300">Voted YES</div>
            <div className="font-fantasy font-black text-xl text-blue-200 mt-0.5">{stats.votedYes}</div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-center">
            <div className="text-[10px] font-fantasy uppercase text-emerald-300">Joined War</div>
            <div className="font-fantasy font-black text-xl text-emerald-200 mt-0.5">{stats.joined}</div>
          </div>

          <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-center">
            <div className="text-[10px] font-fantasy uppercase text-red-300">Voted / Flaked</div>
            <div className="font-fantasy font-black text-xl text-red-200 mt-0.5">{stats.flaked}</div>
          </div>

          <div className="p-3 rounded-lg bg-stone-900/40 border border-stone-700/40 text-center">
            <div className="text-[10px] font-fantasy uppercase text-stone-400">Did Not Vote</div>
            <div className="font-fantasy font-black text-xl text-stone-300 mt-0.5">{stats.noVote}</div>
          </div>

          <div className="p-3 rounded-lg bg-[#1f1a10] border border-[#ca8a04]/60 text-center">
            <div className="text-[10px] font-fantasy uppercase text-[#ca8a04]">Attendance %</div>
            <div className="font-fantasy font-black text-xl text-[#fef08a] mt-0.5">
              {stats.attRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            percentage={stats.attRate}
            label="War Attendance Rate"
            subLabel={`${stats.joined} of ${stats.total} combatants present`}
            color={stats.attRate >= 75 ? 'emerald' : stats.attRate >= 50 ? 'gold' : 'crimson'}
            size="md"
          />
        </div>
      </div>

      {/* QUICK ATTENDANCE BULK CONTROLS (Section 22) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#141824] border border-[#524126] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ca8a04]" />
          <span className="text-xs font-fantasy font-bold uppercase text-[#fef08a]">
            Quick Roster Bulk Actions:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <GameButton
            variant="emerald"
            size="sm"
            onClick={() => setBulkActionType('ALL_YES_JOINED')}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Mark All YES as JOINED
          </GameButton>

          <GameButton
            variant="slate"
            size="sm"
            onClick={() => setBulkActionType('ALL_NO_VOTE')}
            icon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            Reset All to NO VOTE
          </GameButton>

          <GameButton
            variant="gold"
            size="sm"
            onClick={() => setBulkActionType('ALL_JOINED')}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Mark Everyone JOINED
          </GameButton>
        </div>
      </div>

      {/* CATEGORY TABS & SEARCH BAR (Section 12 & 13) */}
      <div className="p-3.5 rounded-xl bg-[#141824] border border-[#524126] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category breakdown filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'ALL'
                ? 'bg-[#ca8a04] text-[#1e1503] shadow-md'
                : 'bg-[#0c0e16] text-stone-300 hover:text-[#fef08a] border border-[#3f311c]'
            }`}
          >
            All Members ({stats.total})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('JOINED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'JOINED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#0c0e16] text-emerald-400 hover:bg-emerald-950/40 border border-emerald-800/60'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>🟢 Joined ({stats.joined})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('FLAKED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'FLAKED'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#0c0e16] text-amber-400 hover:bg-amber-950/40 border border-amber-800/60'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>🟡 Voted but Didn&apos;t Join ({stats.flaked})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('NO_VOTE');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'NO_VOTE'
                ? 'bg-red-700 text-white shadow-md'
                : 'bg-[#0c0e16] text-red-400 hover:bg-red-950/40 border border-red-800/60'
            }`}
          >
            <X className="w-3 h-3" />
            <span>🔴 Didn&apos;t Vote ({stats.noVote})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0c0e16] border border-[#3f311c] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
          />
        </div>
      </div>

      {/* ATTENDANCE ROSTER TABLE (Sections 11 & 22) */}
      <div className="rounded-xl bg-gradient-to-b from-[#181d2a] to-[#10131d] border-[1.5px] border-[#524126] shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#0b0d14] text-[#fef08a] font-fantasy uppercase text-xs tracking-wider border-b border-[#524126]">
            <tr>
              <th className="py-3 px-4">Alliance Member</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Vote Status</th>
              <th className="py-3 px-4">Attendance Status</th>
              <th className="py-3 px-4 text-right">Discipline / Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2417] text-stone-200">
            {categorizedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-stone-500">
                  <p className="font-fantasy font-bold text-stone-300">
                    No members match this attendance category
                  </p>
                </td>
              </tr>
            ) : (
              categorizedRecords.map(record => {
                const member = activeMembersMap.get(record.memberId);
                if (!member) return null;

                const isFlaked =
                  record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';

                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-[#1e2333]/80 transition-colors ${
                      isFlaked ? 'bg-red-950/15' : ''
                    }`}
                  >
                    {/* Member */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="cursor-pointer"
                      >
                        <span className="font-fantasy font-bold text-stone-100 hover:text-[#fef08a] transition-colors text-sm">
                          {member.name}
                        </span>
                        {isFlaked && (
                          <span className="block text-[11px] text-red-400 font-bold font-sans">
                            ⚠️ Flaked: Voted YES but absent!
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    {/* Quick Vote Controls (Section 11 & 22) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'YES')}
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                            record.voteStatus === 'YES'
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300'
                              : 'bg-[#10131d] text-stone-400 hover:text-emerald-300 border border-[#3b311c]'
                          }`}
                        >
                          YES
                        </button>

                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'NO')}
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                            record.voteStatus === 'NO'
                              ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-300'
                              : 'bg-[#10131d] text-stone-400 hover:text-red-300 border border-[#3b311c]'
                          }`}
                        >
                          NO
                        </button>

                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'NO RESPONSE')}
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                            record.voteStatus === 'NO RESPONSE'
                              ? 'bg-stone-700 text-stone-100 shadow-sm'
                              : 'bg-[#10131d] text-stone-500 hover:text-stone-300 border border-[#3b311c]'
                          }`}
                        >
                          NO VOTE
                        </button>
                      </div>
                    </td>

                    {/* Quick Attendance Controls (Section 11 & 22) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateAttendance(currentEvent.id, member.id, 'JOINED')}
                          className={`px-2.5 py-1 rounded font-fantasy text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                            record.attendanceStatus === 'JOINED'
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400'
                              : 'bg-[#10131d] text-stone-400 hover:text-emerald-300 border border-[#3b311c]'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>JOINED</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateAttendance(currentEvent.id, member.id, 'DIDNT_JOIN')}
                          className={`px-2.5 py-1 rounded font-fantasy text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                            record.attendanceStatus === 'DIDNT_JOIN'
                              ? 'bg-gradient-to-r from-red-700 to-red-800 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] ring-1 ring-red-400'
                              : 'bg-[#10131d] text-stone-400 hover:text-red-300 border border-[#3b311c]'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          <span>DIDN&apos;T JOIN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateAttendance(currentEvent.id, member.id, 'NOT_APPLICABLE')}
                          className={`p-1 rounded transition-all cursor-pointer ${
                            record.attendanceStatus === 'NOT_APPLICABLE'
                              ? 'text-stone-300 bg-stone-800'
                              : 'text-stone-600 hover:text-stone-400'
                          }`}
                          title="Mark absent / not applicable"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Discipline Strike Shortcut & Dossier Link */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click Strike button for flaking (Section 16) */}
                        {isFlaked && (
                          <GameButton
                            variant="crimson"
                            size="sm"
                            onClick={() =>
                              onOpenAddStrike(
                                member,
                                `Missed ${currentEvent.eventType} after voting YES`
                              )
                            }
                            icon={<Flame className="w-3 h-3" />}
                          >
                            Strike
                          </GameButton>
                        )}

                        <StrikeBadge
                          count={member.strikes}
                          size="sm"
                          onClick={() => setSelectedMemberForProfile(member)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog for Bulk Operations (Section 31) */}
      <ConfirmModal
        isOpen={Boolean(bulkActionType)}
        onClose={() => setBulkActionType(null)}
        onConfirm={handleExecuteBulkAction}
        title="⚠️ Confirm Bulk Attendance Action"
        message={
          <div>
            {bulkActionType === 'ALL_YES_JOINED' && (
              <p>
                Mark all members who voted <strong>YES</strong> ({stats.votedYes} warriors) as{' '}
                <strong className="text-emerald-400">JOINED</strong> for {currentEvent.eventName}?
              </p>
            )}
            {bulkActionType === 'ALL_JOINED' && (
              <p>
                Mark all <strong>{stats.total} alliance members</strong> as{' '}
                <strong className="text-emerald-400">JOINED</strong> for {currentEvent.eventName}?
              </p>
            )}
            {bulkActionType === 'ALL_NO_VOTE' && (
              <p>
                Reset voting status for all members to{' '}
                <strong className="text-stone-300">NO VOTE</strong>?
              </p>
            )}
          </div>
        }
        confirmLabel="Confirm Bulk Update"
        variant="gold"
      />
    </div>
  );
};
