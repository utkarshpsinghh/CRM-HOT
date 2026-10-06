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
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Crown,
  ExternalLink,
  FileSpreadsheet,
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
    syncGoogleSheetRoster,
    wipeAllMembers,
    settings,
    isSyncing,
  } = useCRM();

  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'strikes' | 'participation'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [memberToArchive, setMemberToArchive] = useState<Member | null>(null);

  // Sync Modal & Clean Refresh States
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTab, setSyncTab] = useState<'official' | 'sheet' | 'paste' | 'file'>('official');
  const [sheetUrl, setSheetUrl] = useState(
    settings.googleSheetUrl ||
      'https://docs.google.com/spreadsheets/d/1z_oPJgwZ2TE05MNe6DFa7-XBw9o1N-3eaLWEoDFCt8c/edit?gid=875082368#gid=875082368'
  );
  const [pastedRoster, setPastedRoster] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        if (text) {
          setPastedRoster(text);
          setSyncTab('paste');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteSync = async () => {
    sounds.playClick();
    if (syncTab === 'sheet') {
      const res = await syncGoogleSheetRoster(sheetUrl);
      if (res && res.success) {
        setIsSyncModalOpen(false);
      }
      return;
    }
    const textToSync = (syncTab === 'paste' || syncTab === 'file') ? pastedRoster : undefined;
    const res = await syncKingshotRoster(textToSync, replaceExisting);
    if (res && res.success) {
      setIsSyncModalOpen(false);
      setPastedRoster('');
    }
  };

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
          <h1 className="text-2xl sm:text-3xl font-fantasy font-black text-[#fffbeb] tracking-wide">
            Alliance Members
          </h1>
          <p className="text-xs text-stone-300 font-medium">
            {sortedMembers.length} warriors enrolled
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              sounds.playClick();
              setIsSyncModalOpen(true);
            }}
            disabled={isSyncing}
            className="btn-kingshot-cream px-3.5 py-2 text-xs font-fantasy font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            title="Update & synchronize member roster for HOT Alliance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{isSyncing ? 'Updating...' : 'Sync Roster'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Cartoon Search & Tactical Filters */}
      <div className="p-4 rounded-2xl bg-[#180e08] border-[3px] border-[#4a2610] shadow-[0_5px_0_#0f0703,0_10px_20px_rgba(0,0,0,0.4)] flex flex-wrap gap-3 items-center w-full min-w-0">
        {/* Search */}
        <div className="relative w-full sm:flex-1 min-w-0">
          <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={memberFilter.search}
            onChange={e => setMemberFilter(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search warrior by name..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#100905] border-2 border-[#381c0c] text-stone-100 text-xs font-medium focus:outline-none focus:border-[#fde047] shadow-inner placeholder:text-stone-500"
          />
          {memberFilter.search && (
            <button
              onClick={() => setMemberFilter(prev => ({ ...prev, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Rank */}
        <select
          value={memberFilter.rank}
          onChange={e => setMemberFilter(prev => ({ ...prev, rank: e.target.value }))}
          className="w-full sm:w-auto min-w-0 px-3 py-2 rounded-xl bg-[#100905] border-2 border-[#381c0c] text-stone-200 text-xs font-fantasy uppercase font-black focus:outline-none focus:border-[#fde047] shadow-inner cursor-pointer"
        >
          <option value="ALL">All Ranks (R5-R1)</option>
          <option value="R5">👑 R5 — Leader</option>
          <option value="R4">⚔️ R4 — Officer</option>
          <option value="R3">🛡️ R3 — Elite</option>
          <option value="R2">🪓 R2 — Warrior</option>
          <option value="R1">🛡️ R1 — Recruit</option>
        </select>

        {/* Filter Status */}
        <select
          value={memberFilter.status}
          onChange={e => setMemberFilter(prev => ({ ...prev, status: e.target.value }))}
          className="w-full sm:w-auto min-w-0 px-3 py-2 rounded-xl bg-[#100905] border-2 border-[#381c0c] text-stone-200 text-xs font-fantasy uppercase font-black focus:outline-none focus:border-[#fde047] shadow-inner cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">🟢 Active Only</option>
          <option value="Visitor">🔵 Visitor Only</option>
          <option value="Inactive">🔴 Inactive Only</option>
          <option value="Archived">⚪ Archived</option>
        </select>

        {/* Specific Event Selector */}
        <select
          value={selectedEventType}
          onChange={e => setSelectedEventType(e.target.value)}
          className="w-full sm:w-auto min-w-0 px-3 py-2 rounded-xl bg-[#100905] border-2 border-[#ca8a04] text-[#fef08a] text-xs font-fantasy uppercase font-black focus:outline-none focus:border-[#fde047] shadow-inner cursor-pointer"
        >
          <option value="ALL">All Wars Turnout</option>
          <option value="BT1">BT1 (Bear Trap 1)</option>
          <option value="BT2">BT2 (Bear Trap 2)</option>
          <option value="Swordland L1">Swordland L1</option>
          <option value="Swordland L2">Swordland L2</option>
          <option value="Tri Alliance L1">Tri Alliance L1</option>
          <option value="Tri Alliance L2">Tri Alliance L2</option>
        </select>

        {/* Quick Filter for Strikes */}
        <button
          onClick={() => setMemberFilter(prev => ({ ...prev, strikeMin: prev.strikeMin > 0 ? 0 : 1 }))}
          className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-fantasy uppercase font-black border-2 cursor-pointer transition-all shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none ${
            memberFilter.strikeMin > 0
              ? 'bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white border-[#fecaca]'
              : 'bg-[#221308] text-stone-300 border-[#47240f] hover:border-amber-500'
          }`}
        >
          🔥 With Strikes
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
                className="p-3.5 rounded-2xl bg-[#1e130c] border-2 border-[#522d14] space-y-2.5 shadow-[0_4px_0_rgba(0,0,0,0.4)] hover:border-amber-600/80 transition-all"
              >
                {/* Top row: Name, Rank, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      onClick={() => {
                        sounds.playClick();
                        setSelectedMemberForProfile(member);
                      }}
                      className="font-fantasy font-black text-sm sm:text-base text-[#fffbeb] hover:text-[#fbbf24] cursor-pointer truncate"
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
                    className="flex-1 py-1.5 px-2 rounded-xl bg-[#24170d] border border-[#522d14] hover:bg-[#341f12] text-stone-200 hover:text-white text-xs font-fantasy uppercase font-black flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-0.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenAddStrike(member);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-red-950/60 border border-red-800 hover:bg-red-900 text-red-200 text-xs font-fantasy uppercase font-black flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-0.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span>Strike</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenEditMember(member);
                    }}
                    className="p-1.5 rounded-xl bg-[#24170d] border border-[#522d14] hover:bg-[#341f12] text-stone-300 hover:text-white cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-0.5"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-300" />
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

      {/* Desktop Warrior Table */}
      <div className="hidden md:block kingshot-card overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-gradient-to-b from-[#2d180c] to-[#1c0f07] text-[#fef08a] font-fantasy uppercase tracking-wider text-xs border-b-[3px] border-[#4a2610]">
            <tr>
              <th
                onClick={() => handleToggleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-white select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Warrior Name</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('rank')}
                className="py-3.5 px-4 cursor-pointer hover:text-white select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Alliance Rank</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('participation')}
                className="py-3.5 px-4 cursor-pointer hover:text-amber-200 select-none"
              >
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span>{selectedEventType === 'ALL' ? 'War Turnout %' : `${selectedEventType} %`}</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('strikes')}
                className="py-3.5 px-4 cursor-pointer hover:text-white select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Strikes</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[#381c0c] text-stone-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="max-w-md mx-auto space-y-3 px-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400 shadow">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-base font-fantasy font-black text-[#fef08a] uppercase tracking-wide">
                      No Alliance Members Loaded
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      All previous manual/mock members have been removed. Use the sync tool below to paste your real HOT alliance roster or connect an API endpoint.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setIsSyncModalOpen(true);
                      }}
                      className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase tracking-wider inline-flex items-center gap-2 shadow cursor-pointer mt-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync / Import Real Members</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : sortedMembers.length === 0 ? (
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

      {/* Confirmation Modal for Wiping Previous Manual Members */}
      <ConfirmModal
        isOpen={isWipeConfirmOpen}
        onClose={() => setIsWipeConfirmOpen(false)}
        onConfirm={async () => {
          setIsWipeConfirmOpen(false);
          await wipeAllMembers();
        }}
        title="⚠️ Wipe Previous Manual Members"
        message="Are you sure you want to delete all current members? This will permanently remove all previous manual and mock members from both local storage and database, giving you a completely clean slate."
        confirmLabel="Wipe All Members"
        variant="crimson"
      />

      {/* Roster Sync & Import Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-b from-[#1c130d] to-[#140d09] border-2 border-[#3e2716] rounded-3xl shadow-2xl p-6 sm:p-7 w-full max-w-xl text-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2c1d15]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400 shadow">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-fantasy font-black text-lg text-[#fef08a] uppercase tracking-wide">
                    HOT Alliance Roster Sync
                  </h2>
                  <p className="text-xs text-stone-400">
                    Kingdom #1391 • HOT Alliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-[#2c1d15] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sync Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#120c08] border border-[#2c1d15]">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('official');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-fantasy font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'official'
                    ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Official HOT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('sheet');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-fantasy font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'sheet'
                    ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">Google Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('paste');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-fantasy font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'paste'
                    ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Paste CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('file');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-fantasy font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'file'
                    ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Upload File</span>
              </button>
            </div>

            {/* TAB 1: OFFICIAL HOT ROSTER */}
            {syncTab === 'official' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-[#120c08] border border-[#3e2716]">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-fantasy font-black text-[#fef08a] uppercase tracking-wide">
                    Kingdom #1391 [HOT] Roster (94 Members)
                  </span>
                </div>
                <div className="text-stone-300 text-xs leading-relaxed space-y-1.5">
                  <p>
                    <strong className="text-amber-300">Alliance Leader:</strong> Death Comes (R5)
                  </p>
                  <p>
                    <strong className="text-amber-300">R4 Officers:</strong> MoonLight, Sally, SnackLemon, Beepers, Panda, Emma, Death Farm, Moha
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Includes all 94 registered alliance members with live status, former ranks, strikes, and communication records.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2a1a10] text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Ready to sync into local storage and Supabase PostgreSQL.</span>
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SHEET */}
            {syncTab === 'sheet' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-[#120c08] border border-[#3e2716]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-fantasy font-black text-[#fef08a] uppercase tracking-wide">
                      Official HOT Alliance Google Sheet
                    </span>
                  </div>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1 font-semibold"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-400 uppercase">
                    Google Spreadsheet URL
                  </label>
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#1a1410] border border-[#3e2716] text-[#fffbeb] text-xs font-mono focus:outline-none focus:border-[#ca8a04]"
                  />
                </div>

                <div className="text-[11px] text-stone-400 space-y-1 leading-relaxed bg-[#170e09] p-2.5 rounded-xl border border-[#2b180d]">
                  <p className="text-stone-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Direct Roster Synchronization:</span>
                  </p>
                  <p>
                    Downloads the live CSV export from your Google Sheet and updates all alliance member ranks, battle power, strikes, and communications.
                  </p>
                  <p className="text-amber-400/90 text-[10px]">
                    Note: If Google returns restricted/unauthorized, ensure the sheet Sharing permissions are set to "Anyone with the link can view".
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PASTE CSV / TEXT */}
            {syncTab === 'paste' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span>Paste CSV or in-game player list:</span>
                  <span className="text-amber-300 font-mono">Auto-detects CSV &amp; Ranks</span>
                </div>
                <textarea
                  value={pastedRoster}
                  onChange={e => setPastedRoster(e.target.value)}
                  rows={6}
                  placeholder={`Name,Current Rank,Former Rank,Strikes,Communication,Status\nMoonLight,R4,R5,0,Good,Active\nDeath Comes,R5,R4,0,Good,Active\nSally,R4,R3,0,Good,Active`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-xs font-mono focus:outline-none focus:border-[#ca8a04] placeholder:text-stone-600"
                />
                <p className="text-[11px] text-stone-500">
                  Supports comma-separated values (CSV) or player lines with R1–R5 ranks.
                </p>
              </div>
            )}

            {/* TAB 4: FILE UPLOAD */}
            {syncTab === 'file' && (
              <div className="space-y-3">
                <label className="block text-xs font-fantasy font-bold text-stone-300 uppercase">
                  Select Roster File (.txt, .csv, .json)
                </label>
                <div className="border-2 border-dashed border-[#3e2716] hover:border-amber-500/60 rounded-2xl p-6 text-center cursor-pointer bg-[#120c08] transition-colors">
                  <input
                    type="file"
                    accept=".txt,.csv,.json"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-fantasy file:font-black file:uppercase file:bg-amber-600 file:text-black cursor-pointer"
                  />
                  <p className="text-[11px] text-stone-500 mt-2">
                    Upload your roster export file from spreadsheets or Discord.
                  </p>
                </div>
                {pastedRoster && (
                  <p className="text-xs text-emerald-400">
                    ✓ File loaded ({pastedRoster.split('\n').filter(Boolean).length} lines ready)
                  </p>
                )}
              </div>
            )}

            {/* CLEAN REFRESH OPTION */}
            <div className="p-3 rounded-xl bg-[#120c08] border border-[#3e2716]">
              <label className="text-xs font-bold text-amber-200 cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-stone-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Clean Refresh: Replace All Previous Members</span>
              </label>
              <p className="text-[11px] text-stone-400 mt-0.5 ml-6">
                Removes any previous manual or mock members and exclusively loads this roster.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#2c1d15]">
              <button
                type="button"
                onClick={handleExecuteSync}
                disabled={
                  isSyncing ||
                  ((syncTab === 'paste' || syncTab === 'file') && !pastedRoster.trim()) ||
                  (syncTab === 'sheet' && !sheetUrl.trim())
                }
                className="btn-kingshot-gold flex-1 py-2.5 text-xs font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing
                    ? 'Synchronizing...'
                    : syncTab === 'official'
                    ? 'Sync Official Roster (94 Members)'
                    : syncTab === 'sheet'
                    ? 'Sync from Google Sheet'
                    : 'Sync & Save Roster'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1c130d] hover:bg-[#2c1d15] text-stone-300 text-xs font-fantasy font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* WIPE PREVIOUS MANUAL MEMBERS ACTION */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSyncModalOpen(false);
                  setIsWipeConfirmOpen(true);
                }}
                className="text-[11px] text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
              >
                Wipe all previous manual/mock members now (Clean Slate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
