import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { OfficerContribution, AdminRole } from '../../types/crm';
import {
  Award,
  Search,
  Filter,
  Download,
  Calendar,
  Shield,
  Swords,
  Flame,
  UserCheck,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { safeFormatDate, safeFormatDateTime } from '../../utils/date';
import { sounds } from '../../utils/sound';

export const ContributionsView: React.FC = () => {
  const { contributions, admins } = useCRM();
  const { isMainAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');

  // Compute officer contribution leaderboard & statistics
  const officerStats = useMemo(() => {
    // Unique officers from admin accounts + any contributions
    const officerMap = new Map<
      string,
      {
        id: string;
        username: string;
        name: string;
        role: AdminRole;
        totalActions: number;
        attendanceCount: number;
        eventsCount: number;
        strikesCount: number;
        membersCount: number;
        commsCount: number;
        lastActive: string | null;
      }
    >();

    // Seed from registered admin accounts
    admins.forEach(adm => {
      officerMap.set(adm.username.toLowerCase(), {
        id: adm.id,
        username: adm.username,
        name: adm.name || adm.username,
        role: adm.role,
        totalActions: 0,
        attendanceCount: 0,
        eventsCount: 0,
        strikesCount: 0,
        membersCount: 0,
        commsCount: 0,
        lastActive: null,
      });
    });

    // Populate from contributions
    contributions.forEach(c => {
      const key = c.adminUsername.toLowerCase();
      let record = officerMap.get(key);
      if (!record) {
        record = {
          id: c.adminId,
          username: c.adminUsername,
          name: c.adminName || c.adminUsername,
          role: c.adminRole,
          totalActions: 0,
          attendanceCount: 0,
          eventsCount: 0,
          strikesCount: 0,
          membersCount: 0,
          commsCount: 0,
          lastActive: null,
        };
        officerMap.set(key, record);
      }

      record.totalActions += 1;

      if (!record.lastActive || new Date(c.timestamp) > new Date(record.lastActive)) {
        record.lastActive = c.timestamp;
      }

      if (c.action === 'ATTENDANCE_MARKED' || c.action === 'ATTENDANCE_BULK') {
        record.attendanceCount += c.count || 1;
      } else if (c.action === 'EVENT_CREATED' || c.action === 'EVENT_COMPLETED') {
        record.eventsCount += 1;
      } else if (c.action === 'STRIKE_ADDED' || c.action === 'STRIKE_REMOVED') {
        record.strikesCount += 1;
      } else if (c.action === 'MEMBER_ADDED' || c.action === 'MEMBER_UPDATED' || c.action === 'MEMBER_ARCHIVED') {
        record.membersCount += 1;
      } else if (c.action === 'COMMUNICATION_LOGGED') {
        record.commsCount += 1;
      }
    });

    return Array.from(officerMap.values()).sort((a, b) => b.totalActions - a.totalActions);
  }, [admins, contributions]);

  // Total summary aggregates
  const totals = useMemo(() => {
    let attendanceSum = 0;
    let eventsSum = 0;
    let strikesSum = 0;
    let commsSum = 0;

    contributions.forEach(c => {
      if (c.action === 'ATTENDANCE_MARKED' || c.action === 'ATTENDANCE_BULK') {
        attendanceSum += c.count || 1;
      } else if (c.action === 'EVENT_CREATED') {
        eventsSum += 1;
      } else if (c.action === 'STRIKE_ADDED') {
        strikesSum += 1;
      } else if (c.action === 'COMMUNICATION_LOGGED') {
        commsSum += 1;
      }
    });

    return {
      totalContributions: contributions.length,
      attendanceSum,
      eventsSum,
      strikesSum,
      commsSum,
      officersCount: officerStats.length,
    };
  }, [contributions, officerStats]);

  // Filtered contributions list
  const filteredContributions = useMemo(() => {
    return contributions.filter(c => {
      if (selectedOfficer !== 'ALL' && c.adminUsername.toLowerCase() !== selectedOfficer.toLowerCase()) {
        return false;
      }

      if (selectedActionType !== 'ALL') {
        if (selectedActionType === 'ATTENDANCE') {
          if (c.action !== 'ATTENDANCE_MARKED' && c.action !== 'ATTENDANCE_BULK') return false;
        } else if (selectedActionType === 'EVENTS') {
          if (c.action !== 'EVENT_CREATED' && c.action !== 'EVENT_COMPLETED') return false;
        } else if (selectedActionType === 'STRIKES') {
          if (c.action !== 'STRIKE_ADDED' && c.action !== 'STRIKE_REMOVED') return false;
        } else if (selectedActionType === 'MEMBERS') {
          if (c.action !== 'MEMBER_ADDED' && c.action !== 'MEMBER_UPDATED' && c.action !== 'MEMBER_ARCHIVED') return false;
        } else if (selectedActionType === 'COMMS') {
          if (c.action !== 'COMMUNICATION_LOGGED') return false;
        }
      }

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = c.description.toLowerCase().includes(query);
        const matchesTarget = c.targetName ? c.targetName.toLowerCase().includes(query) : false;
        const matchesAdmin = c.adminName.toLowerCase().includes(query) || c.adminUsername.toLowerCase().includes(query);
        if (!matchesDesc && !matchesTarget && !matchesAdmin) return false;
      }

      return true;
    });
  }, [contributions, selectedOfficer, selectedActionType, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    sounds.playClick();
    const headers = ['Timestamp', 'Officer Name', 'Username', 'Role', 'Action Type', 'Target', 'Count', 'Description'];
    const rows = filteredContributions.map(c => [
      c.timestamp,
      `"${c.adminName.replace(/"/g, '""')}"`,
      c.adminUsername,
      c.adminRole,
      c.action,
      `"${(c.targetName || '').replace(/"/g, '""')}"`,
      c.count || 1,
      `"${c.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HOT_Alliance_Officer_Contributions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: OfficerContribution['action']) => {
    switch (action) {
      case 'ATTENDANCE_MARKED':
      case 'ATTENDANCE_BULK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/40">
            <CheckCircle2 className="w-3 h-3 text-amber-400" />
            <span>Attendance</span>
          </span>
        );
      case 'EVENT_CREATED':
      case 'EVENT_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-600/40">
            <Swords className="w-3 h-3 text-blue-400" />
            <span>War Battle</span>
          </span>
        );
      case 'STRIKE_ADDED':
      case 'STRIKE_REMOVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-600/40">
            <Flame className="w-3 h-3 text-red-400" />
            <span>Strike</span>
          </span>
        );
      case 'MEMBER_ADDED':
      case 'MEMBER_UPDATED':
      case 'MEMBER_ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span>Roster</span>
          </span>
        );
      case 'COMMUNICATION_LOGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-600/40">
            <MessageSquare className="w-3 h-3 text-purple-400" />
            <span>Note</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-600/40">
            <FileText className="w-3 h-3" />
            <span>Action</span>
          </span>
        );
    }
  };

  const getOfficerRankTitle = (actions: number) => {
    if (actions >= 50) return { title: 'Master Scribe', color: 'text-amber-300' };
    if (actions >= 25) return { title: 'War Chronicler', color: 'text-yellow-400' };
    if (actions >= 10) return { title: 'Battle Scribe', color: 'text-emerald-400' };
    return { title: 'Vanguard Scout', color: 'text-stone-300' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-fantasy font-black text-[#fffbeb] tracking-wide">
                Officer Contributions
              </h1>
              <p className="text-xs text-stone-300">
                See which officers contributed to alliance war tracking
              </p>
            </div>
          </div>
        </div>

        {isMainAdmin && (
          <button
            onClick={handleExportCSV}
            className="btn-kingshot-gold px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Top Aggregates KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Actions</span>
          </div>
          <div className="text-xl sm:text-2xl font-fantasy font-black text-amber-300">
            {totals.totalContributions}
          </div>
          <div className="text-[10px] text-stone-400">across all officers</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Attendance Marked</span>
          </div>
          <div className="text-xl sm:text-2xl font-fantasy font-black text-emerald-300">
            {totals.attendanceSum}
          </div>
          <div className="text-[10px] text-stone-400">individual checks logged</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-blue-400" />
            <span>Wars Organized</span>
          </div>
          <div className="text-xl sm:text-2xl font-fantasy font-black text-blue-300">
            {totals.eventsSum}
          </div>
          <div className="text-[10px] text-stone-400">battle events initialized</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Strikes Handled</span>
          </div>
          <div className="text-xl sm:text-2xl font-fantasy font-black text-red-300">
            {totals.strikesSum}
          </div>
          <div className="text-[10px] text-stone-400">issued or pardoned</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Officers</span>
          </div>
          <div className="text-xl sm:text-2xl font-fantasy font-black text-purple-300">
            {totals.officersCount}
          </div>
          <div className="text-[10px] text-stone-400">with tracking activity</div>
        </div>
      </div>

      {/* SECTION 1: Officer Contributions Leaderboard Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-fantasy font-black text-[#fffbeb] uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>R4 &amp; Leadership Activity Leaderboard</span>
          </h2>
          <span className="text-xs text-stone-400">Ranked by recorded contributions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {officerStats.map((officer, index) => {
            const rank = getOfficerRankTitle(officer.totalActions);
            const isLeader = officer.role === 'MainAdmin' || officer.username === 'admin';

            return (
              <div
                key={officer.id || officer.username}
                className="p-4 rounded-2xl bg-[#20150f] border-2 border-[#4d2b14] space-y-3 shadow-md hover:border-amber-600/60 transition-colors"
              >
                {/* Officer Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#b45309] to-[#78350f] border border-amber-500/50 flex items-center justify-center text-white font-fantasy font-black text-base shadow">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-fantasy font-black text-sm text-[#fffbeb]">
                          {officer.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase border ${
                            isLeader
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                              : 'bg-stone-800 text-stone-300 border-stone-600/60'
                          }`}
                        >
                          {isLeader ? 'Main Admin' : 'R4'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        @{officer.username} • <span className={`font-semibold ${rank.color}`}>{rank.title}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-fantasy font-black text-amber-300">
                      {officer.totalActions}
                    </div>
                    <div className="text-[9px] uppercase font-bold text-stone-400">Actions</div>
                  </div>
                </div>

                {/* Contribution Breakdown Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#341b0d] text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[#140c08] border border-[#2d180c] flex items-center justify-between">
                    <span className="text-stone-400 text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      Attendance:
                    </span>
                    <span className="font-bold text-amber-200">{officer.attendanceCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#140c08] border border-[#2d180c] flex items-center justify-between">
                    <span className="text-stone-400 text-[11px] flex items-center gap-1">
                      <Swords className="w-3 h-3 text-blue-400" />
                      Events:
                    </span>
                    <span className="font-bold text-blue-200">{officer.eventsCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#140c08] border border-[#2d180c] flex items-center justify-between">
                    <span className="text-stone-400 text-[11px] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-red-400" />
                      Strikes:
                    </span>
                    <span className="font-bold text-red-200">{officer.strikesCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#140c08] border border-[#2d180c] flex items-center justify-between">
                    <span className="text-stone-400 text-[11px] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-purple-400" />
                      Notes:
                    </span>
                    <span className="font-bold text-purple-200">{officer.commsCount + officer.membersCount}</span>
                  </div>
                </div>

                {/* Footer: Last active */}
                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-[#2d180c]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    Last Active:
                  </span>
                  <span className="font-mono text-stone-300">
                    {officer.lastActive ? safeFormatDate(officer.lastActive) : 'Never'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Detailed Contributions Log Feed (Visible ONLY to Main Admin) */}
      {isMainAdmin && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-fantasy font-black text-[#fffbeb] uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Live Tracking Activity Log</span>
            </h2>

          <div className="text-xs text-stone-400">
            Showing {filteredContributions.length} of {contributions.length} recorded entries
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-3 rounded-xl bg-[#20150f] border border-[#4d2b14] flex flex-wrap gap-2.5 items-center w-full min-w-0">
          {/* Search */}
          <div className="relative w-full sm:flex-1 min-w-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by action, player, or event..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
            />
          </div>

          {/* Officer Filter */}
          <select
            value={selectedOfficer}
            onChange={e => setSelectedOfficer(e.target.value)}
            className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="ALL">All Officers</option>
            {officerStats.map(o => (
              <option key={o.username} value={o.username}>
                {o.name} (@{o.username})
              </option>
            ))}
          </select>

          {/* Action Type Filter */}
          <select
            value={selectedActionType}
            onChange={e => setSelectedActionType(e.target.value)}
            className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-[#140c08] border border-[#3d200e] text-stone-200 text-xs focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="ALL">All Action Types</option>
            <option value="ATTENDANCE">War Attendance</option>
            <option value="EVENTS">Battle Events</option>
            <option value="STRIKES">Strikes & Discipline</option>
            <option value="MEMBERS">Roster Changes</option>
            <option value="COMMS">Communication Notes</option>
          </select>
        </div>

        {/* Desktop Table View (screens >= md) */}
        <div className="hidden md:block rounded-xl bg-[#20150f] border border-[#4d2b14] overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#170e09] text-stone-300 font-semibold text-xs border-b border-[#3d200e]">
              <tr>
                <th className="py-3 px-4">Officer</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a170b] text-stone-200">
              {filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-stone-400">
                    No officer contributions match your filters.
                  </td>
                </tr>
              ) : (
                filteredContributions.map(item => (
                  <tr key={item.id} className="hover:bg-[#271a13] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-100">{item.adminName}</span>
                        <span className="text-[10px] text-stone-400 font-mono">@{item.adminUsername}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getActionBadge(item.action)}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-amber-200/90">{item.targetName || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-stone-300">{item.description}</td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-stone-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Feed Cards (screens < md) */}
        <div className="block md:hidden space-y-2.5">
          {filteredContributions.length === 0 ? (
            <div className="p-8 text-center text-stone-400 bg-[#20150f] rounded-2xl border border-[#4d2b14]">
              No officer contributions match your filters.
            </div>
          ) : (
            filteredContributions.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#20150f] border border-[#4d2b14] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-100">{item.adminName}</span>
                    <span className="text-[10px] text-stone-400 font-mono">@{item.adminUsername}</span>
                  </div>
                  {getActionBadge(item.action)}
                </div>

                <div className="p-2 rounded bg-[#140c08] border border-[#2d180c] space-y-1">
                  {item.targetName && (
                    <div className="text-[11px] font-semibold text-amber-300">
                      Target: {item.targetName}
                    </div>
                  )}
                  <div className="text-stone-300 text-xs">{item.description}</div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-1">
                  <span>Count: {item.count || 1}</span>
                  <span>{safeFormatDateTime(item.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>
);
};
