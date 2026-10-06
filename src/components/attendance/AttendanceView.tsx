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
  RefreshCw,
  CheckCheck,
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
    syncGoogleSheetAttendance,
    isSyncing,
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

  // Filtered & sorted attendance list
  const categorizedRecords = useMemo(() => {
    const list = eventAttendanceRecords.filter(record => {
      const member = activeMembersMap.get(record.memberId);
      if (!member) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!member.name.toLowerCase().includes(q)) return false;
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

      // Default: rank_desc
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
      <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
        No events created yet. Create an event to record attendance.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Event Header & Selector */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
              War Attendance
            </span>
            {!isMainAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                <Eye className="w-3 h-3 text-slate-400" />
                <span>Officer View-Only</span>
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase border ${
                currentEvent.status === 'Completed'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : currentEvent.status === 'Live'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              }`}
            >
              {currentEvent.status}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            {currentEvent.eventType} — {currentEvent.eventName}
          </h1>

          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {safeFormatDate(currentEvent.date)}
            </span>
          </div>
        </div>

        {/* Event Select Dropdown & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <select
            value={currentEvent.id}
            onChange={e => {
              sounds.playClick();
              setSelectedEventIdForAttendance(e.target.value);
            }}
            aria-label="Select War Event"
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-medium text-xs focus:outline-none focus:border-amber-500 cursor-pointer flex-1 sm:flex-initial"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.eventType} - {e.eventName}
              </option>
            ))}
          </select>

          {isMainAdmin && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowBulkConfirm(true);
              }}
              disabled={stats.votedYes === 0}
              className="btn-primary px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
              title="Automatically mark all members who voted YES as Joined"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark YES as Joined</span>
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              sounds.playClick();
              await syncGoogleSheetAttendance(currentEvent.id);
            }}
            disabled={isSyncing}
            className="btn-secondary px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Import live attendance and votes from Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Sheet</span>
          </button>
        </div>
      </div>

      {/* Turnout Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Turnout Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Turnout Rate</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">{stats.attRate.toFixed(0)}%</span>
            <span className="text-xs text-slate-400 font-mono font-medium">{stats.joined}/{stats.total}</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, stats.attRate)}%` }}
            />
          </div>
        </div>

        {/* Joined */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Joined
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">{stats.joined}</span>
            <span className="text-xs text-slate-400 font-medium">Members</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Present in battle</p>
        </div>

        {/* Voted YES */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-sky-500/30">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Voted YES
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-sky-400">{stats.votedYes}</span>
            <span className="text-xs text-slate-400 font-medium">Pledged</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed in poll</p>
        </div>

        {/* Flaked */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/30">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Missed after YES
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">{stats.flaked}</span>
            <span className="text-xs text-slate-400 font-medium">Flaked</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Voted YES, absent</p>
        </div>

        {/* No Vote */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> No Vote
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-300">{stats.noVote}</span>
            <span className="text-xs text-slate-400 font-medium">Silent</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">No poll response</p>
        </div>
      </div>

      {/* Filter, Search & Sort Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeCategory === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Members ({stats.total})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('JOINED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeCategory === 'JOINED'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-emerald-400 hover:text-emerald-300'
            }`}
          >
            Joined ({stats.joined})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('FLAKED');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeCategory === 'FLAKED'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-rose-400 hover:text-rose-300'
            }`}
          >
            Flaked ({stats.flaked})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveCategory('NO_VOTE');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              activeCategory === 'NO_VOTE'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            No Vote ({stats.noVote})
          </button>
        </div>

        {/* Search, Rank Filter & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search member..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
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
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
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
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-medium text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="rank_desc">Rank (High to Low)</option>
              <option value="name_asc">Name (A to Z)</option>
              <option value="name_desc">Name (Z to A)</option>
              <option value="attendance">Turnout (Joined first)</option>
              <option value="vote">Vote (YES first)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE ATTENDANCE CARDS (< md) */}
      <div className="block md:hidden space-y-3">
        {categorizedRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
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
                className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                  isFlaked ? 'border-rose-500/50 bg-rose-500/10' : 'border-slate-800 bg-slate-900/80'
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
                      className="font-semibold text-sm text-slate-100 hover:text-amber-400 cursor-pointer truncate"
                    >
                      {member.name}
                    </span>
                    <RankBadge rank={member.currentRank} size="sm" />
                    {member.status === 'Visitor' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/50 font-semibold shrink-0">
                        Visitor
                      </span>
                    )}
                  </div>

                  {isFlaked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shrink-0 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Flaked</span>
                    </span>
                  )}
                </div>

                {/* SubAdmin View-Only Card Mode */}
                {!isMainAdmin ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Vote Cast Badge */}
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vote Cast</span>
                        <div>
                          {record.voteStatus === 'YES' && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <Check className="w-3.5 h-3.5" /> YES
                            </span>
                          )}
                          {record.voteStatus === 'NO' && (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                              <X className="w-3.5 h-3.5" /> NO
                            </span>
                          )}
                          {record.voteStatus === 'NO RESPONSE' && (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              <Minus className="w-3 h-3" /> No Vote
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attendance Badge */}
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attendance</span>
                        <div>
                          {record.attendanceStatus === 'JOINED' && (
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Joined
                            </span>
                          )}
                          {record.attendanceStatus === 'DIDNT_JOIN' && (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                              <X className="w-3.5 h-3.5" /> Missed
                            </span>
                          )}
                          {record.attendanceStatus === 'NOT_APPLICABLE' && (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              Unrecorded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isFlaked && (
                      <div className="space-y-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenAddStrike(
                              member,
                              `Missed ${currentEvent.eventType} after voting YES`
                            )
                          }
                          className="w-full py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-500/30 transition-colors"
                        >
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>Issue Penalty Strike</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* MainAdmin Interactive Card Mode */
                  <>
                    {/* Vote Row */}
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">Vote Cast:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'YES')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            record.voteStatus === 'YES'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'NO')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            record.voteStatus === 'NO'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          NO
                        </button>
                        <button
                          type="button"
                          onClick={() => updateVote(currentEvent.id, member.id, 'NO RESPONSE')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            record.voteStatus === 'NO RESPONSE'
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-slate-900 text-slate-500 hover:text-white'
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
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                          record.attendanceStatus === 'JOINED'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
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
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                          record.attendanceStatus === 'DIDNT_JOIN'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-300'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
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
                          className="w-full py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-500/30 transition-colors"
                        >
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
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
      <div className="hidden md:block rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950 text-slate-400 font-semibold text-xs border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Vote Cast</th>
              <th className="py-3 px-4">Attendance Status</th>
              <th className="py-3 px-4 text-right">
                Action / Penalty
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {categorizedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
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
                    className={`hover:bg-slate-800/40 transition-colors ${isFlaked ? 'bg-rose-500/5' : ''}`}
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="font-semibold text-slate-100 hover:text-amber-400 cursor-pointer"
                        >
                          {member.name}
                        </span>
                        {member.status === 'Visitor' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/50 font-semibold shrink-0">
                            Visitor
                          </span>
                        )}
                      </div>
                      {isFlaked && (
                        <span className="block text-[11px] text-rose-400 font-medium">
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
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                              record.voteStatus === 'YES'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVote(currentEvent.id, member.id, 'NO')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                              record.voteStatus === 'NO'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            NO
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVote(currentEvent.id, member.id, 'NO RESPONSE')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                              record.voteStatus === 'NO RESPONSE'
                                ? 'bg-slate-700 text-slate-200'
                                : 'bg-slate-950 text-slate-500 hover:text-white border border-slate-800'
                            }`}
                          >
                            —
                          </button>
                        </div>
                      ) : (
                        /* SubAdmin View-Only Badge */
                        <div>
                          {record.voteStatus === 'YES' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>YES</span>
                            </span>
                          )}
                          {record.voteStatus === 'NO' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                              <X className="w-3.5 h-3.5 text-rose-400" />
                              <span>NO</span>
                            </span>
                          )}
                          {record.voteStatus === 'NO RESPONSE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs font-medium">
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
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                              record.attendanceStatus === 'JOINED'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
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
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                              record.attendanceStatus === 'DIDNT_JOIN'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Joined</span>
                            </span>
                          )}
                          {record.attendanceStatus === 'DIDNT_JOIN' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                              <X className="w-3.5 h-3.5 text-rose-400" />
                              <span>Missed</span>
                            </span>
                          )}
                          {record.attendanceStatus === 'NOT_APPLICABLE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-500 text-xs">
                              Unrecorded
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Right Column: Strike Action / Outcome Status */}
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
                          className="px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                          title="Issue Penalty Strike"
                        >
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>Issue Strike</span>
                        </button>
                      ) : record.attendanceStatus === 'JOINED' ? (
                        <span className="text-xs font-semibold text-emerald-400">
                          Attended
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
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
