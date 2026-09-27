import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { CommunicationBadge } from '../common/StatusBadge';
import { GameButton } from '../common/GameButton';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  AlertTriangle,
  Clock,
  Flame,
  Archive,
  Eye,
  Settings,
  ShieldAlert,
  Search,
  CheckCircle,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

export const InactivityTrackerView: React.FC = () => {
  const {
    inactiveInsights,
    settings,
    setActiveTab,
    setSelectedMemberForProfile,
    archiveMember,
  } = useCRM();

  const [tierFilter, setTierFilter] = useState<'ALL' | 'Critical' | 'Inactive' | 'Warning'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToArchive, setMemberToArchive] = useState<any | null>(null);

  // Filter insights
  const filteredInsights = inactiveInsights.filter(item => {
    if (tierFilter !== 'ALL' && item.tier !== tierFilter) return false;
    if (searchQuery && !item.member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const criticalCount = inactiveInsights.filter(i => i.tier === 'Critical').length;
  const inactiveCount = inactiveInsights.filter(i => i.tier === 'Inactive').length;
  const warningCount = inactiveInsights.filter(i => i.tier === 'Warning').length;

  const handleConfirmArchive = async () => {
    if (memberToArchive) {
      await archiveMember(memberToArchive.id);
      setMemberToArchive(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
              Inactivity &amp; Warning Radar
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/80 border border-red-600 text-red-200 font-bold font-mono">
              {inactiveInsights.length} At Risk
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Automated telemetry tracking last votes, event attendance, and alliance activity records.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('settings');
          }}
          className="flex items-center gap-1.5 text-xs text-[#ca8a04] hover:text-[#fef08a] transition-colors font-fantasy font-bold uppercase cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>Configure Thresholds ({settings.inactivityWarningDays}d / {settings.inactivityInactiveDays}d / {settings.inactivityCriticalDays}d)</span>
        </button>
      </div>

      {/* Tier Statistics Overview Cards (Section 14) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => {
            sounds.playClick();
            setTierFilter('Critical');
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
            tierFilter === 'Critical'
              ? 'bg-red-950/60 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : 'bg-red-950/20 border-red-800/50 hover:border-red-600'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-fantasy font-bold text-red-300 uppercase">
            <span>Critical Absentees</span>
            <span className="text-[10px] bg-red-900/60 px-1.5 py-0.5 rounded text-red-200">
              {settings.inactivityCriticalDays}+ Days
            </span>
          </div>
          <div className="font-fantasy font-black text-3xl text-red-400 mt-1">
            {criticalCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Immediate kick or academy demotion recommended.
          </p>
        </div>

        <div
          onClick={() => {
            sounds.playClick();
            setTierFilter('Inactive');
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
            tierFilter === 'Inactive'
              ? 'bg-amber-950/60 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-amber-950/20 border-amber-800/50 hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-fantasy font-bold text-amber-300 uppercase">
            <span>Inactive Members</span>
            <span className="text-[10px] bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-200">
              {settings.inactivityInactiveDays}–{settings.inactivityCriticalDays - 1} Days
            </span>
          </div>
          <div className="font-fantasy font-black text-3xl text-amber-400 mt-1">
            {inactiveCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Missed multiple consecutive war cycles.
          </p>
        </div>

        <div
          onClick={() => {
            sounds.playClick();
            setTierFilter('Warning');
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
            tierFilter === 'Warning'
              ? 'bg-yellow-950/60 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
              : 'bg-yellow-950/20 border-yellow-800/50 hover:border-yellow-600'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-fantasy font-bold text-yellow-300 uppercase">
            <span>Warning Watchlist</span>
            <span className="text-[10px] bg-yellow-900/60 px-1.5 py-0.5 rounded text-yellow-200">
              {settings.inactivityWarningDays}–{settings.inactivityInactiveDays - 1} Days
            </span>
          </div>
          <div className="font-fantasy font-black text-3xl text-yellow-300 mt-1">
            {warningCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Silent on recent throne voting call-outs.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-3.5 rounded-xl bg-[#141824] border border-[#524126] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase transition-all cursor-pointer ${
              tierFilter === 'ALL'
                ? 'bg-[#ca8a04] text-[#1e1503]'
                : 'bg-[#0c0e16] text-stone-300 hover:text-white border border-[#3f311c]'
            }`}
          >
            All Flagged ({inactiveInsights.length})
          </button>
          <button
            onClick={() => setTierFilter('Critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-fantasy font-bold uppercase transition-all cursor-pointer ${
              tierFilter === 'Critical'
                ? 'bg-red-700 text-white'
                : 'bg-[#0c0e16] text-red-400 border border-red-800/60'
            }`}
          >
            Critical Only ({criticalCount})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search inactive member..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0c0e16] border border-[#3f311c] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
          />
        </div>
      </div>

      {/* INACTIVE MEMBERS TABLE (Section 14 & 15) */}
      <div className="rounded-xl bg-gradient-to-b from-[#181d2a] to-[#10131d] border-[1.5px] border-[#524126] shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#0b0d14] text-[#fef08a] font-fantasy uppercase text-xs tracking-wider border-b border-[#524126]">
            <tr>
              <th className="py-3 px-4">Flagged Member</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Inactivity Tier</th>
              <th className="py-3 px-4">Days Inactive</th>
              <th className="py-3 px-4">Last Activity Logged</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2417] text-stone-200">
            {filteredInsights.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="font-fantasy font-bold text-stone-300">
                    No Inactive Members in this Tier
                  </p>
                  <p className="text-xs">All alliance warriors are participating actively!</p>
                </td>
              </tr>
            ) : (
              filteredInsights.map(item => {
                const { member, daysInactive, tier, lastActivityDescription, lastActivityDate } = item;

                return (
                  <tr key={member.id} className="hover:bg-[#1e2333]/80 transition-colors">
                    {/* Member */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="cursor-pointer"
                      >
                        <span className="font-fantasy font-bold text-stone-100 hover:text-[#fef08a] transition-colors text-sm">
                          {member.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StrikeBadge count={member.strikes} size="sm" />
                          <CommunicationBadge status={member.communication} size="sm" />
                        </div>
                      </div>
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    {/* Inactivity Tier Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-fantasy font-bold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                          tier === 'Critical'
                            ? 'bg-red-950 text-red-200 border-red-500 animate-pulse'
                            : tier === 'Inactive'
                            ? 'bg-amber-950 text-amber-200 border-amber-500'
                            : 'bg-yellow-950 text-yellow-200 border-yellow-500'
                        }`}
                      >
                        {tier === 'Critical' && <ShieldAlert className="w-3 h-3 text-red-400" />}
                        {tier === 'Inactive' && <Clock className="w-3 h-3 text-amber-400" />}
                        {tier === 'Warning' && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                        <span>{tier}</span>
                      </span>
                    </td>

                    {/* Days Inactive */}
                    <td className="py-3 px-4 font-mono font-bold text-sm">
                      <span
                        className={
                          daysInactive >= settings.inactivityCriticalDays
                            ? 'text-red-400'
                            : daysInactive >= settings.inactivityInactiveDays
                            ? 'text-amber-400'
                            : 'text-yellow-300'
                        }
                      >
                        {daysInactive} days
                      </span>
                    </td>

                    {/* Last Activity Description */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-stone-200 font-semibold">{lastActivityDescription}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{lastActivityDate}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <GameButton
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMemberForProfile(member)}
                          icon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Dossier
                        </GameButton>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            setMemberToArchive(member);
                          }}
                          className="p-1.5 rounded bg-stone-900 border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-700 transition-colors cursor-pointer"
                          title="Soft-Delete / Archive Inactive Member"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Archiving Member */}
      <ConfirmModal
        isOpen={Boolean(memberToArchive)}
        onClose={() => setMemberToArchive(null)}
        onConfirm={handleConfirmArchive}
        title="⚠️ Archive Inactive Member"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to archive <strong>{memberToArchive?.name}</strong>?
            </p>
            <p className="text-stone-400 text-xs">
              This will remove them from the active war roster while safely storing their complete historical attendance data.
            </p>
          </div>
        }
        confirmLabel="Archive Member"
        variant="crimson"
      />
    </div>
  );
};
