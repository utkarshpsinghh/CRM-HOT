import React, { useState, useMemo } from 'react';
import { Member, AllianceRank, MemberActivityStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { ActivityBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import { calculateMemberParticipation } from '../../utils/participation';
import {
  Users,
  Search,
  UserPlus,
  Flame,
  Archive,
  Edit,
  Eye,
  ArrowUpDown,
  X,
  RefreshCw,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface MembersViewProps {
  onOpenAddMember: () => void;
  onOpenEditMember: (member: Member) => void;
  onOpenAddStrike: (member: Member) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  onOpenAddMember,
  onOpenEditMember,
  onOpenAddStrike,
}) => {
  const {
    members,
    events,
    attendance,
    archiveMember,
    setSelectedMemberForProfile,
    inactiveInsights,
    memberFilter,
    setMemberFilter,
    syncKingshotRoster,
    isSyncing,
  } = useCRM();

  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'strikes' | 'participation'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [memberToArchive, setMemberToArchive] = useState<Member | null>(null);

  // Pre-calculate participation stats for each member
  const memberParticipationMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateMemberParticipation>>();
    members.forEach(m => {
      map.set(m.id, calculateMemberParticipation(m.id, events, attendance));
    });
    return map;
  }, [members, events, attendance]);

  const rankWeights: Record<AllianceRank, number> = {
    R5: 5,
    R4: 4,
    R3: 3,
    R2: 2,
    R1: 1,
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (
        memberFilter.search &&
        !m.name.toLowerCase().includes(memberFilter.search.toLowerCase())
      ) {
        return false;
      }
      if (memberFilter.rank !== 'ALL' && m.currentRank !== memberFilter.rank) {
        return false;
      }
      if (memberFilter.status !== 'ALL') {
        if (memberFilter.status === 'Archived') {
          if (m.status !== 'Archived') return false;
        } else if (memberFilter.status === 'Inactive') {
          if (m.status !== 'Inactive') return false;
        } else if (m.status !== memberFilter.status) {
          return false;
        }
      } else {
        if (m.status === 'Archived') return false;
      }
      if (memberFilter.strikeMin > 0 && m.strikes < memberFilter.strikeMin) {
        return false;
      }
      return true;
    });
  }, [members, memberFilter]);

  // Sort filtered members
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'rank') {
        comp = rankWeights[b.currentRank] - rankWeights[a.currentRank];
      } else if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === 'strikes') {
        comp = b.strikes - a.strikes;
      } else if (sortBy === 'participation') {
        const statsA = memberParticipationMap.get(a.id);
        const statsB = memberParticipationMap.get(b.id);
        const partA = selectedEventType === 'ALL'
          ? (statsA?.percentage || 0)
          : (statsA?.perType[selectedEventType]?.percentage || 0);
        const partB = selectedEventType === 'ALL'
          ? (statsB?.percentage || 0)
          : (statsB?.perType[selectedEventType]?.percentage || 0);
        comp = partB - partA;
      }
      return sortOrder === 'asc' ? -comp : comp;
    });
  }, [filteredMembers, sortBy, sortOrder, memberParticipationMap, selectedEventType]);

  const handleToggleSort = (field: typeof sortBy) => {
    sounds.playClick();
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleConfirmArchive = async () => {
    if (memberToArchive) {
      await archiveMember(memberToArchive.id);
      setMemberToArchive(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#fffbeb] tracking-tight">
            Alliance Members
          </h1>
          <p className="text-xs text-stone-300">
            {sortedMembers.length} members enrolled
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => syncKingshotRoster()}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-[#24170d] hover:bg-[#341f12] text-amber-300 border border-[#522d14] hover:border-amber-500/60 text-xs font-fantasy uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm disabled:opacity-50"
            title="Fetch & synchronize latest Kingshot roster for Kingdom #1391 [HOT]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Kingshot API'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-kingshot-gold px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Simple Search & Filters */}
      <div className="p-3 rounded-lg bg-[#20150f] border border-[#4d2b14] flex flex-wrap gap-2.5 items-center w-full min-w-0">
        {/* Search */}
        <div className="relative w-full sm:flex-1 min-w-0">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={memberFilter.search}
            onChange={e => setMemberFilter(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search by player name..."
            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
          />
          {memberFilter.search && (
            <button
              onClick={() => setMemberFilter(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Rank */}
        <select
          value={memberFilter.rank}
          onChange={e => setMemberFilter(prev => ({ ...prev, rank: e.target.value }))}
          className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
        >
          <option value="ALL">All Ranks</option>
          <option value="R5">R5 — Leader</option>
          <option value="R4">R4 — Officer</option>
          <option value="R3">R3 — Elite</option>
          <option value="R2">R2 — Warrior</option>
          <option value="R1">R1 — Recruit</option>
        </select>

        {/* Filter Status */}
        <select
          value={memberFilter.status}
          onChange={e => setMemberFilter(prev => ({ ...prev, status: e.target.value }))}
          className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
        >
          <option value="ALL">All Active / Visitor / Inactive</option>
          <option value="Active">Active Only</option>
          <option value="Visitor">Visitor Only</option>
          <option value="Inactive">Inactive Only</option>
          <option value="Archived">Archived</option>
        </select>

        {/* Specific Event Selector */}
        <select
          value={selectedEventType}
          onChange={e => setSelectedEventType(e.target.value)}
          className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-amber-300 text-xs font-semibold focus:outline-none focus:border-[#fbbf24]"
        >
          <option value="ALL">All War Events Attendance</option>
          <option value="BT1">BT1 (Bear Trap 1) Attendance</option>
          <option value="BT2">BT2 (Bear Trap 2) Attendance</option>
          <option value="Swordland L1">Swordland L1 Attendance</option>
          <option value="Swordland L2">Swordland L2 Attendance</option>
          <option value="Tri Alliance L1">Tri Alliance L1 Attendance</option>
          <option value="Tri Alliance L2">Tri Alliance L2 Attendance</option>
        </select>

        {/* Quick Filter for Strikes */}
        <button
          onClick={() => setMemberFilter(prev => ({ ...prev, strikeMin: prev.strikeMin > 0 ? 0 : 1 }))}
          className={`w-full sm:w-auto px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
            memberFilter.strikeMin > 0
              ? 'bg-red-950 text-red-200 border-red-500'
              : 'bg-[#140c08] text-stone-300 border-[#3d200e] hover:border-[#b45309]'
          }`}
        >
          With Strikes
        </button>
      </div>

      {/* Mobile Member Cards (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {sortedMembers.length === 0 ? (
          <div className="p-8 text-center text-stone-400 bg-[#20150f] rounded-2xl border border-[#4d2b14]">
            No members found matching your search.
          </div>
        ) : (
          sortedMembers.map(member => {
            const isInactive = inactiveInsights.some(i => i.member.id === member.id);
            const activityStatus: MemberActivityStatus = member.status === 'Archived'
              ? 'Archived'
              : member.status === 'Visitor'
              ? 'Visitor'
              : isInactive
              ? 'Needs Attention'
              : member.status === 'Inactive'
              ? 'Inactive'
              : 'Active';

            const partStats = memberParticipationMap.get(member.id);
            const typeStat = selectedEventType !== 'ALL' ? partStats?.perType[selectedEventType] : null;
            const activePct = typeStat ? typeStat.percentage : (partStats ? partStats.percentage : 0);
            const activeRatio = typeStat ? `${typeStat.joined}/${typeStat.total}` : (partStats ? `${partStats.joinedCount}/${partStats.totalEvents}` : '0/0');
            const activeTitle = selectedEventType === 'ALL' ? 'War Attendance' : `${selectedEventType} Attendance`;

            return (
              <div
                key={member.id}
                className="p-3.5 rounded-2xl bg-[#20150f] border-2 border-[#4d2b14] space-y-2.5 shadow-sm"
              >
                {/* Top row: Name, Rank, Status */}
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
                  </div>
                  <ActivityBadge status={activityStatus} size="sm" />
                </div>

                {/* Middle row: Attendance bar & Strikes */}
                <div className="p-2.5 rounded-xl bg-[#140c08] border border-[#3d200e] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-300/80">{activeTitle}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            activePct >= 75
                              ? 'text-emerald-400'
                              : activePct >= 50
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {activePct.toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          ({activeRatio} wars)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-stone-400">Strikes</div>
                      <div className="mt-0.5">
                        <StrikeBadge
                          count={member.strikes}
                          size="sm"
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6 Core Events All-Time Attendance % Mini-Grid */}
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#24130a] text-[10px]">
                    {(['BT1', 'BT2', 'Swordland L1', 'Swordland L2', 'Tri Alliance L1', 'Tri Alliance L2'] as const).map(eType => {
                      const s = partStats?.perType[eType];
                      const pct = s ? s.percentage : 0;
                      const isSelected = selectedEventType === eType;
                      const shortName = eType.replace('Swordland ', 'SW').replace('Tri Alliance ', 'TRI');
                      return (
                        <div
                          key={eType}
                          onClick={() => setSelectedEventType(prev => prev === eType ? 'ALL' : eType)}
                          className={`px-1.5 py-0.5 rounded flex items-center justify-between font-mono cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-amber-950/80 border border-amber-500/70 text-amber-200'
                              : 'bg-[#180e0a] border border-[#2b160b] text-stone-300 hover:border-stone-600'
                          }`}
                        >
                          <span className="text-[9px] font-sans text-stone-400">{shortName}:</span>
                          <span className={`text-[10px] ${
                            s && s.total > 0
                              ? pct >= 75 ? 'text-emerald-400 font-bold' : pct >= 50 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'
                              : 'text-stone-600'
                          }`}>
                            {s && s.total > 0 ? `${pct.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom row: Quick action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#3d200e]">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setSelectedMemberForProfile(member);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#170e09] border border-[#3d200e] text-stone-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenAddStrike(member);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-red-950/40 border border-red-900/60 text-red-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span>Strike</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenEditMember(member);
                    }}
                    className="p-1.5 rounded-lg bg-[#170e09] border border-[#3d200e] text-stone-300 hover:text-white cursor-pointer"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  {member.status !== 'Archived' && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setMemberToArchive(member);
                      }}
                      className="p-1.5 rounded-lg bg-[#170e09] border border-[#3d200e] text-stone-400 hover:text-red-400 cursor-pointer"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Member Table (Hidden on screens < md) */}
      <div className="hidden md:block rounded-xl bg-[#20150f] border border-[#4d2b14] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#170e09] text-stone-300 font-semibold text-xs border-b border-[#3d200e]">
            <tr>
              <th
                onClick={() => handleToggleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Player Name</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('rank')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Rank</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('participation')}
                className="py-3 px-4 cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span>{selectedEventType === 'ALL' ? 'War Attendance %' : `${selectedEventType} %`}</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('strikes')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Strikes</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                </div>
              </th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a170b] text-stone-200">
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-stone-400">
                  No members found matching your search.
                </td>
              </tr>
            ) : (
              sortedMembers.map(member => {
                const isInactive = inactiveInsights.some(i => i.member.id === member.id);
                const activityStatus: MemberActivityStatus = member.status === 'Archived'
                  ? 'Archived'
                  : member.status === 'Visitor'
                  ? 'Visitor'
                  : isInactive
                  ? 'Needs Attention'
                  : member.status === 'Inactive'
                  ? 'Inactive'
                  : 'Active';

                const partStats = memberParticipationMap.get(member.id);
                const typeStat = selectedEventType !== 'ALL' ? partStats?.perType[selectedEventType] : null;
                const activePct = typeStat ? typeStat.percentage : (partStats ? partStats.percentage : 0);
                const activeRatio = typeStat ? `${typeStat.joined}/${typeStat.total}` : (partStats ? `${partStats.joinedCount}/${partStats.totalEvents}` : '0/0');

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-[#271a13] transition-colors"
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <span
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="font-bold text-stone-100 hover:text-[#fbbf24] cursor-pointer text-sm"
                      >
                        {member.name}
                      </span>
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    {/* Attendance % */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-xs ${
                              activePct >= 75
                                ? 'text-emerald-400'
                                : activePct >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {activePct.toFixed(0)}%
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono">
                            ({activeRatio})
                          </span>
                        </div>

                        {/* Mini per-event breakdown pills */}
                        <div className="flex items-center gap-1">
                          {(['BT1', 'BT2', 'Swordland L1', 'Swordland L2', 'Tri Alliance L1', 'Tri Alliance L2'] as const).map(eType => {
                            const s = partStats?.perType[eType];
                            const pct = s ? s.percentage : 0;
                            const isSelected = selectedEventType === eType;
                            const shortLabel = eType.replace('Swordland ', 'SW').replace('Tri Alliance ', 'TRI');
                            return (
                              <button
                                key={eType}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sounds.playClick();
                                  setSelectedEventType(prev => prev === eType ? 'ALL' : eType);
                                }}
                                title={`${eType}: ${s ? `${s.joined}/${s.total} (${pct.toFixed(0)}%)` : '0/0'}`}
                                className={`text-[9px] px-1 py-0.5 rounded font-mono border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                                    : pct > 0
                                    ? 'bg-[#140c08] border-[#3d200e] text-stone-300 hover:border-amber-600'
                                    : 'bg-[#140c08] border-[#25140a] text-stone-600 hover:border-stone-500'
                                }`}
                              >
                                {shortLabel}:{s && s.total > 0 ? `${pct.toFixed(0)}%` : '—'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </td>

                    {/* Strikes */}
                    <td className="py-3 px-4">
                      <StrikeBadge
                        count={member.strikes}
                        size="sm"
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                      />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <ActivityBadge status={activityStatus} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="p-1.5 rounded bg-[#170e09] border border-[#3d200e] text-stone-300 hover:text-white hover:border-[#fbbf24] transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenAddStrike(member);
                          }}
                          className="p-1.5 rounded bg-red-950/40 border border-red-900/60 text-red-300 hover:text-red-100 hover:border-red-500 transition-colors cursor-pointer"
                          title="Add Strike"
                        >
                          <Flame className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenEditMember(member);
                          }}
                          className="p-1.5 rounded bg-[#170e09] border border-[#3d200e] text-stone-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {member.status !== 'Archived' && (
                          <button
                            onClick={() => {
                              sounds.playClick();
                              setMemberToArchive(member);
                            }}
                            className="p-1.5 rounded bg-[#170e09] border border-[#3d200e] text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToArchive)}
        onClose={() => setMemberToArchive(null)}
        onConfirm={handleConfirmArchive}
        title="Archive Member"
        message={`Are you sure you want to archive ${memberToArchive?.name}? Their event history will be safely preserved.`}
        confirmLabel="Archive"
        variant="crimson"
      />
    </div>
  );
};
