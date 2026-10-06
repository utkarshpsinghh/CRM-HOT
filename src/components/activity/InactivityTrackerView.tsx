import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  AlertTriangle,
  Archive,
  Eye,
  Search,
  Clock,
  UserX,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

export const InactivityTrackerView: React.FC = () => {
  const {
    inactiveInsights,
    setSelectedMemberForProfile,
    archiveMember,
  } = useCRM();

  const [tierFilter, setTierFilter] = useState<'ALL' | 'Critical' | 'Inactive' | 'Warning'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToArchive, setMemberToArchive] = useState<any | null>(null);

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
    <div className="space-y-4 animate-fade-in">
      {/* Clean Header */}
      <div>
        <div className="flex items-center gap-2">
          <UserX className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Inactivity Tracker
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Monitor members who have missed recent war events and communication checks.
        </p>
      </div>

      {/* 3 Modern Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setTierFilter('Critical')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            tierFilter === 'Critical' ? 'bg-rose-500/15 border-rose-500/50' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">14+ Days Inactive</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{criticalCount}</div>
        </div>

        <div
          onClick={() => setTierFilter('Inactive')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            tierFilter === 'Inactive' ? 'bg-amber-500/15 border-amber-500/50' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">7–13 Days Inactive</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{inactiveCount}</div>
        </div>

        <div
          onClick={() => setTierFilter('Warning')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            tierFilter === 'Warning' ? 'bg-yellow-500/15 border-yellow-500/50' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">3–6 Days Silent</div>
          <div className="text-2xl font-bold font-mono text-yellow-400 mt-1">{warningCount}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tierFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Flagged ({inactiveInsights.length})
          </button>
          <button
            onClick={() => setTierFilter('Critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tierFilter === 'Critical' ? 'bg-rose-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            14+ Days ({criticalCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Mobile Inactive Member Cards */}
      <div className="block md:hidden space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
            No inactive members in this tier.
          </div>
        ) : (
          filteredInsights.map(item => {
            const { member, daysInactive, tier, lastActivityDescription } = item;

            return (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5"
              >
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

                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                      tier === 'Critical'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : tier === 'Inactive'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                    }`}
                  >
                    {daysInactive} days silent
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-400">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">Last Record</span>
                  <span>{lastActivityDescription}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setSelectedMemberForProfile(member);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setMemberToArchive(member);
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Inactive Members Table */}
      <div className="hidden md:block rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950 text-slate-400 font-semibold text-xs border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Days Inactive</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredInsights.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No inactive members in this tier.
                </td>
              </tr>
            ) : (
              filteredInsights.map(item => {
                const { member, daysInactive, tier, lastActivityDescription } = item;

                return (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="font-semibold text-slate-100 hover:text-amber-400 cursor-pointer"
                      >
                        {member.name}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-xs">
                      <span className={tier === 'Critical' ? 'text-rose-400' : tier === 'Inactive' ? 'text-amber-400' : 'text-yellow-400'}>
                        {daysInactive} days
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400">
                      {lastActivityDescription}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white text-xs cursor-pointer"
                        >
                          Profile
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            setMemberToArchive(member);
                          }}
                          className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Archive"
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

      <ConfirmModal
        isOpen={Boolean(memberToArchive)}
        onClose={() => setMemberToArchive(null)}
        onConfirm={handleConfirmArchive}
        title="Archive Member"
        message={`Archive ${memberToArchive?.name}? Their history will be saved.`}
        confirmLabel="Archive"
        variant="crimson"
      />
    </div>
  );
};
