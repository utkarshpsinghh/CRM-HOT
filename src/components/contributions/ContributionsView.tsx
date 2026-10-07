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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <CheckCircle2 className="w-3 h-3 text-amber-400" />
            <span>Attendance</span>
          </span>
        );
      case 'EVENT_CREATED':
      case 'EVENT_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
            <Swords className="w-3 h-3 text-sky-400" />
            <span>Event</span>
          </span>
        );
      case 'STRIKE_ADDED':
      case 'STRIKE_REMOVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Strike</span>
          </span>
        );
      case 'MEMBER_ADDED':
      case 'MEMBER_UPDATED':
      case 'MEMBER_ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span>Member</span>
          </span>
        );
      case 'COMMUNICATION_LOGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <MessageSquare className="w-3 h-3 text-purple-400" />
            <span>Note</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <FileText className="w-3 h-3" />
            <span>Action</span>
          </span>
        );
    }
  };

  const getOfficerRankTitle = (actions: number) => {
    if (actions >= 50) return { title: 'Master Scribe', color: 'text-amber-400' };
    if (actions >= 25) return { title: 'Lead Officer', color: 'text-sky-400' };
    if (actions >= 10) return { title: 'Active Officer', color: 'text-emerald-400' };
    return { title: 'Contributor', color: 'text-slate-400' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Officer Contributions
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track all administrative leadership actions and event logging
              </p>
            </div>
          </div>
        </div>

        {isMainAdmin && (
          <button
            onClick={handleExportCSV}
            className="btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Top Aggregates KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Actions</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {totals.totalContributions}
          </div>
          <div className="text-[10px] text-slate-500">across all officers</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Attendance Marked</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {totals.attendanceSum}
          </div>
          <div className="text-[10px] text-slate-500">individual checks logged</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-blue-400" />
            <span>Events Organized</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
            {totals.eventsSum}
          </div>
          <div className="text-[10px] text-slate-500">alliance events initialized</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Strikes Handled</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
            {totals.strikesSum}
          </div>
          <div className="text-[10px] text-slate-500">issued or pardoned</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Officers</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400">
            {totals.officersCount}
          </div>
          <div className="text-[10px] text-slate-500">with tracking activity</div>
        </div>
      </div>

      {/* SECTION 1: Officer Contributions Leaderboard Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Leadership Activity Leaderboard</span>
          </h2>
          <span className="text-xs text-slate-400">Ranked by recorded contributions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {officerStats.map((officer, index) => {
            const rank = getOfficerRankTitle(officer.totalActions);
            const isLeader = officer.role === 'MainAdmin' || officer.username === 'admin';

            return (
              <div
                key={officer.id || officer.username}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md hover:border-slate-700 transition-colors"
              >
                {/* Officer Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono text-sm shadow">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-100">
                          {officer.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                            isLeader
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {isLeader ? 'Main Admin' : 'Officer'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        @{officer.username} • <span className={`font-semibold ${rank.color}`}>{rank.title}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-amber-400">
                      {officer.totalActions}
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Actions</div>
                  </div>
                </div>

                {/* Contribution Breakdown Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      Attendance:
                    </span>
                    <span className="font-bold text-slate-200">{officer.attendanceCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Swords className="w-3 h-3 text-sky-400" />
                      Events:
                    </span>
                    <span className="font-bold text-slate-200">{officer.eventsCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-400" />
                      Strikes:
                    </span>
                    <span className="font-bold text-slate-200">{officer.strikesCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-purple-400" />
                      Notes:
                    </span>
                    <span className="font-bold text-slate-200">{officer.commsCount + officer.membersCount}</span>
                  </div>
                </div>

                {/* Footer: Last active */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Last Active:
                  </span>
                  <span className="font-mono text-slate-300">
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
            <h2 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Live Tracking Activity Log</span>
            </h2>

            <div className="text-xs text-slate-400">
              Showing {filteredContributions.length} of {contributions.length} recorded entries
            </div>
          </div>

          {/* Filter Controls */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap gap-2.5 items-center w-full min-w-0">
            {/* Search */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by action, player, or event..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
              />
            </div>

            {/* Officer Filter */}
            <select
              value={selectedOfficer}
              onChange={e => setSelectedOfficer(e.target.value)}
              className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
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
              className="w-full sm:w-auto min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Action Types</option>
              <option value="ATTENDANCE">Event Attendance</option>
              <option value="EVENTS">Alliance Events</option>
              <option value="STRIKES">Strikes &amp; Discipline</option>
              <option value="MEMBERS">Member Changes</option>
              <option value="COMMS">Communication Notes</option>
            </select>
          </div>

          {/* Desktop Table View (screens >= md) */}
          <div className="hidden md:block rounded-xl bg-slate-900/80 border border-slate-800 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-300 font-semibold text-xs border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No officer contributions match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredContributions.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{item.adminName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">@{item.adminUsername}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getActionBadge(item.action)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-amber-300/90">{item.targetName || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.description}</td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                        {safeFormatDateTime(item.timestamp)}
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
              <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                No officer contributions match your filters.
              </div>
            ) : (
              filteredContributions.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-100">{item.adminName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">@{item.adminUsername}</span>
                    </div>
                    {getActionBadge(item.action)}
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    {item.targetName && (
                      <div className="text-[11px] font-semibold text-amber-300">
                        Target: {item.targetName}
                      </div>
                    )}
                    <div className="text-slate-300 text-xs">{item.description}</div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
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
