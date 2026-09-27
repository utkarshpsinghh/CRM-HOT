import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { AlertTriangle, Flame, Clock, ChevronRight } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AlertsBanner: React.FC = () => {
  const { members, inactiveInsights, setActiveTab, setMemberFilter } = useCRM();

  const criticalStrikes = members.filter(m => m.strikes >= 2 && m.status !== 'Archived');
  const inactiveCount = inactiveInsights.filter(i => i.tier === 'Inactive' || i.tier === 'Critical').length;

  const alerts = [
    {
      id: 'strikes',
      show: criticalStrikes.length > 0,
      icon: <Flame className="w-4 h-4 text-red-400" />,
      text: `${criticalStrikes.length} member${criticalStrikes.length > 1 ? 's have' : ' has'} 2+ strikes`,
      action: () => {
        setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 2 });
        setActiveTab('members');
      },
    },
    {
      id: 'inactive',
      show: inactiveCount > 0,
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      text: `${inactiveCount} member${inactiveCount > 1 ? 's' : ''} inactive for 7+ days`,
      action: () => {
        setActiveTab('activity');
      },
    },
  ].filter(a => a.show);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {alerts.map(a => (
        <div
          key={a.id}
          onClick={() => {
            sounds.playClick();
            a.action();
          }}
          className="w-full sm:flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-[#27150c] border border-[#52290d] hover:border-[#b45309] flex items-center justify-between gap-3 cursor-pointer transition-all text-xs"
        >
          <div className="flex items-center gap-2 text-stone-200 font-medium truncate">
            {a.icon}
            <span className="truncate">{a.text}</span>
          </div>
          <span className="text-[#fbbf24] font-semibold flex items-center gap-1 shrink-0 text-[11px]">
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      ))}
    </div>
  );
};
