import React, { useState, useMemo } from 'react';
import {
  Member,
} from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ProgressBar } from '../common/ProgressBar';
import { GameButton } from '../common/GameButton';
import { ConfirmModal } from '../common/ConfirmModal';
import { calculateMemberParticipation } from '../../utils/participation';
import {
  BarChart3,
  Calendar,
  Check,
  X,
  Minus,
  Search,
  Flame,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Table,
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

  // Mode: "event_roster" (single event) vs "matrix" (all events & member participation %)
  const [viewMode, setViewMode] = useState<'event_roster' | 'matrix'>('event_roster');

  // Active event selection (default to selectedEventIdForAttendance, or latest event)
  const currentEventId = selectedEventIdForAttendance || events[events.length - 1]?.id || '';
  const currentEvent = events.find(e => e.id === currentEventId) || events[0];

  // Category view tabs
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

  // Pre-calculate participation stats for each member
  const memberParticipationMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateMemberParticipation>>();
    members.forEach(m => {
      map.set(m.id, calculateMemberParticipation(m.id, events, attendance));
    });
    return map;
  }, [members, events, attendance]);

  // Current event attendance rows
  const eventAttendanceRecords = useMemo(() => {
    if (!currentEvent) return [];
    return attendance.filter(a => a.eventId === currentEvent.id);
  }, [attendance, currentEvent]);

  // Statistics calculation for this event
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

  // Categorize members
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
        return record.voteStatus === 'YES' && record.attendanceStatus === 'DIDNT_JOIN';
      }
      if (activeCategory === 'NO_VOTE') {
        return record.voteStatus === 'NO RESPONSE';
      }
      return true;
    });
  }, [eventAttendanceRecords, activeMembersMap, activeCategory, searchQuery]);

  // Filter members for matrix view
  const matrixMembers = useMemo(() => {
    return members
      .filter(m => m.status !== 'Archived')
      .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const pA = memberParticipationMap.get(a.id)?.percentage || 0;
        const pB = memberParticipationMap.get(b.id)?.percentage || 0;
        return pB - pA; // Highest participation first
      });
  }, [members, searchQuery, memberParticipationMap]);

  // Bulk actions executor
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
      <div className="p-12 text-center text-stone-500 bg-[#2a1408] rounded-xl border border-[#54290d]">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50 text-[#fbbf24]" />
        <p className="font-kingshot text-lg text-stone-200">No Events Scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Switch between Single Event View and Full Participation Matrix */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#fbbf24]" />
            <h1 className="font-kingshot text-2xl sm:text-3xl text-[#fffbeb] tracking-wide drop-shadow-md">
              War Attendance &amp; Participation
            </h1>
          </div>
          <p className="text-xs text-stone-300 mt-0.5">
            Single-click vote recording, attendance tracking, and individual member participation percentages.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playClick();
              setViewMode('event_roster');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'event_roster'
                ? 'btn-kingshot-gold text-[#381a07]'
                : 'btn-kingshot-brown'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Single Event Roster</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setViewMode('matrix');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'matrix'
                ? 'btn-kingshot-gold text-[#381a07]'
                : 'btn-kingshot-brown'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Member Participation Matrix</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SINGLE EVENT ATTENDANCE LEDGER */}
      {/* ========================================================================= */}
      {viewMode === 'event_roster' && (
        <div className="space-y-5">
          {/* Event Selector & Header Banner */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#311608] via-[#241005] to-[#1c0c04] border-2 border-[#ca8a04] shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                    Active Event
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-bold uppercase">
                    {currentEvent.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-kingshot text-2xl sm:text-3xl text-[#fffbeb] tracking-wide">
                    ⚔️ {currentEvent.eventType}
                  </h2>
                  <span className="text-sm font-semibold text-stone-300">
                    — {currentEvent.eventName}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#fbbf24]" />
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
                <label className="text-xs font-bold uppercase text-stone-300 shrink-0">
                  Select Event:
                </label>
                <select
                  value={currentEvent.id}
                  onChange={e => {
                    sounds.playClick();
                    setSelectedEventIdForAttendance(e.target.value);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#140802] border-2 border-[#ca8a04] text-[#fef08a] font-bold text-xs sm:text-sm focus:outline-none cursor-pointer"
                >
                  {events.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.eventType} — {e.eventName} ({new Date(e.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Telemetry Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-[#4d2309]">
              <div className="p-3 rounded-lg bg-[#140802] border border-[#451f08] text-center">
                <div className="text-[10px] font-bold uppercase text-stone-400">Total Roster</div>
                <div className="font-kingshot text-xl text-[#fef08a] mt-0.5">{stats.total}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e1d38] border border-[#1d4ed8]/50 text-center">
                <div className="text-[10px] font-bold uppercase text-blue-300">Voted YES</div>
                <div className="font-kingshot text-xl text-blue-200 mt-0.5">{stats.votedYes}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0a2717] border border-[#15803d]/50 text-center">
                <div className="text-[10px] font-bold uppercase text-emerald-300">Joined War</div>
                <div className="font-kingshot text-xl text-emerald-200 mt-0.5">{stats.joined}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#2b0e0e] border border-[#b91c1c]/50 text-center">
                <div className="text-[10px] font-bold uppercase text-red-300">Voted / Flaked</div>
                <div className="font-kingshot text-xl text-red-200 mt-0.5">{stats.flaked}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#1a0e06] border border-[#4d2309] text-center">
                <div className="text-[10px] font-bold uppercase text-stone-400">Did Not Vote</div>
                <div className="font-kingshot text-xl text-stone-300 mt-0.5">{stats.noVote}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#271507] border border-[#ca8a04]/60 text-center">
                <div className="text-[10px] font-bold uppercase text-[#ca8a04]">Attendance %</div>
                <div className="font-kingshot text-xl text-[#fef08a] mt-0.5">
                  {stats.attRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-4">
              <ProgressBar
                percentage={stats.attRate}
                label="Event Attendance Turnout"
                subLabel={`${stats.joined} of ${stats.total} combatants present`}
                color={stats.attRate >= 75 ? 'emerald' : stats.attRate >= 50 ? 'gold' : 'crimson'}
                size="md"
              />
            </div>
          </div>

          {/* Quick Bulk Controls */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#2a1408] border-2 border-[#54290d] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-xs font-bold uppercase text-[#fef08a]">
                Quick Roster Bulk Actions:
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setBulkActionType('ALL_YES_JOINED')}
                className="btn-kingshot-gold px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark All YES as JOINED</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkActionType('ALL_NO_VOTE')}
                className="btn-kingshot-brown px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Reset to NO VOTE</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkActionType('ALL_JOINED')}
                className="btn-kingshot-cream px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Everyone JOINED</span>
              </button>
            </div>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="p-3.5 rounded-xl bg-[#2a1408] border-2 border-[#54290d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => {
                  sounds.playClick();
                  setActiveCategory('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === 'ALL'
                    ? 'btn-kingshot-gold text-[#381a07]'
                    : 'bg-[#140802] text-stone-300 hover:text-[#fef08a] border border-[#451f08]'
                }`}
              >
                All Members ({stats.total})
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setActiveCategory('JOINED');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'JOINED'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[#140802] text-emerald-400 hover:bg-emerald-950/40 border border-emerald-800/60'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'FLAKED'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-[#140802] text-amber-400 hover:bg-amber-950/40 border border-amber-800/60'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'NO_VOTE'
                    ? 'bg-red-700 text-white shadow-md'
                    : 'bg-[#140802] text-red-400 hover:bg-red-950/40 border border-red-800/60'
                }`}
              >
                <X className="w-3 h-3" />
                <span>🔴 Didn&apos;t Vote ({stats.noVote})</span>
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search member..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#140802] border border-[#52290d] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
              />
            </div>
          </div>

          {/* Roster Table with Overall Member Participation Rate shown */}
          <div className="rounded-xl bg-[#281307] border-2 border-[#572b0f] shadow-xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#1c0c04] text-[#fef08a] font-kingshot uppercase text-xs tracking-wider border-b-2 border-[#542d13]">
                <tr>
                  <th className="py-3 px-4">Alliance Member</th>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Lifetime Participation %</th>
                  <th className="py-3 px-4">Vote Status</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4 text-right">Discipline / Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d1d0a] text-stone-200">
                {categorizedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500">
                      <p className="font-kingshot text-lg text-stone-300">
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

                    const partStats = memberParticipationMap.get(member.id);
                    const partPct = partStats ? partStats.percentage : 0;

                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-[#381a09]/90 transition-colors ${
                          isFlaked ? 'bg-red-950/20' : ''
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
                            <span className="font-bold text-stone-100 hover:text-[#fef08a] transition-colors text-sm">
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

                        {/* Total Percentage Member Participated */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-xs ${
                                partPct >= 75
                                  ? 'text-emerald-400'
                                  : partPct >= 50
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {partPct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({partStats?.joinedCount}/{partStats?.totalEvents})
                            </span>
                          </div>
                        </td>

                        {/* Quick Vote Controls */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateVote(currentEvent.id, member.id, 'YES')}
                              className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                                record.voteStatus === 'YES'
                                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300'
                                  : 'bg-[#140802] text-stone-400 hover:text-emerald-300 border border-[#451f08]'
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
                                  : 'bg-[#140802] text-stone-400 hover:text-red-300 border border-[#451f08]'
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
                                  : 'bg-[#140802] text-stone-500 hover:text-stone-300 border border-[#451f08]'
                              }`}
                            >
                              NO VOTE
                            </button>
                          </div>
                        </td>

                        {/* Quick Attendance Controls */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateAttendance(currentEvent.id, member.id, 'JOINED')}
                              className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                                record.attendanceStatus === 'JOINED'
                                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-300'
                                  : 'bg-[#140802] text-stone-400 hover:text-emerald-300 border border-[#451f08]'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>JOINED</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateAttendance(currentEvent.id, member.id, 'DIDNT_JOIN')}
                              className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                                record.attendanceStatus === 'DIDNT_JOIN'
                                  ? 'bg-red-700 text-white shadow-md ring-1 ring-red-300'
                                  : 'bg-[#140802] text-stone-400 hover:text-red-300 border border-[#451f08]'
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

                        {/* Strike Shortcut */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isFlaked && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenAddStrike(
                                    member,
                                    `Missed ${currentEvent.eventType} after voting YES`
                                  )
                                }
                                className="btn-kingshot-orange px-2 py-1 text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <Flame className="w-3 h-3" />
                                <span>Strike</span>
                              </button>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TOTAL MEMBER PARTICIPATION MATRIX ACROSS ALL EVENTS */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#2e1507] to-[#1c0c04] border-2 border-[#ca8a04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#fbbf24]" />
                <h3 className="font-kingshot text-lg sm:text-xl text-[#fffbeb]">
                  Alliance Participation Matrix
                </h3>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Every member&apos;s total percentage and attendance status across all {events.length} alliance events.
              </p>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search member..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#140802] border border-[#52290d] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#281307] border-2 border-[#572b0f] shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#1c0c04] text-[#fef08a] font-kingshot uppercase text-xs tracking-wider border-b-2 border-[#542d13]">
                <tr>
                  <th className="py-3 px-4 sticky left-0 bg-[#1c0c04] z-10 shadow-sm">Member</th>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-4 text-[#fbbf24]">Total Part. %</th>
                  {events.map(evt => (
                    <th key={evt.id} className="py-3 px-3 text-center">
                      <div className="truncate max-w-[100px]">{evt.eventType}</div>
                      <div className="text-[10px] text-stone-400 font-sans font-normal">
                        {new Date(evt.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d1d0a] text-stone-200">
                {matrixMembers.map(member => {
                  const partStats = memberParticipationMap.get(member.id);
                  const partPct = partStats ? partStats.percentage : 0;
                  const ratio = partStats ? `${partStats.joinedCount}/${partStats.totalEvents}` : '0/0';

                  return (
                    <tr key={member.id} className="hover:bg-[#381a09]/90 transition-colors">
                      {/* Member */}
                      <td className="py-3 px-4 font-bold text-stone-100 sticky left-0 bg-[#281307] z-10 shadow-sm">
                        <span
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="hover:text-[#fef08a] cursor-pointer"
                        >
                          {member.name}
                        </span>
                      </td>

                      {/* Rank */}
                      <td className="py-3 px-3">
                        <RankBadge rank={member.currentRank} size="sm" />
                      </td>

                      {/* Total Percentage Member Participated */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-xs ${
                              partPct >= 75
                                ? 'text-emerald-400'
                                : partPct >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {partPct.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono font-normal">
                            ({ratio})
                          </span>
                        </div>
                      </td>

                      {/* Event by Event cells */}
                      {events.map(evt => {
                        const rec = attendance.find(
                          a => a.eventId === evt.id && a.memberId === member.id
                        );
                        const isJoined = rec?.attendanceStatus === 'JOINED';
                        const isFlaked =
                          rec?.voteStatus === 'YES' && rec?.attendanceStatus === 'DIDNT_JOIN';
                        const isNoVote = rec?.voteStatus === 'NO RESPONSE';

                        return (
                          <td key={evt.id} className="py-3 px-3 text-center">
                            {isJoined ? (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold"
                                title={`${member.name} attended ${evt.eventType}`}
                              >
                                ✓
                              </span>
                            ) : isFlaked ? (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-950 text-red-300 border border-red-600 font-bold animate-pulse"
                                title={`${member.name} flaked on ${evt.eventType} after voting YES`}
                              >
                                ✗!
                              </span>
                            ) : isNoVote ? (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#170a03] text-stone-500 border border-[#3b1704]"
                                title="No vote submitted"
                              >
                                —
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1f0e05] text-stone-400 border border-[#4d2309]"
                                title="Absent"
                              >
                                ✗
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Bulk Operations */}
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
