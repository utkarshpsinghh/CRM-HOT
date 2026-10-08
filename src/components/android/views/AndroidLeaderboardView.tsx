import React, { useState, useMemo } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { Member } from '../../../types/crm';
import { Trophy, Crown, Medal, Award, Search, Calendar, Star, ShieldCheck, AlertCircle } from 'lucide-react';
import { sounds } from '../../../utils/sound';

interface AndroidLeaderboardViewProps {
  onSelectMember: (member: Member) => void;
}

export const AndroidLeaderboardView: React.FC<AndroidLeaderboardViewProps> = ({ onSelectMember }) => {
  const { members, events, attendance, eventParticipations } = useCRM();

  const [timeframe, setTimeframe] = useState<'all' | 'month'>('all');
  const [search, setSearch] = useState('');

  // 1. Determine events in selected timeframe
  const eligibleEvents = useMemo(() => {
    if (timeframe === 'all') return events;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisMonthEvents = events.filter(e => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    return thisMonthEvents.length >= 2 ? thisMonthEvents : events;
  }, [events, timeframe]);

  // 2. Compute stats matching the official CRM sorting
  const rankedEntries = useMemo(() => {
    const eventIdSet = new Set(eligibleEvents.map(e => e.id));
    const totalEventsCount = eligibleEvents.length;
    const eligibleMembers = members.filter(m => m.status !== 'Archived');

    const entries = eligibleMembers.map((member, originalIndex) => {
      const modernParts = eventParticipations.filter(
        p => p.memberId === member.id && eventIdSet.has(p.eventId)
      );
      const legacyParts = attendance.filter(
        a => a.memberId === member.id && eventIdSet.has(a.eventId)
      );

      const modernJoined = modernParts.filter(p => p.attendanceStatus === 'ATTENDED').length;
      const modernVoted = modernParts.filter(p => p.voteStatus === 'VOTED').length;
      const legacyJoined = legacyParts.filter(a => a.attendanceStatus === 'JOINED').length;
      const legacyVoted = legacyParts.filter(a => a.voteStatus === 'YES' || a.voteStatus === 'NO').length;

      const eventsJoined = modernParts.length > 0 ? modernJoined : legacyJoined;
      const eventsVoted = modernParts.length > 0 ? modernVoted : legacyVoted;

      const attendanceRate = totalEventsCount > 0 ? (eventsJoined / totalEventsCount) * 100 : 0;
      const voteRate = totalEventsCount > 0 ? (eventsVoted / totalEventsCount) * 100 : 0;

      return {
        member,
        originalIndex,
        totalEvents: totalEventsCount,
        eventsJoined,
        attendanceRate,
        voteRate,
        strikes: member.strikes || 0,
      };
    });

    entries.sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
      if (b.eventsJoined !== a.eventsJoined) return b.eventsJoined - a.eventsJoined;
      if (b.voteRate !== a.voteRate) return b.voteRate - a.voteRate;
      if (a.strikes !== b.strikes) return a.strikes - b.strikes;
      return a.originalIndex - b.originalIndex;
    });

    return entries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [members, events, attendance, eventParticipations, eligibleEvents]);

  // Filtered entries
  const filtered = useMemo(() => {
    if (!search.trim()) return rankedEntries;
    const q = search.toLowerCase();
    return rankedEntries.filter(
      e => e.member.name.toLowerCase().includes(q) || (e.member.currentRank || '').toLowerCase().includes(q)
    );
  }, [rankedEntries, search]);

  const top1 = rankedEntries[0];
  const top2 = rankedEntries[1];
  const top3 = rankedEntries[2];

  const handleCardClick = (m: Member) => {
    sounds.playClick();
    onSelectMember(m);
  };

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Timeframe Selector Strip */}
      <div className="flex items-center justify-between gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl select-none">
        <button
          onClick={() => {
            sounds.playClick();
            setTimeframe('all');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            timeframe === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>All-Time (8 Wars)</span>
        </button>
        <button
          onClick={() => {
            sounds.playClick();
            setTimeframe('month');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            timeframe === 'month'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>This Month (6 Wars)</span>
        </button>
      </div>

      {/* Podium Cards for Top 3 (Compact Mobile Layout) */}
      {!search.trim() && top1 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-2">
          {/* #2 Silver */}
          {top2 && (
            <div
              onClick={() => handleCardClick(top2.member)}
              className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/60 text-center space-y-1 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-500 mx-auto flex items-center justify-center text-slate-200">
                <Medal className="w-4 h-4 text-slate-300" />
              </div>
              <div className="text-[10px] font-bold text-slate-300">#2 Silver</div>
              <div className="text-xs font-bold text-white truncate">{top2.member.name}</div>
              <div className="text-sm font-black font-mono text-slate-200">
                {top2.attendanceRate.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {top2.eventsJoined}/{top2.totalEvents}
              </div>
            </div>
          )}

          {/* #1 Champion Gold */}
          <div
            onClick={() => handleCardClick(top1.member)}
            className="p-3 rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/50 text-center space-y-1.5 relative -top-1 active:scale-95 transition-all cursor-pointer shadow-xl shadow-amber-500/10"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 mx-auto flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
              #1 Champion
            </div>
            <div className="text-xs font-extrabold text-white truncate">{top1.member.name}</div>
            <div className="text-base font-black font-mono text-amber-400">
              {top1.attendanceRate.toFixed(0)}%
            </div>
            <div className="text-[10px] text-amber-300/80 font-mono font-bold">
              {top1.eventsJoined}/{top1.totalEvents}
            </div>
          </div>

          {/* #3 Bronze */}
          {top3 && (
            <div
              onClick={() => handleCardClick(top3.member)}
              className="p-2.5 rounded-2xl bg-slate-900/90 border border-orange-500/30 text-center space-y-1 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/40 mx-auto flex items-center justify-center text-orange-400">
                <Award className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-[10px] font-bold text-orange-300">#3 Bronze</div>
              <div className="text-xs font-bold text-white truncate">{top3.member.name}</div>
              <div className="text-sm font-black font-mono text-orange-400">
                {top3.attendanceRate.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {top3.eventsJoined}/{top3.totalEvents}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter ranked members..."
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-sm"
        />
      </div>

      {/* Standings List */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden shadow-sm">
        {filtered.map(item => {
          const isTop3 = item.rank <= 3;
          return (
            <div
              key={item.member.id}
              onClick={() => handleCardClick(item.member)}
              className="p-3 flex items-center justify-between gap-3 active:bg-slate-800/60 cursor-pointer select-none transition-colors"
            >
              {/* Rank & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 font-mono ${
                    item.rank === 1
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-950 shadow-sm'
                      : item.rank === 3
                      ? 'bg-orange-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.rank}
                </span>

                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{item.member.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono font-bold">
                      {item.member.currentRank}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>{item.eventsJoined} / {item.totalEvents} Wars</span>
                    <span>•</span>
                    <span className="text-purple-300">Vote: {item.voteRate.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Turnout % & Progress Indicator */}
              <div className="text-right shrink-0">
                <div className="text-sm font-extrabold font-mono text-amber-400">
                  {item.attendanceRate.toFixed(0)}%
                </div>
                <div className="w-16 h-1.5 rounded-full bg-slate-950 overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      item.attendanceRate >= 80
                        ? 'bg-emerald-400'
                        : item.attendanceRate >= 50
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${item.attendanceRate}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
