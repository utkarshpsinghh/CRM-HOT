import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Member, AllianceRank } from '../../types/crm';
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
  missedAfterYes: number;
}

export const LeaderboardView: React.FC = () => {
  const { members, events, attendance, setSelectedMemberForProfile } = useCRM();

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

    // If current calendar month has less than 2 events (e.g., month just started),
    // fall back to the last 30 rolling days so the leaderboard is always populated with rich data!
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

    // Filter active & non-archived members
    const eligibleMembers = members.filter(m => m.status !== 'Archived');

    const entries: MemberLeaderboardEntry[] = eligibleMembers.map(member => {
      // Find member's attendance records for eligible events
      const memberRecords = attendance.filter(
        a => a.memberId === member.id && eventIdSet.has(a.eventId)
      );

      const eventsJoined = memberRecords.filter(r => r.attendanceStatus === 'JOINED').length;
      const eventsVoted = memberRecords.filter(
        r => r.voteStatus === 'YES' || r.voteStatus === 'NO'
      ).length;
      const missedAfterYes = memberRecords.filter(
        r => r.voteStatus === 'YES' && r.attendanceStatus === 'DIDNT_JOIN'
      ).length;

      const attendanceRate = totalEventsCount > 0 ? (eventsJoined / totalEventsCount) * 100 : 0;
      const voteRate = totalEventsCount > 0 ? (eventsVoted / totalEventsCount) * 100 : 0;

      return {
        member,
        totalEligibleEvents: totalEventsCount,
        eventsJoined,
        attendanceRate,
        eventsVoted,
        voteRate,
        missedAfterYes,
      };
    });

    // Sort by attendance rate (desc), then total joined (desc), then vote rate (desc), then fewest strikes (asc)
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
  }, [members, eligibleEvents, attendance]);

  // 3. Filter entries based on search and rank
  const filteredEntries = useMemo(() => {
    return leaderboardEntries.filter(entry => {
      if (selectedRank !== 'ALL' && entry.member.currentRank !== selectedRank) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          entry.member.name.toLowerCase().includes(q) ||
          entry.member.currentRank.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leaderboardEntries, selectedRank, searchQuery]);

  // Top 3 Podium
  const top1 = filteredEntries[0];
  const top2 = filteredEntries[1];
  const top3 = filteredEntries[2];

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const perfectCount = leaderboardEntries.filter(
      e => e.totalEligibleEvents > 0 && e.eventsJoined === e.totalEligibleEvents
    ).length;
    const avgAttendance =
      leaderboardEntries.length > 0
        ? leaderboardEntries.reduce((sum, e) => sum + e.attendanceRate, 0) /
          leaderboardEntries.length
        : 0;

    return {
      totalWars: eligibleEvents.length,
      perfectAttendanceCount: perfectCount,
      allianceAverageTurnout: avgAttendance,
    };
  }, [leaderboardEntries, eligibleEvents]);

  const handleMemberClick = (member: Member) => {
    sounds.playClick();
    setSelectedMemberForProfile(member);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#f59e0b] to-[#b45309] flex items-center justify-center text-black shadow-md">
              <Trophy className="w-4 h-4 text-black" />
            </div>
            <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
              Hall of Fame &amp; Attendance Leaderboard
            </h1>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Honoring alliance champions with the highest battle attendance and reliable war participation.
          </p>
        </div>

        {/* Timeframe Toggle Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-[#120c08] border border-[#3e2716] shadow-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setTimeframe('month');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              timeframe === 'month'
                ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                : 'text-stone-300 hover:text-white'
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              timeframe === 'all'
                ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>All-Time Rankings</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip (Cartoon Loot Pods) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#2a1a0e] to-[#180f08] border-[2.5px] border-[#ca8a04] shadow-[0_5px_0_#78350f] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#fde047] to-[#ca8a04] border-2 border-[#fef08a] flex items-center justify-center text-black shadow-md shrink-0">
            <Swords className="w-6 h-6 text-black drop-shadow" />
          </div>
          <div>
            <div className="text-[11px] font-fantasy font-black text-amber-300 uppercase tracking-wider">
              {timeframe === 'month' ? 'Wars Evaluated (Month)' : 'Total All-Time Wars'}
            </div>
            <div className="text-2xl font-fantasy font-black text-[#fef08a] gold-text-glow">
              {summaryMetrics.totalWars} Battles
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#132418] to-[#0c160e] border-[2.5px] border-emerald-600 shadow-[0_5px_0_#064e3b] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#86efac] to-[#16a34a] border-2 border-[#bbf7d0] flex items-center justify-center text-black shadow-md shrink-0">
            <Crown className="w-6 h-6 text-black drop-shadow" />
          </div>
          <div>
            <div className="text-[11px] font-fantasy font-black text-emerald-300 uppercase tracking-wider">
              100% Perfect Attendance
            </div>
            <div className="text-2xl font-fantasy font-black text-emerald-300 game-text-shadow">
              {summaryMetrics.perfectAttendanceCount} Champions
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#121c29] to-[#0a1017] border-[2.5px] border-blue-600 shadow-[0_5px_0_#0c2340] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#93c5fd] to-[#2563eb] border-2 border-[#bfdbfe] flex items-center justify-center text-black shadow-md shrink-0">
            <TrendingUp className="w-6 h-6 text-black drop-shadow" />
          </div>
          <div>
            <div className="text-[11px] font-fantasy font-black text-blue-300 uppercase tracking-wider">
              Alliance Turnout Avg
            </div>
            <div className="text-2xl font-fantasy font-black text-blue-300 game-text-shadow">
              {summaryMetrics.allianceAverageTurnout.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM SECTION */}
      {filteredEntries.length >= 3 && !searchQuery.trim() && selectedRank === 'ALL' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#241710] to-[#140d07] border-[3px] border-[#ca8a04] shadow-[0_8px_0_#451a03,0_16px_32px_rgba(0,0,0,0.6)] space-y-4">
          <div className="text-center">
            <span className="text-xs font-fantasy font-black uppercase tracking-widest text-[#fde047] gold-text-glow">
              ★ ALLIANCE WAR HEROES PODIUM ★
            </span>
            <h2 className="text-xl sm:text-2xl font-fantasy font-black text-[#fffbeb] game-text-shadow mt-1">
              {timeframe === 'month' ? 'Top War Warriors This Month' : 'All-Time Alliance Legends'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 items-end">
            {/* 2nd Place: Silver */}
            {top2 && (
              <div
                onClick={() => handleMemberClick(top2.member)}
                className="order-2 md:order-1 p-4 rounded-2xl bg-gradient-to-b from-[#1e242d] to-[#11161d] border-[3px] border-slate-300 shadow-[0_6px_0_#334155] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center space-y-2 group select-none"
              >
                <div className="w-12 h-12 rounded-full bg-slate-300/20 border-2 border-slate-200 mx-auto flex items-center justify-center text-slate-200 shadow-md">
                  <Medal className="w-6 h-6 text-slate-200" />
                </div>
                <div className="inline-block px-3 py-0.5 rounded-full bg-slate-800 border-2 border-slate-400 text-slate-100 text-[10px] font-fantasy font-black uppercase shadow-sm">
                  #2 Silver Champion
                </div>
                <h3 className="font-fantasy font-black text-base text-white group-hover:text-amber-300 truncate">
                  {top2.member.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5">
                  <RankBadge rank={top2.member.currentRank} />
                  <span className="text-xs text-stone-300 font-bold font-mono">
                    {top2.eventsJoined}/{top2.totalEligibleEvents} Wars
                  </span>
                </div>
                <div className="text-2xl font-fantasy font-black text-slate-200 game-text-shadow">
                  {top2.attendanceRate.toFixed(0)}%
                </div>
                <div className="text-[11px] text-stone-400 font-medium">
                  Vote Reliability: {top2.voteRate.toFixed(0)}%
                </div>
              </div>
            )}

            {/* 1st Place: Gold Crown (Elevated) */}
            {top1 && (
              <div
                onClick={() => handleMemberClick(top1.member)}
                className="order-1 md:order-2 p-5 rounded-2xl bg-gradient-to-b from-[#3a200b] to-[#1e1106] border-[3.5px] border-[#fde047] shadow-[0_8px_0_#78350f,0_16px_36px_rgba(250,204,21,0.35)] hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer text-center space-y-2.5 relative -mt-3 group select-none"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] font-fantasy font-black uppercase tracking-wider shadow-lg flex items-center gap-1 border border-white">
                  <Crown className="w-3.5 h-3.5 text-black fill-black" />
                  <span>#1 Supreme Champion</span>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#fde047] to-[#ca8a04] mx-auto flex items-center justify-center text-black shadow-lg border-2 border-white">
                  <Trophy className="w-8 h-8 text-black fill-black/20" />
                </div>
                <h3 className="font-fantasy font-black text-xl text-[#fef08a] group-hover:text-white truncate pt-1 game-text-shadow">
                  {top1.member.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5">
                  <RankBadge rank={top1.member.currentRank} />
                  <span className="text-xs text-amber-200 font-bold font-mono">
                    {top1.eventsJoined}/{top1.totalEligibleEvents} Wars Joined
                  </span>
                </div>
                <div className="text-3xl font-fantasy font-black text-[#fde047] gold-text-glow">
                  {top1.attendanceRate.toFixed(0)}% Turnout
                </div>
                <div className="text-xs text-amber-300/90 font-medium">
                  {top1.member.strikes === 0 ? '🎖️ Clean Honor Record (0 Strikes)' : `${top1.member.strikes} Strikes`}
                </div>
              </div>
            )}

            {/* 3rd Place: Bronze */}
            {top3 && (
              <div
                onClick={() => handleMemberClick(top3.member)}
                className="order-3 p-4 rounded-2xl bg-gradient-to-b from-[#241309] to-[#150a04] border-[3px] border-amber-700 shadow-[0_6px_0_#451a03] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center space-y-2 group select-none"
              >
                <div className="w-12 h-12 rounded-full bg-amber-700/20 border-2 border-amber-600 mx-auto flex items-center justify-center text-amber-400 shadow-md">
                  <Award className="w-6 h-6 text-amber-400" />
                </div>
                <div className="inline-block px-3 py-0.5 rounded-full bg-amber-950 border-2 border-amber-700 text-amber-200 text-[10px] font-fantasy font-black uppercase shadow-sm">
                  #3 Bronze Warrior
                </div>
                <h3 className="font-fantasy font-black text-base text-white group-hover:text-amber-300 truncate">
                  {top3.member.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5">
                  <RankBadge rank={top3.member.currentRank} />
                  <span className="text-xs text-stone-300 font-bold font-mono">
                    {top3.eventsJoined}/{top3.totalEligibleEvents} Wars
                  </span>
                </div>
                <div className="text-2xl font-fantasy font-black text-amber-400 game-text-shadow">
                  {top3.attendanceRate.toFixed(0)}%
                </div>
                <div className="text-[11px] text-stone-400 font-medium">
                  Vote Reliability: {top3.voteRate.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member name or rank..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#ca8a04]"
          />
        </div>

        {/* Rank Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-fantasy font-bold text-[#ca8a04] uppercase shrink-0">
            Rank:
          </span>
          {['ALL', 'R5', 'R4', 'R3', 'R2', 'R1'].map(r => (
            <button
              key={r}
              onClick={() => {
                sounds.playClick();
                setSelectedRank(r);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-fantasy font-bold transition-all cursor-pointer shrink-0 ${
                selectedRank === r
                  ? 'bg-[#ca8a04] text-black font-black shadow-sm'
                  : 'bg-[#120c08] text-stone-400 hover:text-stone-200 border border-[#2c1d15]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* LEADERBOARD RANKINGS TABLE */}
      <div className="rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md overflow-hidden">
        <div className="px-4 py-3 bg-[#120c08] border-b border-[#3e2716] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ca8a04]" />
            <h3 className="font-fantasy font-bold text-sm text-[#fef08a]">
              {timeframe === 'month' ? 'Monthly Leaderboard Standings' : 'All-Time Standings'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a170a] text-amber-300 font-mono font-bold">
              {filteredEntries.length} Members
            </span>
          </div>
          <span className="text-[11px] text-stone-400">Click row for full profile</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            No alliance members match the current search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-[#140d09] text-[11px] font-fantasy font-bold uppercase text-stone-400 border-b border-[#3e2716]">
                <tr>
                  <th className="py-3 px-3.5 text-center w-12"># Rank</th>
                  <th className="py-3 px-3">Alliance Member</th>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-3">Turnout Rate</th>
                  <th className="py-3 px-3 text-center">Wars Joined</th>
                  <th className="py-3 px-3 text-center">Vote Reliability</th>
                  <th className="py-3 px-3 text-center">Strikes</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c1d15]">
                {filteredEntries.map((entry, index) => {
                  const rankNumber = index + 1;
                  const isTop1 = rankNumber === 1;
                  const isTop2 = rankNumber === 2;
                  const isTop3 = rankNumber === 3;

                  return (
                    <tr
                      key={entry.member.id}
                      onClick={() => handleMemberClick(entry.member)}
                      className={`hover:bg-[#251810] transition-colors cursor-pointer group ${
                        isTop1 ? 'bg-amber-500/5' : isTop2 ? 'bg-slate-400/5' : isTop3 ? 'bg-amber-700/5' : ''
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="py-3 px-3.5 text-center">
                        {isTop1 ? (
                          <span className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black flex items-center justify-center text-xs mx-auto shadow">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-xs mx-auto shadow">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-xs mx-auto shadow">
                            3
                          </span>
                        ) : (
                          <span className="text-stone-400 font-mono font-semibold">
                            #{rankNumber}
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3">
                        <div className="font-fantasy font-bold text-sm text-[#fef9ee] group-hover:text-amber-300 flex items-center gap-1.5">
                          <span>{entry.member.name}</span>
                          {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                      </td>

                      {/* Alliance Rank */}
                      <td className="py-3 px-3 text-center">
                        <RankBadge rank={entry.member.currentRank} />
                      </td>

                      {/* Attendance Percentage */}
                      <td className="py-3 px-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-[#120c08] border border-[#3e2716] overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full ${
                                entry.attendanceRate >= 80
                                  ? 'bg-emerald-500'
                                  : entry.attendanceRate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
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
                                : 'text-red-400'
                            }`}
                          >
                            {entry.attendanceRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Wars Joined */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-stone-200">
                        {entry.eventsJoined} / {entry.totalEligibleEvents}
                      </td>

                      {/* Vote Rate */}
                      <td className="py-3 px-3 text-center font-mono text-stone-300">
                        {entry.voteRate.toFixed(0)}%
                      </td>

                      {/* Strikes */}
                      <td className="py-3 px-3 text-center">
                        {entry.member.strikes > 0 ? (
                          <StrikeBadge count={entry.member.strikes} />
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-bold">
                            Clean (0)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <ActivityBadge status={entry.member.status as any} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 inline transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
