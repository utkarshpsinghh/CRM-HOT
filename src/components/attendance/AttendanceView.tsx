import React, { useState, useMemo } from 'react';
import { Member } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { RankBadge } from '../common/RankBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Check,
  X,
  Minus,
  Search,
  Flame,
  CheckCircle2,
  Eye,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  Filter,
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

  const { isMainAdmin } = useAuth();

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
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('rank_desc');
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

  // Overall event statistics
  const stats = useMemo(() => {
    const total = eventAttendanceRecords.length;
    const votedYes = eventAttendanceRecords.filter(r => r.voteStatus === 'YES').length;
    const votedNo = eventAttendanceRecords.filter(r => r.voteStatus === 'NO').length;
    const joined = eventAttendanceRecords.filter(r => r.attendanceStatus === 'JOINED').length;
    const flaked = eventAttendanceRecords.filter(
      r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
    ).length;
    const noVote = eventAttendanceRecords.filter(r => r.voteStatus === 'NO RESPONSE').length;
    const attRate = total > 0 ? (joined / total) * 100 : 0;

    return { total, votedYes, votedNo, joined, flaked, noVote, attRate };
  }, [eventAttendanceRecords]);

  // Filter and sort records
  const categorizedRecords = useMemo(() => {
    const list = eventAttendanceRecords.filter(record => {
      const member = activeMembersMap.get(record.memberId);
      if (!member || member.status === 'Archived') return false;

      // Search filter
      if (searchQuery.trim() && !member.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }

      // Rank filter
      if (rankFilter !== 'ALL') {
        if (rankFilter === 'Visitor') {
          if (member.status !== 'Visitor') return false;
        } else {
          if (member.currentRank !== rankFilter) return false;
        }
      }

      // Category tab
      if (activeCategory === 'JOINED') return record.attendanceStatus === 'JOINED';
      if (activeCategory === 'FLAKED') return record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';
      if (activeCategory === 'NO_VOTE') return record.voteStatus === 'NO RESPONSE';
      return true;
    });

    const rankWeights: Record<string, number> = { R5: 5, R4: 4, R3: 3, R2: 2, R1: 1 };

    list.sort((a, b) => {
      const mA = activeMembersMap.get(a.memberId);
      const mB = activeMembersMap.get(b.memberId);
      if (!mA || !mB) return 0;

      if (sortBy === 'name_asc') {
        return mA.name.localeCompare(mB.name);
      }
      if (sortBy === 'name_desc') {
        return mB.name.localeCompare(mA.name);
      }
      if (sortBy === 'attendance') {
        const attOrder: Record<string, number> = { JOINED: 3, DIDNT_JOIN: 2, NOT_APPLICABLE: 1 };
        const diff = (attOrder[b.attendanceStatus] || 0) - (attOrder[a.attendanceStatus] || 0);
        if (diff !== 0) return diff;
        return mA.name.localeCompare(mB.name);
      }
      if (sortBy === 'vote') {
        const voteOrder: Record<string, number> = { YES: 3, NO: 2, 'NO RESPONSE': 1 };
        const diff = (voteOrder[b.voteStatus] || 0) - (voteOrder[a.voteStatus] || 0);
        if (diff !== 0) return diff;
        return mA.name.localeCompare(mB.name);
      }

      // Default: rank_desc (R5 -> R1, then alphabetical)
      const rA = rankWeights[mA.currentRank] || 0;
      const rB = rankWeights[mB.currentRank] || 0;
      if (rA !== rB) return rB - rA;
      return mA.name.localeCompare(mB.name);
    });

    return list;
  }, [eventAttendanceRecords, activeMembersMap, activeCategory, searchQuery, rankFilter, sortBy]);

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
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#20150f] via-[#1a110b] to-[#20150f] border border-[#4d2b14] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
              Event Attendance
            </span>
            {!isMainAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <Eye className="w-3 h-3 text-amber-400" />
                <span>Officer View-Only</span>
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                currentEvent.status === 'Completed'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                  : currentEvent.status === 'Live'
                  ? 'bg-red-950/70 text-red-200 border-red-500 animate-pulse'
                  : 'bg-blue-950/70 text-blue-300 border-blue-700'
              }`}
            >
              {currentEvent.status}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-fantasy font-black text-[#fffbeb] tracking-tight">
            {currentEvent.eventType} — {currentEvent.eventName}
          </h1>

          <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#ca8a04]" />
              {safeFormatDate(currentEvent.date)}
            </span>
            <span>•</span>
            <span>
              {stats.joined} / {stats.total} joined ({stats.attRate.toFixed(0)}% turnout)
            </span>
            {stats.flaked > 0 && (
              <>
                <span>•</span>
                <span className="text-red-400 font-semibold">
                  {stats.flaked} missed after YES
                </span>
              </>
            )}
          </div>
        </div>

        {/* Event Switcher & Bulk Action (MainAdmin Only) */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={currentEvent.id}
            onChange={e => {
              sounds.playClick();
              setSelectedEventIdForAttendance(e.target.value);
            }}
            aria-label="Select Event"
            className="flex-1 sm:flex-initial min-w-[180px] px-3 py-2 rounded-xl bg-[#140c08] border border-[#3d200e] text-[#fbbf24] font-semibold text-xs focus:outline-none focus:border-[#ca8a04] cursor-pointer"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.eventType} ({safeFormatDate(e.date, { month: 'numeric', day: 'numeric' })})
              </option>
            ))}
          </select>

          {isMainAdmin && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="btn-kingshot-gold px-3.5 py-2 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial min-w-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mark All YES as Joined</span>
            </button>
          )}
        </div>
      </div>

      {/* Turnout Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {/* Turnout Rate */}
        <div className="p-3 rounded-xl bg-[#1c130d] border border-[#3e2716] flex flex-col justify-between">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Turnout Rate</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-fantasy text-[#fbbf24]">{stats.attRate.toFixed(0)}%</span>
            <span className="text-xs text-stone-400 font-mono">{stats.joined}/{stats.total}</span>
          </div>
          <div className="w-full bg-[#120a06] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, stats.attRate)}%` }}
            />
          </div>
        </div>

        {/* Joined */}
        <div className="p-3 rounded-xl bg-[#1c130d] border border-[#3e2716]">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Joined
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-fantasy text-emerald-400">{stats.joined}</span>
            <span className="text-[11px] text-stone-400">Warriors</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Attended battle</p>
        </div>

        {/* Voted YES */}
        <div className="p-3 rounded-xl bg-[#1c130d] border border-[#3e2716]">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Voted YES
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-fantasy text-blue-300">{stats.votedYes}</span>
            <span className="text-[11px] text-stone-400">Pledged</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Committed in poll</p>
        </div>

        {/* Flaked */}
        <div className="p-3 rounded-xl bg-[#1c130d] border border-[#3e2716]">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Flaked
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-fantasy text-red-400">{stats.flaked}</span>
            <span className="text-[11px] text-red-400/80">Alert</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Voted YES, did not join</p>
        </div>

        {/* No Vote */}
        <div className="p-3 rounded-xl bg-[#1c130d] border border-[#3e2716] col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stone-500 inline-block" /> No Vote
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-fantasy text-stone-300">{stats.noVote}</span>
            <span className="text-[11px] text-stone-400">Silent</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">No response to poll</p>
        </div>
      </div>

      {/* Filter, Search & Sort Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-[#1c130d] border border-[#3e2716] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-all ${
              activeCategory === 'ALL'
                ? 'btn-kingshot-gold text-[#1a120b] shadow-sm'
                : 'bg-[#140c08] border border-[#2d1b11] text-stone-300 hover:text-white'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('JOINED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-all ${
              activeCategory === 'JOINED'
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-sm'
                : 'bg-[#140c08] border border-[#2d1b11] text-emerald-400 hover:text-emerald-300'
            }`}
          >
            Joined ({stats.joined})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('FLAKED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-all ${
              activeCategory === 'FLAKED'
                ? 'bg-red-700 text-white border border-red-400 shadow-sm'
                : 'bg-[#140c08] border border-[#2d1b11] text-red-400 hover:text-red-300'
            }`}
          >
            Missed after YES ({stats.flaked})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('NO_VOTE');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-all ${
              activeCategory === 'NO_VOTE'
                ? 'bg-stone-700 text-white border border-stone-500 shadow-sm'
                : 'bg-[#140c08] border border-[#2d1b11] text-stone-400 hover:text-white'
            }`}
          >
            No Vote ({stats.noVote})
          </button>
        </div>

        {/* Search, Rank Filter & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search member..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#140c08] border border-[#2d1b11] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
            />
          </div>

          {/* Rank Filter */}
          <div className="relative">
            <select
              value={rankFilter}
              onChange={e => {
                sounds.playClick();
                setRankFilter(e.target.value);
              }}
              aria-label="Filter by Rank"
              className="px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#2d1b11] text-stone-300 font-medium text-xs focus:outline-none focus:border-[#ca8a04] cursor-pointer"
            >
              <option value="ALL">All Ranks</option>
              <option value="R5">Rank R5</option>
              <option value="R4">Rank R4</option>
              <option value="R3">Rank R3</option>
              <option value="R2">Rank R2</option>
              <option value="R1">Rank R1</option>
              <option value="Visitor">Visitors</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => {
                sounds.playClick();
                setSortBy(e.target.value);
              }}
              aria-label="Sort by"
              className="px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#2d1b11] text-[#fbbf24] font-semibold text-xs focus:outline-none focus:border-[#ca8a04] cursor-pointer"
            >
              <option value="rank_desc">Rank (High → Low)</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="attendance">Turnout (Joined first)</option>
              <option value="vote">Vote (YES first)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE ATTENDANCE CARDS (< md) */}
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

                {/* SubAdmin View-Only Card Mode */}
                {!isMainAdmin ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Vote Cast Badge */}
                      <div className="p-2 rounded-xl bg-[#140c08] border border-[#3d200e] flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Vote Cast</span>
                        <div>
                          {record.voteStatus === 'YES' && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <Check className="w-3.5 h-3.5" /> YES
                            </span>
                          )}
                          {record.voteStatus === 'NO' && (
                            <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                              <X className="w-3.5 h-3.5" /> NO
                            </span>
                          )}
                          {record.voteStatus === 'NO RESPONSE' && (
                            <span className="inline-flex items-center gap-1 text-stone-500 font-medium">
                              <Minus className="w-3 h-3" /> No Vote
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attendance Badge */}
                      <div className="p-2 rounded-xl bg-[#140c08] border border-[#3d200e] flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Attendance</span>
                        <div>
                          {record.attendanceStatus === 'JOINED' && (
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Joined Battle
                            </span>
                          )}
                          {record.attendanceStatus === 'DIDNT_JOIN' && (
                            <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                              <X className="w-3.5 h-3.5" /> Missed
                            </span>
                          )}
                          {record.attendanceStatus === 'NOT_APPLICABLE' && (
                            <span className="inline-flex items-center gap-1 text-stone-500 font-medium">
                              Unrecorded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isFlaked && (
                      <div className="p-2 rounded-xl bg-red-950/50 border border-red-700/60 text-xs text-red-200 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Member voted YES but missed battle</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* MainAdmin Interactive Card Mode */
                  <>
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
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP ATTENDANCE TABLE (Hidden on screens < md) */}
      <div className="hidden md:block rounded-xl bg-[#20150f] border border-[#4d2b14] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#170e09] text-stone-300 font-semibold text-xs border-b border-[#3d200e]">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Vote Cast</th>
              <th className="py-3 px-4">Attendance Status</th>
              <th className="py-3 px-4 text-right">
                {isMainAdmin ? 'Action' : 'Outcome'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a170b] text-stone-200">
            {categorizedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-400">
                  No members match the current filter or search criteria.
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

                    {/* Vote Column */}
                    <td className="py-3 px-4">
                      {isMainAdmin ? (
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
                      ) : (
                        /* SubAdmin View-Only Badge */
                        <div>
                          {record.voteStatus === 'YES' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 font-bold text-xs">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>YES</span>
                            </span>
                          )}
                          {record.voteStatus === 'NO' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-600/60 text-red-300 font-bold text-xs">
                              <X className="w-3.5 h-3.5 text-red-400" />
                              <span>NO</span>
                            </span>
                          )}
                          {record.voteStatus === 'NO RESPONSE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700/60 text-stone-400 text-xs font-semibold">
                              <Minus className="w-3 h-3" />
                              <span>No Vote</span>
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Attendance Column */}
                    <td className="py-3 px-4">
                      {isMainAdmin ? (
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
                      ) : (
                        /* SubAdmin View-Only Badge */
                        <div>
                          {record.attendanceStatus === 'JOINED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-200 font-bold text-xs shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Joined Battle</span>
                            </span>
                          )}
                          {record.attendanceStatus === 'DIDNT_JOIN' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/80 border border-red-600 text-red-200 font-bold text-xs shadow-sm">
                              <X className="w-3.5 h-3.5 text-red-400" />
                              <span>Missed</span>
                            </span>
                          )}
                          {record.attendanceStatus === 'NOT_APPLICABLE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-500 text-xs">
                              Unrecorded
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Right Column: Strike Action for Admin, Outcome Status for SubAdmin */}
                    <td className="py-3 px-4 text-right">
                      {isMainAdmin ? (
                        isFlaked ? (
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
                        )
                      ) : (
                        /* SubAdmin Outcome Column */
                        isFlaked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 text-red-200 border border-red-500 text-[11px] font-bold">
                            ⚠️ Missed after YES
                          </span>
                        ) : record.attendanceStatus === 'JOINED' ? (
                          <span className="text-xs font-bold text-emerald-400/90">
                            Attended Battle
                          </span>
                        ) : (
                          <span className="text-stone-500 text-xs">—</span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog for Bulk Mark as Joined */}
      {isMainAdmin && (
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
      )}
    </div>
  );
};
