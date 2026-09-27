import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { AlertTriangle, Flame, Clock, ChevronRight, Bell } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AlertsBanner: React.FC = () => {
  const { members, inactiveInsights, setActiveTab, setMemberFilter } = useCRM();

  // 1. Members with 2+ strikes
  const criticalStrikes = members.filter(m => m.strikes >= 2 && m.status !== 'Archived');

  // 2. Members inactive >= 7 days
  const inactiveCount = inactiveInsights.filter(i => i.tier === 'Inactive' || i.tier === 'Critical').length;

  // 3. Members in Warning tier (3-6 days)
  const warningCount = inactiveInsights.filter(i => i.tier === 'Warning').length;

  // 4. Members with communication status Warning or Poor
  const poorCommCount = members.filter(m => (m.communication === 'Poor' || m.communication === 'Warning') && m.status !== 'Archived').length;

  const alerts = [
    {
      id: 'strikes',
      show: criticalStrikes.length > 0,
      icon: <Flame className="w-4 h-4 text-red-400" />,
      text: `${criticalStrikes.length} member${criticalStrikes.length > 1 ? 's' : ''} carry 2+ strikes (High Risk)`,
      badge: 'Action Needed',
      badgeClass: 'bg-red-950 text-red-300 border-red-700',
      borderClass: 'border-red-700/60 hover:border-red-500 bg-red-950/30',
      action: () => {
        setMemberFilter({
          search: '',
          rank: 'ALL',
          comm: 'ALL',
          status: 'ALL',
          strikeMin: 2,
        });
        setActiveTab('members');
      },
    },
    {
      id: 'inactive',
      show: inactiveCount > 0,
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      text: `${inactiveCount} member${inactiveCount > 1 ? 's have' : ' has'} zero activity in the last 7+ days`,
      badge: 'Inactivity Alert',
      badgeClass: 'bg-amber-950 text-amber-300 border-amber-700',
      borderClass: 'border-amber-700/60 hover:border-amber-500 bg-amber-950/30',
      action: () => {
        setActiveTab('activity');
      },
    },
    {
      id: 'warning',
      show: warningCount > 0,
      icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
      text: `${warningCount} member${warningCount > 1 ? 's' : ''} nearing inactivity threshold (3-6 days silent)`,
      badge: 'Watchlist',
      badgeClass: 'bg-yellow-950 text-yellow-300 border-yellow-700',
      borderClass: 'border-yellow-700/60 hover:border-yellow-500 bg-yellow-950/20',
      action: () => {
        setActiveTab('activity');
      },
    },
    {
      id: 'comm',
      show: poorCommCount > 0,
      icon: <Bell className="w-4 h-4 text-orange-400" />,
      text: `${poorCommCount} member${poorCommCount > 1 ? 's flagged' : ' flagged'} with poor or warning communication`,
      badge: 'Comms',
      badgeClass: 'bg-orange-950 text-orange-300 border-orange-700',
      borderClass: 'border-orange-700/60 hover:border-orange-500 bg-orange-950/20',
      action: () => {
        setMemberFilter({
          search: '',
          rank: 'ALL',
          comm: 'Poor',
          status: 'ALL',
          strikeMin: 0,
        });
        setActiveTab('members');
      },
    },
  ].filter(a => a.show);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-fantasy font-bold uppercase tracking-wider text-[#ca8a04]">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span>Alliance Command War-Room Notices</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {alerts.map(a => (
          <div
            key={a.id}
            onClick={() => {
              sounds.playClick();
              a.action();
            }}
            className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 select-none ${a.borderClass} hover:shadow-md hover:scale-[1.01]`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0">{a.icon}</div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-stone-200 truncate">
                  {a.text}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] uppercase font-fantasy font-bold px-2 py-0.5 rounded border ${a.badgeClass}`}>
                {a.badge}
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
