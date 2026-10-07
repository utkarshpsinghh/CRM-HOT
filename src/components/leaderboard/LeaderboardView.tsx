import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Member } from '../../types/crm';
import { RankBadge } from '../common/RankBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ActivityBadge } from '../common/StatusBadge';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Calendar,
  Flame,
  Search,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Shield,
  Star,
  Users,
  Swords,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface MemberLeaderboardEntry {
  member: Member;
  totalEligibleEvents: number;
  eventsJoined: number;
  attendanceRate: number;
  eventsVoted: number;
  voteRate: number;
  attendedWhenVoted: number;
  voteReliability: number;
  missedAfterYes: number;
}

export const LeaderboardView: React.FC = () => {
  const { members, events, attendance, eventParticipations, setSelectedMemberForProfile } = useCRM();

  // Filters
  const [timeframe, setTimeframe] = useState<'month' | 'all'>('month');
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Determine events in selected timeframe
  const eligibleEvents = useMemo(() => {
    if (timeframe === 'all') return events;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Check events in current month
    const thisMonthEvents = events.filter(e => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    if (thisMonthEvents.length < 2) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const rolling30Events = events.filter(e => {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
      });
      return rolling30Events.length > 0 ? rolling30Events : events;
    }

    return thisMonthEvents;
  }, [events, timeframe]);

  // 2. Compute stats for each member
  const leaderboardEntries = useMemo(() => {
    const eventIdSet = new Set(eligibleEvents.map(e => e.id));
    const totalEventsCount = eligibleEvents.length;

    const eligibleMembers = members.filter(m => m.status !== 'Archived');

    const entries: MemberLeaderboardEntry[] = eligibleMembers.map(member => {
      const modernParts = eventParticipations.filter(
        p => p.memberId === member.id && eventIdSet.has(p.eventId)
      );
      const memberRecords = attendance.filter(
        a => a.memberId === member.id && eventIdSet.has(a.eventId)
      );

      const modernJoined = modernParts.filter(p => p.attendanceStatus === 'ATTENDED').length;
      const modernVoted = modernParts.filter(p => p.voteStatus === 'VOTED').length;
      const modernAttendedWhenVoted = modernParts.filter(
        p => p.voteStatus === 'VOTED' && p.attendanceStatus === 'ATTENDED'
      ).length;
      const modernMissed = modernParts.filter(
        p => p.voteStatus === 'VOTED' && p.attendanceStatus === 'ABSENT'
      ).length;

      const legacyJoined = memberRecords.filter(r => r.attendanceStatus === 'JOINED').length;
      const legacyVoted = memberRecords.filter(
        r => r.voteStatus === 'YES' || r.voteStatus === 'NO'
      ).length;
      const legacyAttendedWhenVoted = memberRecords.filter(
        r => (r.voteStatus === 'YES' || r.voteStatus === 'NO') && r.attendanceStatus === 'JOINED'
      ).length;
      const legacyMissed = memberRecords.filter(
        r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
      ).length;

      const eventsJoined = modernParts.length > 0 ? modernJoined : legacyJoined;
      const eventsVoted = modernParts.length > 0 ? modernVoted : legacyVoted;
      const attendedWhenVoted = modernParts.length > 0 ? modernAttendedWhenVoted : legacyAttendedWhenVoted;
      const missedAfterYes = modernParts.length > 0 ? modernMissed : legacyMissed;

      const attendanceRate = totalEventsCount > 0 ? (eventsJoined / totalEventsCount) * 100 : 0;
      const voteRate = totalEventsCount > 0 ? (eventsVoted / totalEventsCount) * 100 : 0;
      const voteReliability = eventsVoted > 0 ? (attendedWhenVoted / eventsVoted) * 100 : 100;

      return {
        member,
        totalEligibleEvents: totalEventsCount,
        eventsJoined,
        attendanceRate,
        eventsVoted,
        voteRate,
        attendedWhenVoted,
        voteReliability,
        missedAfterYes,
      };
    });

    return entries.sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }
      if (b.eventsJoined !== a.eventsJoined) {
        return b.eventsJoined - a.eventsJoined;
      }
      if (b.voteRate !== a.voteRate) {
        return b.voteRate - a.voteRate;
      }
      return (a.member.strikes || 0) - (b.member.strikes || 0);
    });
  }, [members, attendance, eligibleEvents]);

  // 3. Filter entries
  const filteredEntries = useMemo(() => {
    return leaderboardEntries.filter(entry => {
      if (selectedRank !== 'ALL' && entry.member.currentRank !== selectedRank) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          entry.member.name.toLowerCase().includes(query) ||
          entry.member.currentRank.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [leaderboardEntries, selectedRank, searchQuery]);

  // Top 3 Podium Winners
  const top1 = filteredEntries[0];
  const top2 = filteredEntries[1];
  const top3 = filteredEntries[2];

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalWars = eligibleEvents.length;
    const perfectAttendanceCount = leaderboardEntries.filter(
      e => e.attendanceRate === 100 && e.totalEligibleEvents > 0
    ).length;
    const totalPossibleAttendances = leaderboardEntries.reduce(
      (sum, e) => sum + e.totalEligibleEvents,
      0
    );
    const totalActualAttendances = leaderboardEntries.reduce((sum, e) => sum + e.eventsJoined, 0);
    const allianceAverageTurnout =
      totalPossibleAttendances > 0
        ? (totalActualAttendances / totalPossibleAttendances) * 100
        : 0;

    return { totalWars, perfectAttendanceCount, allianceAverageTurnout };
  }, [eligibleEvents, leaderboardEntries]);

  const handleMemberClick = (member: Member) => {
    sounds.playClick();
    setSelectedMemberForProfile(member);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight">
              Alliance Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            War attendance honors and member reliability rankings.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setTimeframe('month');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              timeframe === 'month'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>This Month</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setTimeframe('all');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              timeframe === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>All-Time</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {timeframe === 'month' ? 'Events Evaluated (Month)' : 'Total All-Time Events'}
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">
              {summaryMetrics.totalWars} Events
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              100% Turnout Record
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {summaryMetrics.perfectAttendanceCount} Members
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Alliance Turnout Avg
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400 mt-0.5">
              {summaryMetrics.allianceAverageTurnout.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM SECTION */}
      {filteredEntries.length >= 3 && !searchQuery.trim() && selectedRank === 'ALL' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Podium Champions
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
              {timeframe === 'month' ? 'Top Event Performers This Month' : 'All-Time Alliance Legends'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
            {/* 2nd Place: Silver */}
            {top2 && (
              <div
                onClick={() => handleMemberClick(top2.member)}
                className="order-2 md:order-1 p-4 rounded-xl bg-slate-950/60 border border-slate-700/60 hover:border-slate-500 transition-all cursor-pointer text-center space-y-2 group select-none"
              >
                <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-500 mx-auto flex items-center justify-center text-slate-200">
                  <Medal className="w-5 h-5 text-slate-300" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-semibold uppercase">
                  #2 Silver
                </div>
                <h3 className="font-semibold text-base text-white group-hover:text-amber-400 truncate">
                  {top2.member.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5">
                  <RankBadge rank={top2.member.currentRank} size="sm" />
                  <span className="text-xs text-slate-400 font-mono">
                    {top2.eventsJoined}/{top2.totalEligibleEvents} Events
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-200">
                  {top2.attendanceRate.toFixed(0)}%
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div>Vote: <span className="text-purple-300 font-mono font-semibold">{top2.voteRate.toFixed(0)}%</span></div>
                  <div>Reliability: <span className="text-emerald-400 font-mono font-semibold">{top2.eventsVoted > 0 ? `${top2.voteReliability.toFixed(0)}%` : '—'}</span></div>
                </div>
              </div>
            )}

            {/* 1st Place: Gold Crown */}
            {top1 && (
              <div
                onClick={() => handleMemberClick(top1.member)}
                className="order-1 md:order-2 p-5 rounded-xl bg-gradient-to-b from-amber-500/10 to-slate-950 border border-amber-500/40 hover:border-amber-500/60 transition-all cursor-pointer text-center space-y-2.5 relative md:-mt-2 group select-none shadow-lg shadow-amber-500/10"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Crown className="w-3 h-3 text-slate-950" />
                  <span>#1 Champion</span>
                </div>
                <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400 mx-auto flex items-center justify-center text-amber-400 mt-1">
                  <Trophy className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-amber-300 group-hover:text-white truncate">
                  {top1.member.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5">
                  <RankBadge rank={top1.member.currentRank} size="sm" />
                  <span className="text-xs text-amber-300/90 font-mono font-medium">
                    {top1.eventsJoined}/{top1.totalEligibleEvents} Events
                  </span>
                </div>
                <div className="text-3xl font-bold font-mono text-amber-400">
                  {top1.attendanceRate.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-300 space-y-0.5">
                  <div className="text-[11px] text-slate-400">
                    Vote: <span className="text-purple-300 font-mono font-semibold">{top1.voteRate.toFixed(0)}%</span> • Reliability: <span className="text-emerald-400 font-mono font-semibold">{top1.eventsVoted > 0 ? `${top1.voteReliability.toFixed(0)}%` : '—'}</span>
                  </div>
                  <div>{top1.member.strikes === 0 ? 'Clean Record (0 Strikes)' : `${top1.member.strikes} Strikes`}</div>
                </div>
              </div>
            )}

            {/* 3rd Place: Bronze */}
            {top3 && (
              <div
                onClick={() => handleMemberClick(top3.member)}
                className="order-3 p-4 rounded-xl bg-slate-950/60 border border-orange-500/30 hover:border-orange-500/50 transition-all cursor-pointer text-center space-y-2 group select-none"
              >
                <div className="w-11 h-11 rounded-full bg-orange-500/10 border border-orange-500/40 mx-auto flex items-center justify-center text-orange-400">
                  <Award className="w-5 h-5" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-orange-950/60 border border-orange-500/30 text-orange-300 text-[10px] font-semibold uppercase">
                  #3 Bronze
                </div>
                <h3 className="font-semibold text-base text-white group-hover:text-amber-400 truncate">
                  {top3.member.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5">
                  <RankBadge rank={top3.member.currentRank} size="sm" />
                  <span className="text-xs text-slate-400 font-mono">
                    {top3.eventsJoined}/{top3.totalEligibleEvents} Events
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-orange-400">
                  {top3.attendanceRate.toFixed(0)}%
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div>Vote: <span className="text-purple-300 font-mono font-semibold">{top3.voteRate.toFixed(0)}%</span></div>
                  <div>Reliability: <span className="text-emerald-400 font-mono font-semibold">{top3.eventsVoted > 0 ? `${top3.voteReliability.toFixed(0)}%` : '—'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member name or rank..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Rank Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase shrink-0">
            Rank:
          </span>
          {['ALL', 'R5', 'R4', 'R3', 'R2', 'R1'].map(r => (
            <button
              key={r}
              onClick={() => {
                sounds.playClick();
                setSelectedRank(r);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0 ${
                selectedRank === r
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* LEADERBOARD RANKINGS TABLE */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-slate-200">
              {timeframe === 'month' ? 'Monthly Standings' : 'All-Time Standings'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredEntries.length} Members
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">Click row for full profile</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No alliance members match the current search filter.
          </div>
        ) : (
          <>
            {/* Mobile Leaderboard Cards (< md) */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {filteredEntries.map((entry, index) => {
                const rankNumber = index + 1;
                const isTop1 = rankNumber === 1;
                const isTop2 = rankNumber === 2;
                const isTop3 = rankNumber === 3;

                return (
                  <div
                    key={entry.member.id}
                    onClick={() => handleMemberClick(entry.member)}
                    className={`p-3.5 space-y-2.5 transition-colors cursor-pointer select-none active:bg-slate-800/60 ${
                      isTop1 ? 'bg-amber-500/5' : isTop2 ? 'bg-slate-700/10' : isTop3 ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    {/* Top: Rank, Name, Rank Badge, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className="shrink-0">
                          {isTop1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="w-6 h-6 rounded-full bg-orange-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm">
                              3
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono font-medium flex items-center justify-center text-xs">
                              {rankNumber}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-100 flex items-center gap-1.5 truncate">
                            <span className="truncate">{entry.member.name}</span>
                            {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <RankBadge rank={entry.member.currentRank} size="sm" />
                            <ActivityBadge status={entry.member.status} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Turnout % */}
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold font-mono text-amber-400">
                          {entry.attendanceRate.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {entry.eventsJoined}/{entry.totalEligibleEvents} events
                        </div>
                      </div>
                    </div>

                    {/* Turnout Progress Bar */}
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          entry.attendanceRate >= 75 ? 'bg-emerald-500' : entry.attendanceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, entry.attendanceRate)}%` }}
                      />
                    </div>

                    {/* Metrics Strip */}
                    <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] font-mono border-t border-slate-800/60 text-slate-400">
                      <div>
                        <span className="text-slate-500 font-sans text-[10px] block">Vote %</span>
                        <span className="text-purple-300 font-bold">{entry.voteRate.toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans text-[10px] block">Reliability</span>
                        <span className={`font-bold ${
                          (entry.voteReliability || 100) >= 80 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {entry.eventsVoted > 0 ? `${entry.voteReliability.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-sans text-[10px] block">Strikes</span>
                        <span className={entry.member.strikes > 0 ? 'text-rose-400 font-bold' : 'text-slate-400 font-bold'}>
                          {entry.member.strikes}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Tablet Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 text-center w-12"># Rank</th>
                  <th className="py-3 px-3">Alliance Member</th>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-3">Turnout Rate</th>
                  <th className="py-3 px-3 text-center">Events Joined</th>
                  <th className="py-3 px-3 text-center">Vote %</th>
                  <th className="py-3 px-3 text-center">Vote Reliability</th>
                  <th className="py-3 px-3 text-center">Strikes</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((entry, index) => {
                  const rankNumber = index + 1;
                  const isTop1 = rankNumber === 1;
                  const isTop2 = rankNumber === 2;
                  const isTop3 = rankNumber === 3;

                  return (
                    <tr
                      key={entry.member.id}
                      onClick={() => handleMemberClick(entry.member)}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                        isTop1 ? 'bg-amber-500/5' : isTop2 ? 'bg-slate-700/10' : isTop3 ? 'bg-orange-500/5' : ''
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="py-3 px-3.5 text-center">
                        {isTop1 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs mx-auto shadow-sm">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-bold flex items-center justify-center text-xs mx-auto shadow-sm">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-5 h-5 rounded-full bg-orange-400 text-slate-950 font-bold flex items-center justify-center text-xs mx-auto shadow-sm">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono font-medium">
                            #{rankNumber}
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-sm text-slate-100 group-hover:text-amber-400 flex items-center gap-1.5">
                          <span>{entry.member.name}</span>
                          {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                      </td>

                      {/* Alliance Rank */}
                      <td className="py-3 px-3 text-center">
                        <RankBadge rank={entry.member.currentRank} size="sm" />
                      </td>

                      {/* Attendance Percentage */}
                      <td className="py-3 px-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-950 overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full ${
                                entry.attendanceRate >= 80
                                  ? 'bg-emerald-400'
                                  : entry.attendanceRate >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, entry.attendanceRate))}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono font-bold text-xs ${
                              entry.attendanceRate >= 80
                                ? 'text-emerald-400'
                                : entry.attendanceRate >= 50
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {entry.attendanceRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Wars Joined */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-200">
                        {entry.eventsJoined} / {entry.totalEligibleEvents}
                      </td>

                      {/* Vote Rate */}
                      <td className="py-3 px-3 text-center font-mono text-purple-300 font-semibold">
                        {entry.voteRate.toFixed(0)}%
                        <span className="text-[10px] text-slate-500 font-normal ml-1">({entry.eventsVoted}/{entry.totalEligibleEvents})</span>
                      </td>

                      {/* Vote Reliability */}
                      <td className="py-3 px-3 text-center font-mono">
                        {entry.eventsVoted > 0 ? (
                          <span
                            className={`font-semibold ${
                              entry.voteReliability >= 80
                                ? 'text-emerald-400'
                                : entry.voteReliability >= 50
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {entry.voteReliability.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Strikes */}
                      <td className="py-3 px-3 text-center">
                        {entry.member.strikes > 0 ? (
                          <StrikeBadge count={entry.member.strikes} size="sm" />
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                            Clean
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <ActivityBadge status={entry.member.status as any} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 inline transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        )}
      </div>
    </div>
  );
};
