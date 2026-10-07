import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from './StatCard';
import { AlertsBanner } from './AlertsBanner';
import { EventOverviewCard } from './EventOverviewCard';
import { RecentEventsList } from './RecentEventsList';
import {
  Users,
  ShieldCheck,
  UserX,
  Flame,
  BarChart3,
  Swords,
  UserPlus,
  ArrowRight,
  Trophy,
  Shield,
  Plus,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getComputedEventStatus, parseDateAsUtc } from '../../utils/date';

interface DashboardViewProps {
  onOpenCreateEvent: () => void;
  onOpenAddMember: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCreateEvent,
  onOpenAddMember,
}) => {
  const { stats, events, eventSlots, setActiveTab, setMemberFilter } = useCRM();
  const { isMainAdmin } = useAuth();

  // Prioritize upcoming events first, then recent events in descending order
  const dashboardEvents = useMemo(() => {
    if (!events.length) return [];

    const getStatus = (e: (typeof events)[0]) => {
      const slot2 = eventSlots.find(s => s.eventId === e.id && s.slotNumber === 2);
      return getComputedEventStatus(e.date, slot2?.startTime);
    };

    const upcoming = events
      .filter(e => {
        const s = getStatus(e);
        return s === 'Upcoming' || e.status === 'Scheduled' || e.status === 'Live';
      })
      .sort((a, b) => {
        const tA = parseDateAsUtc(a.date)?.getTime() || 0;
        const tB = parseDateAsUtc(b.date)?.getTime() || 0;
        return tA - tB; // Soonest upcoming first
      });

    const completed = events
      .filter(e => {
        const s = getStatus(e);
        return s !== 'Upcoming' && e.status !== 'Scheduled' && e.status !== 'Live';
      })
      .sort((a, b) => {
        const tA = parseDateAsUtc(a.date)?.getTime() || 0;
        const tB = parseDateAsUtc(b.date)?.getTime() || 0;
        return tB - tA; // Newest completed first
      });

    return [...upcoming, ...completed].slice(0, 6);
  }, [events, eventSlots]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Modern Headquarters Command Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle ambient light */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-[1px] shadow-lg shadow-amber-500/20 shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Alliance Command
              </h1>
              <span className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                HOT K1391
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Live management overview for alliance members, event participation check-ins, and disciplinary records.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10 shrink-0">
          {isMainAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenCreateEvent();
              }}
              className="btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 5 Tactical Resource Stat Pods */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          subtitle="Enrolled members"
          icon={<Users className="w-4 h-4" />}
          variant="gold"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          subtitle="Combat ready"
          icon={<ShieldCheck className="w-4 h-4" />}
          variant="emerald"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'Active', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Inactive Members"
          value={stats.inactiveMembers}
          subtitle="Manual roster status"
          icon={<UserX className="w-4 h-4" />}
          variant="crimson"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'Inactive', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Strike Watch"
          value={stats.membersWithStrikes}
          subtitle="Disciplinary cases"
          icon={<Flame className="w-4 h-4" />}
          variant="amber"
          badge={stats.membersWithStrikes > 0 ? 'Active' : undefined}
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 1 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Avg Turnout"
          value={`${stats.averageAttendanceRate.toFixed(0)}%`}
          subtitle="All wars combined"
          icon={<BarChart3 className="w-4 h-4" />}
          variant="slate"
          className="col-span-2 sm:col-span-1 lg:col-span-1"
          onClick={() => {
            setActiveTab('attendance');
          }}
        />
      </div>

      {/* Actionable Discipline & Inactivity Alerts */}
      <AlertsBanner />

      {/* Attendance Leaderboard Hero Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <span>Hall of Fame &amp; War Champion Rankings</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Top Stats
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Monthly top attendance warriors and all-time alliance participation rankings.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveTab('leaderboard');
          }}
          className="btn-primary px-4 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Trophy className="w-4 h-4" />
          <span>View Rankings</span>
        </button>
      </div>

      {/* Events Overview */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Alliance Events
            </h2>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('events');
            }}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>All Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardEvents.map(evt => (
            <EventOverviewCard key={evt.id} event={evt} />
          ))}
        </div>
      </div>

      {/* Recent Events Log Scroll */}
      <div>
        <RecentEventsList />
      </div>
    </div>
  );
};
