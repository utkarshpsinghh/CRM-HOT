import React, { useState, useMemo } from 'react';
import { Member, AllianceRank } from '../../types/crm';
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
  } = useCRM();

  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'strikes' | 'participation'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
        const partA = memberParticipationMap.get(a.id)?.percentage || 0;
        const partB = memberParticipationMap.get(b.id)?.percentage || 0;
        comp = partB - partA;
      }
      return sortOrder === 'asc' ? -comp : comp;
    });
  }, [filteredMembers, sortBy, sortOrder, memberParticipationMap]);

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

        <button
          onClick={() => {
            sounds.playClick();
            onOpenAddMember();
          }}
          className="btn-kingshot-gold px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Simple Search & Filters */}
      <div className="p-3 rounded-lg bg-[#20150f] border border-[#4d2b14] flex flex-wrap gap-2.5 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
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
          className="px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
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
          className="px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
        >
          <option value="ALL">Active & Inactive</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
          <option value="Archived">Archived</option>
        </select>

        {/* Quick Filter for Strikes */}
        <button
          onClick={() => setMemberFilter(prev => ({ ...prev, strikeMin: prev.strikeMin > 0 ? 0 : 1 }))}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
            memberFilter.strikeMin > 0
              ? 'bg-red-950 text-red-200 border-red-500'
              : 'bg-[#140c08] text-stone-300 border-[#3d200e] hover:border-[#b45309]'
          }`}
        >
          With Strikes
        </button>
      </div>

      {/* Clean Member Table */}
      <div className="rounded-xl bg-[#20150f] border border-[#4d2b14] overflow-hidden shadow-sm">
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
                  <span>Attendance %</span>
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
                const activityStatus = member.status === 'Archived'
                  ? 'Inactive'
                  : isInactive
                  ? 'Needs Attention'
                  : member.status === 'Inactive'
                  ? 'Inactive'
                  : 'Active';

                const partStats = memberParticipationMap.get(member.id);
                const partPct = partStats ? partStats.percentage : 0;
                const joinedRatio = partStats ? `${partStats.joinedCount}/${partStats.totalEvents}` : '0/0';

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
                          {partPct.toFixed(0)}%
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          ({joinedRatio})
                        </span>
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
