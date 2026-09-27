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
  Sparkles,
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
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* KINGSHOT WOODEN SIGNBOARD HERO (Matches Reference UI Screenshot Exactly) */}
      {/* ========================================================================= */}
      <div className="relative pt-3 pb-4">
        {/* Cute Cartoon Decorative Flowers (matches 🌸 in screenshot) */}
        <div className="hidden sm:block absolute -left-2 bottom-6 text-2xl select-none animate-bounce" style={{ animationDuration: '3s' }}>
          🌸
        </div>
        <div className="hidden sm:block absolute -right-2 bottom-6 text-2xl select-none animate-bounce" style={{ animationDuration: '3.5s' }}>
          🌸
        </div>

        {/* The Centerpiece Wooden Signboard */}
        <div className="max-w-3xl mx-auto kingshot-signboard p-6 sm:p-10 text-center relative overflow-hidden">
          {/* Top Left Brass Bolt + Leaf Sprout 🌱 (matches screenshot) */}
          <div className="corner-bolt top-3 left-3" />
          <div className="absolute top-2 left-6 text-lg select-none">
            🌱
          </div>

          {/* Top Right Brass Bolt + Leaf Sprout 🌱 (matches screenshot) */}
          <div className="corner-bolt top-3 right-3" />
          <div className="absolute top-2 right-6 text-lg select-none">
            🌱
          </div>

          {/* Bottom Brass Bolts */}
          <div className="corner-bolt bottom-3 left-3" />
          <div className="corner-bolt bottom-3 right-3" />

          {/* Inner Content */}
          <div className="relative z-10 space-y-2 sm:space-y-3">
            {/* Top tiny label */}
            <div className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#fbbf24] font-sans">
              KINGSHOT ALLIANCE HOT
            </div>

            {/* Huge 3D Woodcut Title (Matches "FIND YOUR FOREVER HOME") */}
            <h1 className="woodcut-title text-3xl sm:text-5xl lg:text-6xl font-black uppercase leading-none tracking-wider">
              ALLIANCE<br />COMMAND CENTER
            </h1>

            {/* Sub-heading (Matches "in K1391") */}
            <div className="font-kingshot text-lg sm:text-2xl text-[#fde68a] tracking-wide">
              in HOT Alliance
            </div>
          </div>
        </div>

        {/* Subtitle text below signboard (Matches screenshot's text) */}
        <div className="text-center mt-5 mb-5 max-w-xl mx-auto px-4">
          <p className="text-sm sm:text-base font-bold text-[#ffffff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed">
            A friendly kingdom for active players, strong alliances and unforgettable battles.
          </p>
        </div>

        {/* Two Kingshot Action Buttons (Matches "EXPLORE ALLIANCES" and "TRANSFER INFORMATION") */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto px-4">
          {/* Golden Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenCreateEvent();
            }}
            className="btn-kingshot-gold w-full sm:w-auto px-6 py-3 text-sm sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>SUMMON WAR EVENT</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          {/* Cream / Parchment Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-kingshot-cream w-full sm:w-auto px-6 py-3 text-sm sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>INDUCT MEMBER</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALLIANCE SUMMARY METRIC CARDS (In Kingshot Wooden Panels) */}
      {/* ========================================================================= */}
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
          subtitle="Silent / Watchlist"
          icon={<Clock className="w-5 h-5" />}
          variant="slate"
          badge={stats.needsAttentionMembers > 0 ? 'Alert' : undefined}
          onClick={() => {
            setActiveTab('activity');
          }}
        />
      </div>

      {/* Actionable War Room Alerts */}
      <AlertsBanner />

      {/* Event Overview: 6 Event Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#fbbf24]" />
            <h2 className="font-kingshot text-xl sm:text-2xl text-[#fffbeb] tracking-wide drop-shadow-md">
              ⚔️ War Events Telemetry
            </h2>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('events');
            }}
            className="text-xs font-bold uppercase text-[#fef08a] hover:underline flex items-center gap-1 cursor-pointer font-sans"
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
          <div className="kingshot-panel p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-[#fbbf24]" />
              <h3 className="font-kingshot text-lg text-[#fffbeb]">
                Alliance Performance
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#241106] border border-[#5c2a0d]">
                <div className="text-stone-300 font-bold">Average Event Attendance</div>
                <div className="font-kingshot text-2xl text-emerald-400 mt-1">
                  {stats.averageAttendanceRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">Across completed throne and swordland wars</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#241106] border border-[#5c2a0d]">
                <div className="text-stone-300 font-bold">Average Vote Turnout</div>
                <div className="font-kingshot text-2xl text-blue-300 mt-1">
                  {stats.averageVoteRate.toFixed(1)}%
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">Members responding to pre-war summons</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#4d2309]">
              <button
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('attendance');
                }}
                className="btn-kingshot-gold w-full py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>OPEN ATTENDANCE ANALYZER</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
