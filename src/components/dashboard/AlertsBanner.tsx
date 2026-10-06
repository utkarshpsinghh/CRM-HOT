import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Flame, Clock, ChevronRight, AlertOctagon } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AlertsBanner: React.FC = () => {
  const { members, inactiveInsights, setActiveTab, setMemberFilter } = useCRM();

  const criticalStrikes = members.filter(m => m.strikes >= 2 && m.status !== 'Archived');
  const inactiveCount = inactiveInsights.filter(i => i.tier === 'Inactive' || i.tier === 'Critical').length;

  const alerts = [
    {
      id: 'strikes',
      show: criticalStrikes.length > 0,
      icon: <Flame className="w-5 h-5 text-red-400 drop-shadow" />,
      title: 'Discipline Warning',
      text: `${criticalStrikes.length} warrior${criticalStrikes.length > 1 ? 's carry' : ' carries'} 2+ strikes`,
      actionLabel: 'Review Strikes',
      borderClass: 'border-red-600',
      bevelColor: '#450a0a',
      bgClass: 'from-[#2e0f0f] to-[#1a0808]',
      action: () => {
        setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 2 });
        setActiveTab('members');
      },
    },
    {
      id: 'inactive',
      show: inactiveCount > 0,
      icon: <Clock className="w-5 h-5 text-amber-400 drop-shadow" />,
      title: 'Slacker Alert',
      text: `${inactiveCount} warrior${inactiveCount > 1 ? 's' : ''} offline for 7+ days`,
      actionLabel: 'Check Inactivity',
      borderClass: 'border-amber-600',
      bevelColor: '#7c2d12',
      bgClass: 'from-[#2e190b] to-[#1c0e06]',
      action: () => {
        setActiveTab('activity');
      },
    },
  ].filter(a => a.show);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {alerts.map(a => (
        <div
          key={a.id}
          onClick={() => {
            sounds.playClick();
            a.action();
          }}
          style={{
            boxShadow: `0 5px 0 ${a.bevelColor}, 0 8px 16px rgba(0, 0, 0, 0.4)`,
          }}
          className={`flex-1 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b ${a.bgClass} border-[3px] ${a.borderClass} flex items-center justify-between gap-3 cursor-pointer select-none transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-black/40 border-2 border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              {a.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-fantasy font-black uppercase tracking-wider text-[#fef08a]">
                {a.title}
              </div>
              <p className="text-xs text-stone-200 font-medium truncate mt-0.5">
                {a.text}
              </p>
            </div>
          </div>

          <div className="btn-kingshot-gold px-3 py-1.5 text-[11px] font-fantasy font-black uppercase flex items-center gap-1 shrink-0 shadow-sm">
            <span>{a.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      ))}
    </div>
  );
};
