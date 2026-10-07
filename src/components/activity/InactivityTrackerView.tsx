import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RankBadge } from '../common/RankBadge';
import { ActivityBadge } from '../common/StatusBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Archive,
  Eye,
  Search,
  UserX,
  UserCheck,
  Users,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { Member } from '../../types/crm';

export const InactivityTrackerView: React.FC = () => {
  const {
    members,
    events,
    attendance,
    eventParticipations,
    updateMember,
    setSelectedMemberForProfile,
    archiveMember,
  } = useCRM();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Inactive' | 'Active' | 'Visitor'>('Inactive');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToArchive, setMemberToArchive] = useState<Member | null>(null);

  const activeCount = useMemo(() => members.filter(m => m.status === 'Active').length, [members]);
  const inactiveCount = useMemo(() => members.filter(m => m.status === 'Inactive').length, [members]);
  const visitorCount = useMemo(() => members.filter(m => m.status === 'Visitor').length, [members]);

  const eventMap = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);

  // Last activity description per member
  const memberActivityMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(member => {
      const memberAtt = attendance.filter(a => a.memberId === member.id);
      const memberParts = eventParticipations.filter(p => p.memberId === member.id);
      let latestTime = 0;
      let desc = 'Enrolled in Roster';

      // Check modern participations
      memberParts.forEach(p => {
        const evt = eventMap.get(p.eventId);
        if (!evt) return;
        const t = new Date(evt.date).getTime();
        if (p.attendanceStatus === 'ATTENDED' && t > latestTime) {
          latestTime = t;
          desc = `Joined ${evt.eventType || evt.eventName}`;
        } else if (p.voteStatus === 'VOTED' && t > latestTime) {
          latestTime = t;
          desc = `Voted on ${evt.eventType || evt.eventName}`;
        }
      });

      // Check legacy attendance
      memberAtt.forEach(rec => {
        const evt = eventMap.get(rec.eventId);
        if (!evt) return;
        const t = new Date(evt.date).getTime();
        if (rec.attendanceStatus === 'JOINED' && t > latestTime) {
          latestTime = t;
          desc = `Joined ${evt.eventType || evt.eventName}`;
        } else if ((rec.voteStatus === 'YES' || rec.voteStatus === 'NO') && t > latestTime) {
          latestTime = t;
          desc = `Voted ${rec.voteStatus} on ${evt.eventType || evt.eventName}`;
        }
      });

      map.set(member.id, desc);
    });
    return map;
  }, [members, attendance, eventParticipations, eventMap]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      if (member.status === 'Archived') return false;
      if (statusFilter !== 'ALL' && member.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(q);
        const matchesGameId = member.gameId ? member.gameId.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesGameId) return false;
      }
      return true;
    });
  }, [members, statusFilter, searchQuery]);

  const handleToggleStatus = async (member: Member) => {
    sounds.playClick();
    const nextStatus = member.status === 'Inactive' ? 'Active' : 'Inactive';
    await updateMember({
      ...member,
      status: nextStatus,
    });
  };

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
            Roster Status &amp; Inactivity Review
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Manual member activity management. Alliance leadership sets warrior status directly without automated penalties.
        </p>
      </div>

      {/* 3 Modern Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => {
            sounds.playClick();
            setStatusFilter('Inactive');
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Inactive'
              ? 'bg-amber-500/15 border-amber-500/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Inactive Members</span>
            <UserX className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{inactiveCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Manually marked inactive</div>
        </div>

        <div
          onClick={() => {
            sounds.playClick();
            setStatusFilter('Active');
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Active'
              ? 'bg-emerald-500/15 border-emerald-500/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Warriors</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Combat ready &amp; deployed</div>
        </div>

        <div
          onClick={() => {
            sounds.playClick();
            setStatusFilter('Visitor');
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Visitor'
              ? 'bg-sky-500/15 border-sky-500/50'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center justify-between">
            <span>Alliance Visitors</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">{visitorCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">External alliance guests</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('Inactive');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Inactive'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Members ({members.filter(m => m.status !== 'Archived').length})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('Active');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Active'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setStatusFilter('Visitor');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Visitor'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Visitors ({visitorCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search member by name..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Mobile Member Cards */}
      <div className="block md:hidden space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
            No members in this status filter.
          </div>
        ) : (
          filteredMembers.map(member => {
            const lastActivity = memberActivityMap.get(member.id) || 'Enrolled in Roster';

            return (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
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
                    {member.gameId && (
                      <span className="text-[10px] font-mono text-amber-300/80 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                        ID: {member.gameId}
                      </span>
                    )}
                  </div>

                  <ActivityBadge status={member.status} size="sm" />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-400">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">Last Record</span>
                  <span>{lastActivity}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => handleToggleStatus(member)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      member.status === 'Inactive'
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {member.status === 'Inactive' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Set Active</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        <span>Set Inactive</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setSelectedMemberForProfile(member);
                      }}
                      className="py-1.5 px-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Profile</span>
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
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Members Table */}
      <div className="hidden md:block rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950 text-slate-400 font-semibold text-xs border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Current Status</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Manual Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No members in this status filter.
                </td>
              </tr>
            ) : (
              filteredMembers.map(member => {
                const lastActivity = memberActivityMap.get(member.id) || 'Enrolled in Roster';

                return (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span
                          onClick={() => {
                            sounds.playClick();
                            setSelectedMemberForProfile(member);
                          }}
                          className="font-semibold text-slate-100 hover:text-amber-400 cursor-pointer"
                        >
                          {member.name}
                        </span>
                        {member.gameId && (
                          <div className="text-[11px] font-mono text-amber-300/80 mt-0.5">
                            ID: {member.gameId}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <RankBadge rank={member.currentRank} size="sm" />
                    </td>

                    <td className="py-3 px-4">
                      <ActivityBadge status={member.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400">
                      {lastActivity}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                            member.status === 'Inactive'
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
                          }`}
                          title={`Toggle ${member.name} to ${member.status === 'Inactive' ? 'Active' : 'Inactive'}`}
                        >
                          {member.status === 'Inactive' ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Set Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Set Inactive</span>
                            </>
                          )}
                        </button>

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
