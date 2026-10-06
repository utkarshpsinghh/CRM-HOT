import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const AlertsBanner: React.FC = () => {
  const { members, setActiveTab, setMemberFilter } = useCRM();

  const criticalStrikes = members.filter(m => m.strikes >= 2 && m.status !== 'Archived');

  const alerts = [
    {
      id: 'strikes',
      show: criticalStrikes.length > 0,
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      title: 'Discipline Warning',
      text: `${criticalStrikes.length} member${criticalStrikes.length > 1 ? 's have' : ' has'} 2 or more strikes`,
      actionLabel: 'Review Strikes',
      borderClass: 'border-rose-500/30 hover:border-rose-500/50',
      bgClass: 'bg-rose-500/10',
      btnClass: 'bg-rose-500 text-white hover:bg-rose-400',
      action: () => {
        setMemberFilter({ search: '', rank: 'ALL', comm: 'ALL', status: 'ALL', strikeMin: 2 });
        setActiveTab('members');
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
          className={`flex-1 p-3.5 sm:p-4 rounded-xl border ${a.bgClass} ${a.borderClass} flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-150 active:scale-[0.99]`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0">
              {a.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                {a.title}
              </div>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {a.text}
              </p>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors ${a.btnClass}`}>
            <span>{a.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      ))}
    </div>
  );
};
