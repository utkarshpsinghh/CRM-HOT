import React, { useState, useMemo } from 'react';
import { Member, AllianceRank, CommunicationStatus } from '../../types/crm';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { CommunicationBadge, ActivityBadge } from '../common/StatusBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { GameButton } from '../common/GameButton';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Users,
  Search,
  Filter,
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
    archiveMember,
    setSelectedMemberForProfile,
    inactiveInsights,
    memberFilter,
    setMemberFilter,
  } = useCRM();

  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'strikes' | 'status'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [memberToArchive, setMemberToArchive] = useState<Member | null>(null);

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
      }
      return sortOrder === 'asc' ? -comp : comp;
    });
  }, [filteredMembers, sortBy, sortOrder]);

  const handleToggleSort = (field: 'rank' | 'name' | 'strikes' | 'status') => {
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
            <Users className="w-6 h-6 text-[#ca8a04]" />
            <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
              HOT Alliance Roster
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#713f12]/50 border border-[#ca8a04] text-[#fef3c7] font-bold font-mono">
              {sortedMembers.length} Members
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Manage ranks, disciplinary strikes, communication status, and dossiers.
          </p>
        </div>

        <GameButton
          variant="gold"
          size="md"
          onClick={onOpenAddMember}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Induct Member
        </GameButton>
      </div>

      {/* Filter & Search Bar (Section 23) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#141824] border border-[#524126] shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search IGN */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberFilter.search}
              onChange={e => setMemberFilter(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search member by in-game name..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0c0e16] border border-[#3f311c] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04]"
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
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#3f311c] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04]"
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
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#3f311c] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04]"
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
              className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#3f311c] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04]"
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
        <div className="flex items-center justify-between text-xs text-stone-400 pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] uppercase font-fantasy text-[#ca8a04] mr-1">Quick Filters:</span>
            <button
              onClick={() => setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 1 })}
              className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                memberFilter.strikeMin > 0
                  ? 'bg-red-950 text-red-200 border-red-500'
                  : 'bg-[#181c28] text-stone-300 border-[#3f311c] hover:border-[#ca8a04]'
              }`}
            >
              ⚠️ Members with Strikes
            </button>
            <button
              onClick={() => setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'Needs Attention', strikeMin: 0 })}
              className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                memberFilter.status === 'Needs Attention'
                  ? 'bg-amber-950 text-amber-200 border-amber-500'
                  : 'bg-[#181c28] text-stone-300 border-[#3f311c] hover:border-[#ca8a04]'
              }`}
            >
              ⏳ Needs Attention
            </button>
            <button
              onClick={() => setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 0 })}
              className="px-2 py-0.5 rounded text-[11px] bg-stone-900 text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div className="text-[11px] text-stone-400">
            Showing <span className="font-bold text-[#fef08a]">{sortedMembers.length}</span> of {members.length}
          </div>
        </div>
      </div>

      {/* DESKTOP MEMBER TABLE (Section 8) */}
      <div className="hidden md:block rounded-xl bg-gradient-to-b from-[#191d2b] to-[#11141e] border-[1.5px] border-[#524126] shadow-xl overflow-hidden relative">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#0b0d14] text-[#fef08a] font-fantasy uppercase text-xs tracking-wider border-b border-[#524126]">
            <tr>
              <th
                onClick={() => handleToggleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Member IGN</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('rank')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Current Rank</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th className="py-3 px-4">Former Rank</th>
              <th
                onClick={() => handleToggleSort('strikes')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Strikes</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th className="py-3 px-4">Communication</th>
              <th
                onClick={() => handleToggleSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Activity Status</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2417] text-stone-200">
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-fantasy font-bold text-stone-300">No alliance members found</p>
                  <p className="text-xs">Try clearing your filters or search keywords.</p>
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

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-[#1f2537]/80 transition-colors group"
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
                        <span className="font-fantasy font-bold text-stone-100 group-hover:text-[#fef08a] transition-colors text-sm">
                          {member.name}
                        </span>
                        <div className="text-[10px] text-stone-500 font-mono">
                          ID: {member.id}
                        </div>
                      </div>
                    </td>

                    {/* Current Rank */}
                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    {/* Former Rank */}
                    <td className="py-3 px-4 font-mono text-stone-400">
                      {member.formerRank && member.formerRank !== 'None' ? (
                        <RankBadge rank={member.formerRank} size="sm" />
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
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
                      {member.communicationNote && (
                        <div className="text-[11px] text-stone-400 truncate max-w-[150px] mt-0.5 italic">
                          {member.communicationNote}
                        </div>
                      )}
                    </td>

                    {/* Activity */}
                    <td className="py-3 px-4">
                      <ActivityBadge status={activityStatus} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Dossier */}
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="p-1.5 rounded bg-stone-900 border border-stone-700 text-stone-300 hover:text-[#fef08a] hover:border-[#ca8a04] transition-colors cursor-pointer"
                          title="Open Member Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Strike */}
                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenAddStrike(member);
                          }}
                          className="p-1.5 rounded bg-red-950/50 border border-red-800 text-red-300 hover:bg-red-900/60 hover:border-red-600 transition-colors cursor-pointer"
                          title="Issue Disciplinary Strike"
                        >
                          <Flame className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenEditMember(member);
                          }}
                          className="p-1.5 rounded bg-stone-900 border border-stone-700 text-stone-300 hover:text-amber-300 hover:border-amber-600 transition-colors cursor-pointer"
                          title="Edit Member Information"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive / Soft Delete (Section 28) */}
                        {member.status !== 'Archived' && (
                          <button
                            onClick={() => {
                              sounds.playClick();
                              setMemberToArchive(member);
                            }}
                            className="p-1.5 rounded bg-stone-900 border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-700 transition-colors cursor-pointer"
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

      {/* MOBILE MEMBER CARDS (Section 29) */}
      <div className="md:hidden space-y-3">
        {sortedMembers.length === 0 ? (
          <div className="py-12 text-center text-stone-500 bg-[#141824] rounded-xl border border-[#3f311c]">
            <p className="font-fantasy font-bold text-stone-300">No alliance members found</p>
          </div>
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

            return (
              <div
                key={member.id}
                className="p-4 rounded-xl bg-gradient-to-b from-[#181d2a] to-[#10131d] border border-[#524126] shadow-md space-y-3"
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
                      <span className="font-fantasy font-bold text-[#fef08a] text-base">
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

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <ActivityBadge status={activityStatus} size="sm" />
                  <CommunicationBadge status={member.communication} size="sm" />
                </div>

                {member.communicationNote && (
                  <p className="text-xs text-stone-400 italic bg-[#0c0e16] p-2 rounded border border-[#3f311c]">
                    &ldquo;{member.communicationNote}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3f311c]">
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
          })
        )}
      </div>

      {/* Confirmation Modal for Archiving (Soft Delete - Section 28) */}
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
              Per Section 28 of HOT Alliance Charter, members are soft-deleted. Their complete historical event attendance, strikes, and war logs are preserved.
            </p>
          </div>
        }
        confirmLabel="Archive Member"
        variant="crimson"
      />
    </div>
  );
};
