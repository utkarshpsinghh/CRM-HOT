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
  Clock,
  Swords,
  UserPlus,
  BarChart3,
  RefreshCw,
  Database,
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
  const {
    stats,
    events,
    setActiveTab,
    setMemberFilter,
    syncWithGoogleSheets,
    isSyncingSheets,
    syncStatus,
    lastSyncTime,
  } = useCRM();

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* CLEAN & SIMPLE ALLIANCE HERO BANNER */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-gradient-to-r from-[#29170e] via-[#22130b] to-[#1a0e08] border-2 border-[#572e13] p-5 sm:p-7 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#fbbf24] px-2 py-0.5 rounded bg-[#42200a] border border-[#78350f]">
                Kingshot Kingdom Alliance
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {syncStatus === 'connected' ? '🟢 Google Sheets Connected' : '🛡️ Local Database Mode'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#fffbeb] tracking-tight">
              HOT Alliance Command Center
            </h1>

            <p className="text-xs sm:text-sm text-stone-300 font-medium">
              &quot;Strength Through Unity&quot; • Member roster, event turnout telemetry, and strike tracking.
            </p>
          </div>

          {/* Action Buttons: Clear, Obvious, and High-Contrast */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sync with Google Sheets button with loading indicator */}
            <button
              onClick={() => syncWithGoogleSheets()}
              disabled={isSyncingSheets}
              className="px-3.5 py-2.5 rounded-lg bg-[#2e180d] border border-[#783e1b] text-[#fef08a] hover:bg-[#3d2011] text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Sync latest rows from Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#fbbf24] ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheets ? 'Syncing...' : 'Sync Google Sheets'}</span>
            </button>

            {/* Summon Event Button */}
            <button
              onClick={() => {
                sounds.playClick();
                onOpenCreateEvent();
              }}
              className="btn-kingshot-gold px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Swords className="w-4 h-4" />
              <span>Summon Event</span>
            </button>

            {/* Induct Member Button */}
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAddMember();
              }}
              className="btn-kingshot-cream px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <UserPlus className="w-4 h-4 text-[#381a07]" />
              <span>Induct Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5 CLEAN TELEMETRY METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          subtitle="Full alliance roster"
          icon={<Users className="w-5 h-5" />}
          variant="gold"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Active Combatants"
          value={stats.activeMembers}
          subtitle="Combat ready"
          icon={<ShieldCheck className="w-5 h-5" />}
          variant="emerald"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'Active', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Inactive Members"
          value={stats.inactiveMembers}
          subtitle="Offline > 7 days"
          icon={<UserX className="w-5 h-5" />}
          variant="crimson"
          onClick={() => {
            setActiveTab('activity');
          }}
        />

        <StatCard
          title="With Strikes"
          value={stats.membersWithStrikes}
          subtitle="Disciplinary records"
          icon={<Flame className="w-5 h-5" />}
          variant="amber"
          badge={stats.membersWithStrikes > 0 ? 'Review' : undefined}
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 1 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Needs Attention"
          value={stats.needsAttentionMembers}
          subtitle="Silent / Unrecorded"
          icon={<Clock className="w-5 h-5" />}
          variant="slate"
          badge={stats.needsAttentionMembers > 0 ? 'Alert' : undefined}
          onClick={() => {
            setActiveTab('activity');
          }}
        />
      </div>

      {/* Actionable War Alerts */}
      <AlertsBanner />

      {/* Event Overview: 6 Event Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#fbbf24]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#fffbeb] tracking-wide">
              War Events Telemetry
            </h2>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('events');
            }}
            className="text-xs font-bold uppercase text-[#fbbf24] hover:underline flex items-center gap-1 cursor-pointer font-sans"
          >
            <span>Manage All Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.slice(0, 6).map(evt => (
            <EventOverviewCard key={evt.id} event={evt} />
          ))}
        </div>
      </div>

      {/* Recent Events List & Alliance Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentEventsList />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-[#221711] border-2 border-[#522d14] p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-[#fbbf24]" />
              <h3 className="font-bold text-base text-[#fffbeb]">
                Alliance Performance
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#170e09] border border-[#42220d]">
                <div className="text-stone-300 font-bold">Average Event Attendance</div>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  {stats.averageAttendanceRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">Across completed throne and swordland wars</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#170e09] border border-[#42220d]">
                <div className="text-stone-300 font-bold">Average Vote Turnout</div>
                <div className="text-2xl font-black text-blue-300 mt-1 font-mono">
                  {stats.averageVoteRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">Members responding to pre-war summons</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#3d1f0c]">
              <button
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('attendance');
                }}
                className="btn-kingshot-gold w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>OPEN ATTENDANCE ANALYZER</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
