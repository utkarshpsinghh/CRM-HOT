import React from 'react';
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
  Castle,
  Crown,
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
  const { isMainAdmin } = useAuth();

  return (
    <div className="space-y-6 animate-pop-in">
      
      {/* Cartoon Headquarters Command Banner */}
      <div className="kingshot-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        {/* Ambient gold glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-[#f59e0b] via-[#b45309] to-[#78350f] p-1 border-[2.5px] border-[#fef08a] shadow-[0_5px_0_#451a03] shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-gradient-to-b from-[#881337] to-[#4c0519] flex items-center justify-center">
              <Castle className="w-7 h-7 sm:w-8 sm:h-8 text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-fantasy font-black text-[#fffbeb] tracking-wide game-text-shadow">
                Alliance Headquarters
              </h1>
              <span className="text-[10px] font-fantasy font-black uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black border border-yellow-200 shadow-sm">
                HOT COMMAND
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-200/90 font-medium mt-1">
              Active command deck for warrior tracking, war attendance check-ins, and strike ledger.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap relative z-10 shrink-0">
          {isMainAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenCreateEvent();
              }}
              className="btn-kingshot-gold px-4 py-2.5 text-xs font-fantasy font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Swords className="w-4 h-4 text-black" />
              <span>Schedule War</span>
            </button>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onOpenAddMember();
            }}
            className="btn-kingshot-cream px-4 py-2.5 text-xs font-fantasy font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <UserPlus className="w-4 h-4 text-[#451a03]" />
            <span>Enlist Warrior</span>
          </button>
        </div>
      </div>

      {/* 5 Tactical Resource Stat Pods */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Warriors"
          value={stats.totalMembers}
          subtitle="Enrolled in alliance"
          icon={<Users className="w-4 h-4 text-black" />}
          variant="gold"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Active Warriors"
          value={stats.activeMembers}
          subtitle="Battle ready"
          icon={<ShieldCheck className="w-4 h-4 text-black" />}
          variant="emerald"
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'Active', strikeMin: 0 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Slacker Alert"
          value={stats.inactiveMembers}
          subtitle="7+ days inactive"
          icon={<UserX className="w-4 h-4 text-white" />}
          variant="crimson"
          onClick={() => {
            setActiveTab('activity');
          }}
        />

        <StatCard
          title="Strike Watch"
          value={stats.membersWithStrikes}
          subtitle="Disciplinary records"
          icon={<Flame className="w-4 h-4 text-white" />}
          variant="amber"
          badge={stats.membersWithStrikes > 0 ? 'Review' : undefined}
          onClick={() => {
            setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 1 });
            setActiveTab('members');
          }}
        />

        <StatCard
          title="Avg War Turnout"
          value={`${stats.averageAttendanceRate.toFixed(0)}%`}
          subtitle="Overall attendance"
          icon={<BarChart3 className="w-4 h-4 text-amber-300" />}
          variant="slate"
          className="col-span-2 sm:col-span-1 lg:col-span-1"
          onClick={() => {
            setActiveTab('attendance');
          }}
        />
      </div>

      {/* Actionable Discipline & Inactivity Alerts */}
      <AlertsBanner />

      {/* Attendance Leaderboard Hero Card */}
      <div className="game-panel-gold p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#fde047] to-[#ca8a04] border-2 border-[#fef08a] flex items-center justify-center text-black shrink-0 shadow-[0_4px_0_#78350f]">
            <Trophy className="w-6 h-6 text-black drop-shadow" />
          </div>
          <div>
            <h3 className="font-fantasy font-black text-lg text-[#fef08a] flex items-center gap-2 game-text-shadow">
              <span>Hall of Fame &amp; War Champion Rankings</span>
              <span className="text-[10px] font-fantasy font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400">
                HONORS
              </span>
            </h3>
            <p className="text-xs text-amber-200/90 font-medium mt-0.5">
              Top attendance warriors of the month and all-time alliance participation champions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveTab('leaderboard');
          }}
          className="btn-kingshot-gold px-5 py-2.5 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0 self-start sm:self-auto"
        >
          <Trophy className="w-4 h-4 text-black" />
          <span>Enter Hall of Fame</span>
        </button>
      </div>

      {/* Events Overview */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-fantasy font-black text-[#fffbeb] tracking-wide game-text-shadow">
              Alliance War Fronts
            </h2>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('events');
            }}
            className="btn-kingshot-cream px-3 py-1.5 text-xs font-fantasy font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>All Wars</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.slice(0, 6).map(evt => (
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
