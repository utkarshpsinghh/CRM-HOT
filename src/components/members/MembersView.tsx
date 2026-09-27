import React, { useState, useMemo } from 'react';
import { Member, AllianceRank } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { CommunicationBadge, ActivityBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { GameButton } from '../common/GameButton';
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
  TrendingUp,
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

  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'strikes' | 'status' | 'participation'>('rank');
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

  // Rank weight for sorting
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
      // Search
      if (
        memberFilter.search &&
        !m.name.toLowerCase().includes(memberFilter.search.toLowerCase())
      ) {
        return false;
      }
      // Rank filter
      if (memberFilter.rank !== 'ALL' && m.currentRank !== memberFilter.rank) {
        return false;
      }
      // Communication filter
      if (memberFilter.comm !== 'ALL' && m.communication !== memberFilter.comm) {
        return false;
      }
      // Status filter
      if (memberFilter.status !== 'ALL') {
        if (memberFilter.status === 'Archived') {
          if (m.status !== 'Archived') return false;
        } else if (memberFilter.status === 'Needs Attention') {
          const isWarning = inactiveInsights.some(i => i.member.id === m.id);
          if (!isWarning || m.status === 'Archived') return false;
        } else if (m.status !== memberFilter.status) {
          return false;
        }
      } else {
        // By default show active & inactive, omit archived unless specifically selected
        if (m.status === 'Archived') return false;
      }
      // Minimum strikes
      if (memberFilter.strikeMin > 0 && m.strikes < memberFilter.strikeMin) {
        return false;
      }
      return true;
    });
  }, [members, memberFilter, inactiveInsights]);

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
      } else if (sortBy === 'status') {
        comp = a.status.localeCompare(b.status);
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
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#fbbf24]" />
            <h1 className="font-kingshot text-2xl sm:text-3xl text-[#fffbeb] tracking-wide drop-shadow-md">
              HOT Alliance Roster
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#52290d] border border-[#d97706] text-[#fde68a] font-bold font-mono">
              {sortedMembers.length} Members
            </span>
          </div>
          <p className="text-xs text-stone-300 mt-0.5">
            Manage ranks, event participation percentages, disciplinary strikes, and dossiers.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onOpenAddMember();
          }}
          className="btn-kingshot-gold px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
        >
          <UserPlus className="w-4 h-4 stroke-[3]" />
          <span>INDUCT MEMBER</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#2a1408] border-2 border-[#54290d] shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search IGN */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberFilter.search}
              onChange={e => setMemberFilter(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search member by in-game name..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1a0a03] border border-[#52290d] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
            />
            {memberFilter.search && (
              <button
                onClick={() => setMemberFilter(prev => ({ ...prev, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Rank */}
          <div>
            <select
              value={memberFilter.rank}
              onChange={e => setMemberFilter(prev => ({ ...prev, rank: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[#1a0a03] border border-[#52290d] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">Rank: All Ranks</option>
              <option value="R5">R5 — Supreme Leader</option>
              <option value="R4">R4 — War Officers</option>
              <option value="R3">R3 — Veteran Elites</option>
              <option value="R2">R2 — Proven Warriors</option>
              <option value="R1">R1 — Recruits</option>
            </select>
          </div>

          {/* Filter Communication */}
          <div>
            <select
              value={memberFilter.comm}
              onChange={e => setMemberFilter(prev => ({ ...prev, comm: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[#1a0a03] border border-[#52290d] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">Comms: All Statuses</option>
              <option value="Good">🟢 Good Only</option>
              <option value="Warning">🟡 Warning Only</option>
              <option value="Poor">🔴 Poor Only</option>
              <option value="Unknown">⚪ Unknown</option>
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={memberFilter.status}
              onChange={e => setMemberFilter(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[#1a0a03] border border-[#52290d] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="ALL">Status: Active & Inactive</option>
              <option value="Active">🟢 Active Only</option>
              <option value="Needs Attention">🟡 Needs Attention</option>
              <option value="Inactive">🔴 Inactive Only</option>
              <option value="Archived">⚪ Archived (Soft Deleted)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center justify-between text-xs text-stone-300 pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] uppercase font-bold text-[#fbbf24] mr-1">Quick Filters:</span>
            <button
              onClick={() => setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 1 })}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                memberFilter.strikeMin > 0
                  ? 'bg-red-950 text-red-200 border-red-500'
                  : 'bg-[#1f0e05] text-stone-300 border-[#52290d] hover:border-[#fbbf24]'
              }`}
            >
              ⚠️ With Strikes
            </button>
            <button
              onClick={() => setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'Needs Attention', strikeMin: 0 })}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                memberFilter.status === 'Needs Attention'
                  ? 'bg-amber-950 text-amber-200 border-amber-500'
                  : 'bg-[#1f0e05] text-stone-300 border-[#52290d] hover:border-[#fbbf24]'
              }`}
            >
              ⏳ Needs Attention
            </button>
            <button
              onClick={() => handleToggleSort('participation')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer flex items-center gap-1 ${
                sortBy === 'participation'
                  ? 'bg-emerald-900 text-emerald-200 border-emerald-400'
                  : 'bg-[#1f0e05] text-stone-300 border-[#52290d] hover:border-[#fbbf24]'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Sort by Participation %</span>
            </button>
            <button
              onClick={() => setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 0 })}
              className="px-2 py-0.5 rounded text-[11px] bg-stone-900 text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="text-[11px] text-stone-300">
            Showing <span className="font-bold text-[#fef08a]">{sortedMembers.length}</span> of {members.length}
          </div>
        </div>
      </div>

      {/* DESKTOP MEMBER TABLE WITH EVENT PARTICIPATION PERCENTAGES */}
      <div className="hidden md:block rounded-xl bg-[#281307] border-2 border-[#572b0f] shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#1c0c04] text-[#fef08a] font-kingshot uppercase text-xs tracking-wider border-b-2 border-[#542d13]">
            <tr>
              <th
                onClick={() => handleToggleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Member IGN</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('rank')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Current Rank</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              {/* TOTAL PERCENTAGE OF EACH MEMBER PARTICIPATED IN EACH EVENT */}
              <th
                onClick={() => handleToggleSort('participation')}
                className="py-3.5 px-4 cursor-pointer hover:text-[#fbbf24] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-[#fbbf24]">
                  <span>Participation %</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </th>
              <th className="py-3.5 px-4">Events History</th>
              <th
                onClick={() => handleToggleSort('strikes')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Strikes</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th className="py-3.5 px-4">Communication</th>
              <th
                onClick={() => handleToggleSort('status')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Activity</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3d1d0a] text-stone-200">
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <p className="font-kingshot text-lg text-stone-300">No alliance members found</p>
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
                    className="hover:bg-[#381a09]/90 transition-colors group"
                  >
                    {/* Member IGN */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="cursor-pointer"
                      >
                        <span className="font-bold text-stone-100 group-hover:text-[#fef08a] transition-colors text-sm">
                          {member.name}
                        </span>
                        <div className="text-[10px] text-stone-400 font-mono">
                          ID: {member.id}
                        </div>
                      </div>
                    </td>

                    {/* Current Rank */}
                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    {/* Total Participation Percentage */}
                    <td className="py-3 px-4">
                      <div className="min-w-[110px]">
                        <div className="flex items-baseline justify-between mb-1">
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
                            ({joinedRatio})
                          </span>
                        </div>
                        {/* Mini visual bar */}
                        <div className="w-full h-1.5 bg-[#170a03] rounded-full overflow-hidden border border-[#52290d]">
                          <div
                            className={`h-full rounded-full ${
                              partPct >= 75
                                ? 'bg-emerald-500'
                                : partPct >= 50
                                ? 'bg-amber-400'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.round(partPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Per-event micro-badges showing exact participation in each event */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {partStats?.perEvent.map(pe => (
                          <span
                            key={pe.eventId}
                            title={`${pe.eventType}: ${pe.joined ? '✓ Joined' : pe.voteStatus === 'YES' ? '⚠️ Flaked' : '✗ Missed'}`}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold select-none ${
                              pe.joined
                                ? 'bg-emerald-900 text-emerald-200 border border-emerald-600'
                                : pe.voteStatus === 'YES'
                                ? 'bg-red-900 text-red-200 border border-red-500'
                                : 'bg-[#1b0c04] text-stone-500 border border-[#3b1704]'
                            }`}
                          >
                            {pe.joined ? '✓' : pe.voteStatus === 'YES' ? '!' : '—'}
                          </span>
                        ))}
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

                    {/* Communication */}
                    <td className="py-3 px-4">
                      <CommunicationBadge status={member.communication} size="sm" />
                    </td>

                    {/* Activity */}
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
                          className="p-1.5 rounded bg-[#1f0d03] border border-[#52290d] text-stone-300 hover:text-[#fbbf24] hover:border-[#fbbf24] transition-colors cursor-pointer"
                          title="Open Member Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenAddStrike(member);
                          }}
                          className="p-1.5 rounded bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900 hover:border-red-500 transition-colors cursor-pointer"
                          title="Issue Disciplinary Strike"
                        >
                          <Flame className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenEditMember(member);
                          }}
                          className="p-1.5 rounded bg-[#1f0d03] border border-[#52290d] text-stone-300 hover:text-amber-300 hover:border-amber-500 transition-colors cursor-pointer"
                          title="Edit Member Information"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {member.status !== 'Archived' && (
                          <button
                            onClick={() => {
                              sounds.playClick();
                              setMemberToArchive(member);
                            }}
                            className="p-1.5 rounded bg-[#1f0d03] border border-[#52290d] text-stone-400 hover:text-red-400 hover:border-red-600 transition-colors cursor-pointer"
                            title="Soft-Delete / Archive Member"
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

      {/* MOBILE MEMBER CARDS WITH PARTICIPATION % */}
      <div className="md:hidden space-y-3">
        {sortedMembers.map(member => {
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
            <div
              key={member.id}
              className="p-4 rounded-xl bg-gradient-to-b from-[#2a1408] to-[#1c0c04] border-2 border-[#52290d] shadow-md space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  onClick={() => {
                    sounds.playClick();
                    setSelectedMemberForProfile(member);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#fef08a] text-base">
                      {member.name}
                    </span>
                    <RankBadge rank={member.currentRank} size="sm" />
                  </div>
                  {member.formerRank && member.formerRank !== 'None' && (
                    <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                      Ex: {member.formerRank}
                    </div>
                  )}
                </div>

                <StrikeBadge
                  count={member.strikes}
                  size="sm"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedMemberForProfile(member);
                  }}
                />
              </div>

              {/* Mobile Participation Progress */}
              <div className="p-2.5 rounded-lg bg-[#140802] border border-[#451f08]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#fbbf24] font-bold">Event Participation:</span>
                  <span
                    className={`font-mono font-bold ${
                      partPct >= 75 ? 'text-emerald-400' : partPct >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    {partPct.toFixed(1)}% ({joinedRatio} Joined)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#220d03] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      partPct >= 75 ? 'bg-emerald-500' : partPct >= 50 ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(partPct)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <ActivityBadge status={activityStatus} size="sm" />
                <CommunicationBadge status={member.communication} size="sm" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#4d2309]">
                <GameButton
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMemberForProfile(member)}
                  icon={<Eye className="w-3.5 h-3.5" />}
                >
                  Dossier
                </GameButton>

                <GameButton
                  variant="crimson"
                  size="sm"
                  onClick={() => onOpenAddStrike(member)}
                  icon={<Flame className="w-3.5 h-3.5" />}
                >
                  Strike
                </GameButton>

                <GameButton
                  variant="slate"
                  size="sm"
                  onClick={() => onOpenEditMember(member)}
                  icon={<Edit className="w-3.5 h-3.5" />}
                >
                  Edit
                </GameButton>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Archiving */}
      <ConfirmModal
        isOpen={Boolean(memberToArchive)}
        onClose={() => setMemberToArchive(null)}
        onConfirm={handleConfirmArchive}
        title="⚠️ Archive Alliance Member"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to archive <strong>{memberToArchive?.name}</strong>?
            </p>
            <p className="text-stone-400 text-xs">
              Members are soft-deleted. Their complete historical event attendance, participation percentages, and strike logs are preserved.
            </p>
          </div>
        }
        confirmLabel="Archive Member"
        variant="crimson"
      />
    </div>
  );
};
