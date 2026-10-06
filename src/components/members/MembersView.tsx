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
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Shield,
  Filter,
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

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (memberFilter.search) {
        const q = memberFilter.search.toLowerCase();
        if (!m.name.toLowerCase().includes(q)) return false;
      }
      if (memberFilter.rank !== 'ALL' && m.currentRank !== memberFilter.rank) return false;
      if (memberFilter.comm !== 'ALL' && m.communication !== memberFilter.comm) return false;
      if (memberFilter.status !== 'ALL' && m.status !== memberFilter.status) return false;
      if (memberFilter.strikeMin > 0 && m.strikes < memberFilter.strikeMin) return false;
      return true;
    });
  }, [members, memberFilter]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      if (sortBy === 'name') {
        const res = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? res : -res;
      }
      if (sortBy === 'rank') {
        const rA = rankWeights[a.currentRank] || 0;
        const rB = rankWeights[b.currentRank] || 0;
        const res = rA - rB;
        return sortOrder === 'asc' ? res : -res;
      }
      if (sortBy === 'strikes') {
        const res = a.strikes - b.strikes;
        return sortOrder === 'asc' ? res : -res;
      }
      if (sortBy === 'participation') {
        const pA = memberParticipationMap.get(a.id);
        const pB = memberParticipationMap.get(b.id);
        let valA = pA ? pA.percentage : 0;
        let valB = pB ? pB.percentage : 0;

        if (selectedEventType !== 'ALL') {
          valA = pA?.perType[selectedEventType]?.percentage ?? 0;
          valB = pB?.perType[selectedEventType]?.percentage ?? 0;
        }

        const res = valA - valB;
        return sortOrder === 'asc' ? res : -res;
      }
      return 0;
    });
  }, [filteredMembers, sortBy, sortOrder, memberParticipationMap, selectedEventType]);

  const handleToggleSort = (column: 'rank' | 'name' | 'strikes' | 'participation') => {
    sounds.playClick();
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
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
    <div className="space-y-4 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Alliance Roster
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {sortedMembers.length} warriors registered
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              sounds.playClick();
              setIsSyncModalOpen(true);
            }}
            disabled={isSyncing}
            className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Update & synchronize member roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Roster'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Modern Search & Tactical Filters Bar */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap gap-2.5 items-center w-full min-w-0">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={memberFilter.search}
            onChange={e => setMemberFilter(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search member by name..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-100 text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 placeholder:text-slate-500"
          />
          {memberFilter.search && (
            <button
              onClick={() => setMemberFilter(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Rank */}
        <select
          value={memberFilter.rank}
          onChange={e => setMemberFilter(prev => ({ ...prev, rank: e.target.value }))}
          className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="ALL">All Ranks (R5-R1)</option>
          <option value="R5">R5 Leader</option>
          <option value="R4">R4 Officer</option>
          <option value="R3">R3 Elite</option>
          <option value="R2">R2 Warrior</option>
          <option value="R1">R1 Recruit</option>
        </select>

        {/* Filter Status */}
        <select
          value={memberFilter.status}
          onChange={e => setMemberFilter(prev => ({ ...prev, status: e.target.value }))}
          className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Visitor">Visitor Only</option>
          <option value="Inactive">Inactive Only</option>
          <option value="Archived">Archived</option>
        </select>

        {/* Specific Event Selector */}
        <select
          value={selectedEventType}
          onChange={e => setSelectedEventType(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-950/80 border border-amber-500/40 text-amber-300 text-xs font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
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
          className={`w-full sm:w-auto px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            memberFilter.strikeMin > 0
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>With Strikes</span>
        </button>
      </div>

      {/* Mobile Member Cards (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {sortedMembers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
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
            const activeTitle = selectedEventType === 'ALL' ? 'War Turnout' : `${selectedEventType} Turnout`;

            return (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 transition-colors"
              >
                {/* Top row: Name, Rank, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      onClick={() => {
                        sounds.playClick();
                        setSelectedMemberForProfile(member);
                      }}
                      className="font-semibold text-sm text-slate-100 hover:text-amber-400 cursor-pointer truncate"
                    >
                      {member.name}
                    </span>
                    <RankBadge rank={member.currentRank} size="sm" />
                  </div>
                  <ActivityBadge status={activityStatus} size="sm" />
                </div>

                {/* Middle row: Attendance bar & Strikes */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">{activeTitle}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            activePct >= 75
                              ? 'text-emerald-400'
                              : activePct >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {activePct.toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({activeRatio} wars)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Strikes</div>
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
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-800/80 text-[10px]">
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
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-[9px] text-slate-400">{shortName}:</span>
                          <span className={`text-[10px] ${
                            s && s.total > 0
                              ? pct >= 75 ? 'text-emerald-400 font-bold' : pct >= 50 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'
                              : 'text-slate-600'
                          }`}>
                            {s && s.total > 0 ? `${pct.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom row: Quick action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setSelectedMemberForProfile(member);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenAddStrike(member);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors border border-rose-500/20"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Strike</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenEditMember(member);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
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
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
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
      <div className="hidden md:block rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-xs border-b border-slate-800">
            <tr>
              <th
                onClick={() => handleToggleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Member Name</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('rank')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Alliance Rank</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('participation')}
                className="py-3 px-4 cursor-pointer hover:text-amber-300 select-none"
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span>{selectedEventType === 'ALL' ? 'War Turnout %' : `${selectedEventType} %`}</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleToggleSort('strikes')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Strikes</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="max-w-md mx-auto space-y-3 px-4">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-base font-bold text-slate-100">
                      No Alliance Members Found
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Use the sync tool below to paste your official HOT alliance roster or connect directly to your Google Sheet.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setIsSyncModalOpen(true);
                      }}
                      className="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 shadow cursor-pointer mt-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync Roster</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
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
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <span
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="font-semibold text-slate-100 hover:text-amber-400 cursor-pointer text-sm"
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
                                : 'text-rose-400'
                            }`}
                          >
                            {activePct.toFixed(0)}%
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
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
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                                    : pct > 0
                                    ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                    : 'bg-slate-950/40 border-slate-900 text-slate-600 hover:border-slate-700'
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
                          className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenAddStrike(member);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:text-rose-100 hover:border-rose-400 transition-colors cursor-pointer"
                          title="Add Strike"
                        >
                          <Flame className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            onOpenEditMember(member);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
        title="Wipe Previous Manual Members"
        message="Are you sure you want to delete all current members? This will permanently remove all previous manual and mock members from both local storage and database, giving you a completely clean slate."
        confirmLabel="Wipe All Members"
        variant="crimson"
      />

      {/* Roster Sync & Import Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 w-full max-w-xl text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-100">
                    Alliance Roster Synchronization
                  </h2>
                  <p className="text-xs text-slate-400">
                    Kingdom #1391 • HOT Alliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sync Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('official');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'official'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Official HOT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('sheet');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'sheet'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Google Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSyncTab('paste');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'paste'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'file'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Upload File</span>
              </button>
            </div>

            {/* TAB 1: OFFICIAL HOT ROSTER */}
            {syncTab === 'official' && (
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">
                    Kingdom #1391 [HOT] Roster (94 Members)
                  </span>
                </div>
                <div className="text-slate-300 text-xs leading-relaxed space-y-1.5">
                  <p>
                    <strong className="text-amber-400">Alliance Leader:</strong> Death Comes (R5)
                  </p>
                  <p>
                    <strong className="text-amber-400">R4 Officers:</strong> MoonLight, Sally, SnackLemon, Beepers, Panda, Emma, Death Farm, Moha
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Includes all 94 registered alliance members with live status, former ranks, strikes, and communication records.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Ready to synchronize directly into local storage and database.</span>
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SHEET */}
            {syncTab === 'sheet' && (
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200">
                      Official HOT Alliance Google Sheet
                    </span>
                  </div>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-medium"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                    Google Spreadsheet URL
                  </label>
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <p className="text-slate-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Direct Roster Synchronization:</span>
                  </p>
                  <p>
                    Downloads the live CSV export from your Google Sheet and updates all alliance member ranks, battle power, strikes, and communications.
                  </p>
                  <p className="text-amber-400/90 text-[10px]">
                    Note: If Google returns restricted/unauthorized, ensure the sheet Sharing permissions are set to &quot;Anyone with the link can view&quot;.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PASTE CSV / TEXT */}
            {syncTab === 'paste' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Paste CSV or player list:</span>
                  <span className="text-amber-400 font-mono">Auto-detects CSV &amp; Ranks</span>
                </div>
                <textarea
                  value={pastedRoster}
                  onChange={e => setPastedRoster(e.target.value)}
                  rows={6}
                  placeholder={`Name,Current Rank,Former Rank,Strikes,Communication,Status\nMoonLight,R4,R5,0,Good,Active\nDeath Comes,R5,R4,0,Good,Active\nSally,R4,R3,0,Good,Active`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
                <p className="text-[11px] text-slate-500">
                  Supports comma-separated values (CSV) or player lines with R1–R5 ranks.
                </p>
              </div>
            )}

            {/* TAB 4: FILE UPLOAD */}
            {syncTab === 'file' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase">
                  Select Roster File (.txt, .csv, .json)
                </label>
                <div className="border border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-6 text-center cursor-pointer bg-slate-950 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.csv,.json"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Upload your roster export file from spreadsheets or Discord.
                  </p>
                </div>
                {pastedRoster && (
                  <p className="text-xs text-emerald-400">
                    File loaded ({pastedRoster.split('\n').filter(Boolean).length} lines ready)
                  </p>
                )}
              </div>
            )}

            {/* CLEAN REFRESH OPTION */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-xs font-semibold text-amber-300 cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Clean Refresh: Replace All Previous Members</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                Removes any previous manual or mock members and exclusively loads this roster.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleExecuteSync}
                disabled={
                  isSyncing ||
                  ((syncTab === 'paste' || syncTab === 'file') && !pastedRoster.trim()) ||
                  (syncTab === 'sheet' && !sheetUrl.trim())
                }
                className="btn-primary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
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
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
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
                className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
              >
                Wipe all previous manual/mock members (Clean Slate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
