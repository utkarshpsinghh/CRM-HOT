import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { StrikeBadge } from '../common/StrikeBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  AlertTriangle,
  Archive,
  Eye,
  Search,
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
    <div className="space-y-4">
      {/* Clean Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#fffbeb] tracking-tight">
          Inactive Members
        </h1>
        <p className="text-xs text-stone-300">
          Members who have missed recent war events and votes.
        </p>
      </div>

      {/* 3 Simple Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setTierFilter('Critical')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            tierFilter === 'Critical' ? 'bg-red-950/60 border-red-500' : 'bg-[#20150f] border-[#4d2b14]'
          }`}
        >
          <div className="text-xs font-semibold text-red-300">14+ Days Inactive</div>
          <div className="text-2xl font-black text-red-400 mt-1">{criticalCount}</div>
        </div>

        <div
          onClick={() => setTierFilter('Inactive')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            tierFilter === 'Inactive' ? 'bg-amber-950/60 border-amber-500' : 'bg-[#20150f] border-[#4d2b14]'
          }`}
        >
          <div className="text-xs font-semibold text-amber-300">7–13 Days Inactive</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{inactiveCount}</div>
        </div>

        <div
          onClick={() => setTierFilter('Warning')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            tierFilter === 'Warning' ? 'bg-[#382606] border-yellow-500' : 'bg-[#20150f] border-[#4d2b14]'
          }`}
        >
          <div className="text-xs font-semibold text-yellow-300">3–6 Days Silent</div>
          <div className="text-2xl font-black text-yellow-300 mt-1">{warningCount}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tierFilter === 'ALL' ? 'bg-[#331c0d] text-[#fbbf24]' : 'bg-[#20150f] text-stone-300'
            }`}
          >
            All Flagged ({inactiveInsights.length})
          </button>
          <button
            onClick={() => setTierFilter('Critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tierFilter === 'Critical' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-[#20150f] text-stone-300'
            }`}
          >
            14+ Days ({criticalCount})
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#20150f] border border-[#4d2b14] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
          />
        </div>
      </div>

      {/* Clean Inactive Members Table */}
      <div className="rounded-xl bg-[#20150f] border border-[#4d2b14] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#170e09] text-stone-300 font-semibold text-xs border-b border-[#3d200e]">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Days Inactive</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a170b] text-stone-200">
            {filteredInsights.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-400">
                  No inactive members in this tier.
                </td>
              </tr>
            ) : (
              filteredInsights.map(item => {
                const { member, daysInactive, tier, lastActivityDescription } = item;

                return (
                  <tr key={member.id} className="hover:bg-[#271a13] transition-colors">
                    <td className="py-3 px-4">
                      <span
                        onClick={() => {
                          sounds.playClick();
                          setSelectedMemberForProfile(member);
                        }}
                        className="font-bold text-stone-100 hover:text-[#fbbf24] cursor-pointer"
                      >
                        {member.name}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-xs">
                      <span className={tier === 'Critical' ? 'text-red-400' : tier === 'Inactive' ? 'text-amber-400' : 'text-yellow-300'}>
                        {daysInactive} days
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-stone-300">
                      {lastActivityDescription}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="px-2.5 py-1 rounded bg-[#170e09] border border-[#3d200e] text-stone-300 hover:text-white text-xs cursor-pointer"
                        >
                          Profile
                        </button>

                        <button
                          onClick={() => {
                            sounds.playClick();
                            setMemberToArchive(member);
                          }}
                          className="p-1 rounded bg-[#170e09] border border-[#3d200e] text-stone-400 hover:text-red-400 cursor-pointer"
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
