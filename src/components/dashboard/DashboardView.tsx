import React from 'react';
import { useCRM } from '../../context/CRMContext';
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
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface DashboardViewProps {
  onOpenCreateEvent: () => void;
  onOpenAddMember: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCreateEvent,
  onOpenAddMember,
}) => {
  const { stats, events, setActiveTab, setMemberFilter } = useCRM();

  return (
    <div className="space-y-6">
      {/* Clean Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#241710] to-[#1c120c] border border-[#4d2912] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#fffbeb] tracking-tight">
            Alliance Command Center
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Manage alliance members, record war attendance, and monitor strikes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              sounds.playClick();
              onOpenCreateEvent();
            }}
            className="btn-kingshot-gold px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>New Event</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-kingshot-cream px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 5 Simple Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          subtitle="All alliance members"
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
          subtitle="Regularly participating"
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
          subtitle="Offline for 7+ days"
          icon={<UserX className="w-4 h-4" />}
          variant="crimson"
          onClick={() => {
            setActiveTab('activity');
          }}
        />

        <StatCard
          title="Strikes"
          value={stats.membersWithStrikes}
          subtitle="Members with warnings"
          icon={<Flame className="w-4 h-4" />}
          variant="amber"
          badge={stats.membersWithStrikes > 0 ? 'Review' : undefined}
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 1 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Avg Attendance"
          value={`${stats.averageAttendanceRate.toFixed(0)}%`}
          subtitle="Across all war events"
          icon={<BarChart3 className="w-4 h-4" />}
          variant="slate"
          className="col-span-2 sm:col-span-1 lg:col-span-1"
          onClick={() => {
            setActiveTab('attendance');
          }}
        />
      </div>

      {/* Actionable Alerts */}
      <AlertsBanner />

      {/* Events Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#fffbeb]">
            War Events
          </h2>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('events');
            }}
            className="text-xs font-semibold text-[#fbbf24] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {events.slice(0, 6).map(evt => (
            <EventOverviewCard key={evt.id} event={evt} />
          ))}
        </div>
      </div>

      {/* Recent Events Log */}
      <div>
        <RecentEventsList />
      </div>
    </div>
  );
};
