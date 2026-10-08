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
    <div className="space-y-3 pb-20 animate-fade-in relative">
      {/* Top Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by member name or Player ID..."
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-sm"
        />
      </div>

      {/* Rank Filter Chips (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
        {ranks.map(r => (
          <button
            key={r}
            onClick={() => {
              sounds.playClick();
              setSelectedRank(r);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedRank === r
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Roster Counter */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-medium">
        <span>Showing {filteredMembers.length} members</span>
        <span>Kingdom #1391</span>
      </div>

      {/* Member Cards List */}
      <div className="space-y-2">
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
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3 active:scale-[0.99] active:bg-slate-800/60 transition-all cursor-pointer shadow-sm select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Rank Badge Avatar */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black font-mono shrink-0 shadow-sm ${
                    member.currentRank === 'R5'
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                      : member.currentRank === 'R4'
                      ? 'bg-sky-500 text-slate-950'
                      : member.currentRank === 'R3'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {member.currentRank}
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{member.name}</span>
                    {hasStrikes && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {member.strikes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                    {gameId ? (
                      <button
                        onClick={e => handleCopyId(e, gameId)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <span>ID: {gameId}</span>
                        {copiedId === gameId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-500">ID: Not linked</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500">
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
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 active:scale-90 transition-transform cursor-pointer"
          aria-label="Add Member"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
