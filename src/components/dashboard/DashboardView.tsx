import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { StatCard } from './StatCard';
import { AlertsBanner } from './AlertsBanner';
import { EventOverviewCard } from './EventOverviewCard';
import { RecentEventsList } from './RecentEventsList';
import { GameButton } from '../common/GameButton';
import {
  Users,
  ShieldCheck,
  UserX,
  Flame,
  Clock,
  Swords,
  PlusCircle,
  BarChart3,
  Sparkles,
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
      {/* Alliance War-Room Banner Header (Section 6 & 38) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#2a1315] via-[#1a1e2d] to-[#121622] border-2 border-[#ca8a04] p-5 sm:p-7 shadow-[0_0_30px_rgba(202,138,4,0.25)] overflow-hidden">
        {/* Filigree corner decorations */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#fef08a]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#fef08a]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#fef08a]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#fef08a]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-600/70 text-red-200 text-xs font-fantasy uppercase tracking-widest font-bold">
              <Sparkles className="w-3 h-3 text-[#fef08a]" />
              <span>War Room Telemetry</span>
            </div>

            <h1 className="font-fantasy font-black text-2xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#fffbeb] via-[#fef08a] to-[#ca8a04] tracking-wide">
              HOT ALLIANCE COMMAND CENTER
            </h1>

            <p className="text-sm text-stone-300 font-sans italic">
              &quot;Strength Through Unity&quot; • Kingshot Alliance Management CRM
            </p>
          </div>

          {/* Quick Action War Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <GameButton
              variant="crimson"
              size="md"
              onClick={onOpenCreateEvent}
              icon={<Swords className="w-4 h-4" />}
            >
              Summon Event
            </GameButton>

            <GameButton
              variant="gold"
              size="md"
              onClick={onOpenAddMember}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Induct Member
            </GameButton>
          </div>
        </div>
      </div>

      {/* Alliance Summary Metric Cards (Section 6 & 25) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          subtitle="Full roster strength"
          icon={<Users className="w-5 h-5" />}
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
          subtitle="Rule infractions"
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

      {/* Actionable War Alerts Banner */}
      <AlertsBanner />

      {/* Event Overview: 6 Event Cards (Section 7) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#ca8a04]" />
            <h2 className="font-fantasy font-bold text-lg sm:text-xl text-[#fef08a] tracking-wide">
              ⚔️ War Events Telemetry
            </h2>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('events');
            }}
            className="text-xs font-fantasy font-bold uppercase text-[#ca8a04] hover:text-[#fef08a] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Manage All Events</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.slice(0, 6).map(evt => (
            <EventOverviewCard key={evt.id} event={evt} />
          ))}
        </div>
      </div>

      {/* Recent Events List & Attendance Speed Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentEventsList />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-b from-[#1b1f2d] to-[#121520] border-[1.5px] border-[#524126] p-5 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-[#eab308]" />
              <h3 className="font-fantasy font-bold text-sm text-[#fef08a]">
                Alliance Performance
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0c0e16] border border-[#3f311a]">
                <div className="text-stone-400">Average Event Attendance</div>
                <div className="font-fantasy font-bold text-xl text-emerald-300 mt-1">
                  {stats.averageAttendanceRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Across completed throne and swordland wars</p>
              </div>

              <div className="p-3 rounded-lg bg-[#0c0e16] border border-[#3f311a]">
                <div className="text-stone-400">Average Vote Participation</div>
                <div className="font-fantasy font-bold text-xl text-blue-300 mt-1">
                  {stats.averageVoteRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Members responding to pre-war summons</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#3f311a]">
              <GameButton
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('attendance');
                }}
              >
                Open Attendance Analyzer
              </GameButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
