import React, { useState, useMemo } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { Member } from '../../../types/crm';
import { Trophy, Crown, Medal, Award, Search, Calendar, Star, ShieldCheck, AlertCircle } from 'lucide-react';
import { sounds } from '../../../utils/sound';
import { storageService } from '../../../services/storage';
import { getComputedEventStatus } from '../../../utils/date';

interface AndroidLeaderboardViewProps {
  onSelectMember: (member: Member) => void;
}

export const AndroidLeaderboardView: React.FC<AndroidLeaderboardViewProps> = ({ onSelectMember }) => {
  const { members, events, attendance, eventParticipations } = useCRM();

  const [timeframe, setTimeframe] = useState<'all' | 'month'>('all');
  const [search, setSearch] = useState('');

  // 1. Determine events in selected timeframe (excluding deleted and unheld/upcoming events)
  const eligibleEvents = useMemo(() => {
    const deletedIds = new Set(storageService.getDeletedEventIds());
    const validEvents = events.filter(e => !deletedIds.has(e.id));

    const completedEvents = validEvents.filter(e => {
      if (e.status === 'Completed' || e.status === 'Live') return true;
      const computed = getComputedEventStatus(e.date);
      return computed === 'Completed';
    });

    if (timeframe === 'all') return completedEvents;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisMonthEvents = completedEvents.filter(e => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    return thisMonthEvents.length >= 2 ? thisMonthEvents : completedEvents;
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
      {/* Timeframe Selector Strip - Cyber Capsule */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#060914] border border-rose-500/20 rounded-2xl select-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => {
            sounds.playClick();
            setTimeframe('all');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            timeframe === 'all'
              ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>ALL-TIME (8 WARS)</span>
        </button>
        <button
          onClick={() => {
            sounds.playClick();
            setTimeframe('month');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            timeframe === 'month'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>OCTOBER (6 WARS)</span>
        </button>
      </div>

      {/* Podium Cards for Top 3 (Cyber AMOLED Layout) */}
      {!search.trim() && top1 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-2">
          {/* #2 Silver / Electric Cyan */}
          {top2 && (
            <div
              onClick={() => handleCardClick(top2.member)}
              className="p-3 rounded-2xl bg-[#090d1c]/90 border border-cyan-500/40 text-center space-y-1 active:scale-95 transition-all cursor-pointer shadow-[0_4px_20px_rgba(6,182,212,0.2)]"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 mx-auto flex items-center justify-center text-cyan-300">
                <Medal className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="text-[10px] font-mono font-black text-cyan-400">#2 SILVER</div>
              <div className="text-xs font-bold text-white truncate">{top2.member.name}</div>
              <div className="text-sm font-black font-mono text-cyan-300">
                {top2.attendanceRate.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {top2.eventsJoined}/{top2.totalEvents} WARS
              </div>
            </div>
          )}

          {/* #1 Apex Champion Crimson */}
          <div
            onClick={() => handleCardClick(top1.member)}
            className="p-3.5 rounded-3xl bg-gradient-to-b from-rose-950/80 via-[#0a0714] to-[#04060e] border border-rose-500/60 text-center space-y-1.5 relative -top-2 active:scale-95 transition-all cursor-pointer shadow-[0_8px_30px_rgba(225,29,72,0.4)] android-pulse-crimson"
          >
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-400 mx-auto flex items-center justify-center text-rose-300 android-float">
              <Crown className="w-5 h-5 text-rose-400 fill-rose-400" />
            </div>
            <div className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-widest">
              #1 APEX
            </div>
            <div className="text-xs font-black text-white truncate">{top1.member.name}</div>
            <div className="text-base font-black font-mono android-text-gradient-crimson">
              {top1.attendanceRate.toFixed(0)}%
            </div>
            <div className="text-[10px] text-rose-300/90 font-mono font-bold">
              {top1.eventsJoined}/{top1.totalEvents} WARS
            </div>
          </div>

          {/* #3 Bronze / Cyber Violet */}
          {top3 && (
            <div
              onClick={() => handleCardClick(top3.member)}
              className="p-3 rounded-2xl bg-[#090d1c]/90 border border-purple-500/40 text-center space-y-1 active:scale-95 transition-all cursor-pointer shadow-[0_4px_20px_rgba(168,85,247,0.2)]"
            >
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400 mx-auto flex items-center justify-center text-purple-300">
                <Award className="w-4 h-4 text-purple-300" />
              </div>
              <div className="text-[10px] font-mono font-black text-purple-400">#3 BRONZE</div>
              <div className="text-xs font-bold text-white truncate">{top3.member.name}</div>
              <div className="text-sm font-black font-mono text-purple-300">
                {top3.attendanceRate.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {top3.eventsJoined}/{top3.totalEvents} WARS
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cyber Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter ranked agents..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-[#090d1c] border border-cyan-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
        />
      </div>

      {/* Standings List */}
      <div className="rounded-3xl bg-[#060914]/90 border border-rose-500/20 divide-y divide-rose-500/10 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        {filtered.map(item => {
          const isTop3 = item.rank <= 3;
          return (
            <div
              key={item.member.id}
              onClick={() => handleCardClick(item.member)}
              className="p-3.5 flex items-center justify-between gap-3 active:bg-rose-500/5 cursor-pointer select-none transition-colors"
            >
              {/* Rank & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center text-xs font-black shrink-0 font-mono ${
                    item.rank === 1
                      ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.5)]'
                      : item.rank === 2
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                      : item.rank === 3
                      ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                      : 'bg-[#090d1c] text-slate-400 border border-slate-800'
                  }`}
                >
                  {item.rank}
                </span>

                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5 font-sans">
                    <span className="truncate">{item.member.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-black border border-rose-500/40">
                      {item.member.currentRank}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span className="text-cyan-300">{item.eventsJoined} / {item.totalEvents} Wars</span>
                    <span>•</span>
                    <span className="text-purple-300">Vote: {item.voteRate.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Turnout % & Progress Indicator */}
              <div className="text-right shrink-0">
                <div className="text-sm font-black font-mono text-cyan-300">
                  {item.attendanceRate.toFixed(0)}%
                </div>
                <div className="w-16 h-1.5 rounded-full bg-[#050812] border border-cyan-500/20 overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      item.attendanceRate >= 80
                        ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                        : item.attendanceRate >= 50
                        ? 'bg-gradient-to-r from-rose-500 to-cyan-400'
                        : 'bg-rose-500'
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
