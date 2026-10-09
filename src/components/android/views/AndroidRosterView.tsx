import React, { useState, useMemo } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { useAuth } from '../../../context/AuthContext';
import { Member } from '../../../types/crm';
import { Search, Plus, Shield, User, AlertTriangle, Copy, Check, ChevronRight } from 'lucide-react';
import { sounds } from '../../../utils/sound';

interface AndroidRosterViewProps {
  onSelectMember: (member: Member) => void;
  onOpenAddMember: () => void;
}

export const AndroidRosterView: React.FC<AndroidRosterViewProps> = ({
  onSelectMember,
  onOpenAddMember,
}) => {
  const { members } = useCRM();
  const { isMainAdmin, isAuthenticated } = useAuth();
  const canAdd = isAuthenticated;

  const [search, setSearch] = useState('');
  const [selectedRank, setSelectedRank] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ranks = ['ALL', 'R5', 'R4', 'R3', 'R2', 'R1'];

  const filteredMembers = useMemo(() => {
    let list = members.filter(m => m.status !== 'Archived');

    if (selectedRank !== 'ALL') {
      list = list.filter(m => m.currentRank === selectedRank);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => {
        let gid = '';
        if (m.communicationNote) {
          const match = m.communicationNote.match(/\[GID:([a-zA-Z0-9_-]+)\]/);
          if (match) gid = match[1].toLowerCase();
        }
        return (
          m.name.toLowerCase().includes(q) ||
          (m.currentRank || '').toLowerCase().includes(q) ||
          gid.includes(q)
        );
      });
    }

    return list;
  }, [members, selectedRank, search]);

  const handleCopyId = (e: React.MouseEvent, gid: string) => {
    e.stopPropagation();
    sounds.playClick();
    navigator.clipboard.writeText(gid);
    setCopiedId(gid);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-3.5 pb-24 animate-fade-in relative">
      {/* Top Cyber Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agent name or Game ID..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-[#090d1c] border border-cyan-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
        />
      </div>

      {/* Rank Filter Chips (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
        {ranks.map(r => (
          <button
            key={r}
            onClick={() => {
              sounds.playClick();
              setSelectedRank(r);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
              selectedRank === r
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] scale-105'
                : 'bg-[#090d1c] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Roster Counter */}
      <div className="flex items-center justify-between px-1 text-[11px] text-cyan-400/80 font-mono font-bold">
        <span>ACTIVE SQUAD: {filteredMembers.length} AGENTS</span>
        <span className="text-slate-500">S1391</span>
      </div>

      {/* Member Cards List */}
      <div className="space-y-2.5">
        {filteredMembers.map(member => {
          let gameId = '';
          if (member.communicationNote) {
            const match = member.communicationNote.match(/\[GID:([a-zA-Z0-9_-]+)\]/);
            if (match) gameId = match[1];
          }

          const hasStrikes = (member.strikes || 0) > 0;

          return (
            <div
              key={member.id}
              onClick={() => {
                sounds.playClick();
                onSelectMember(member);
              }}
              className="p-3.5 rounded-2xl bg-[#060914]/90 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Rank Badge Avatar */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black font-mono shrink-0 shadow-sm ${
                    member.currentRank === 'R5'
                      ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.6)] ring-1 ring-rose-400'
                      : member.currentRank === 'R4'
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                      : member.currentRank === 'R3'
                      ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                      : 'bg-[#090d1c] text-slate-300 border border-slate-700/80'
                  }`}
                >
                  {member.currentRank}
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate flex items-center gap-1.5 font-sans">
                    <span className="truncate">{member.name}</span>
                    {hasStrikes && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-black flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {member.strikes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
                    {gameId ? (
                      <button
                        onClick={e => handleCopyId(e, gameId)}
                        className="inline-flex items-center gap-1 text-cyan-300/80 hover:text-cyan-200 transition-colors"
                      >
                        <span>GID: {gameId}</span>
                        {copiedId === gameId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-600">GID: UNLINKED</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-cyan-400/50">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (FAB) to Add Member */}
      {canAdd && (
        <button
          onClick={() => {
            sounds.playClick();
            onOpenAddMember();
          }}
          className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white flex items-center justify-center shadow-[0_0_25px_rgba(225,29,72,0.6)] active:scale-90 transition-transform cursor-pointer android-pulse-crimson"
          aria-label="Add Member"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}
    </div>
  );
};
