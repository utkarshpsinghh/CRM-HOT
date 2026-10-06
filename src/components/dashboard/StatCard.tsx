import React from 'react';
import { clsx } from 'clsx';
import { sounds } from '../../utils/sound';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'crimson' | 'amber' | 'slate';
  onClick?: () => void;
  badge?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'gold',
  onClick,
  badge,
  className,
}) => {
  const variantStyles = {
    gold: {
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      valueColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      glow: 'group-hover:border-amber-500/40',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      valueColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      glow: 'group-hover:border-emerald-500/40',
    },
    crimson: {
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      valueColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      glow: 'group-hover:border-rose-500/40',
    },
    amber: {
      iconBg: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
      valueColor: 'text-orange-400',
      badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      glow: 'group-hover:border-orange-500/40',
    },
    slate: {
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
      valueColor: 'text-indigo-300',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      glow: 'group-hover:border-indigo-500/40',
    },
  }[variant];

  return (
    <div
      onClick={() => {
        if (onClick) {
          sounds.playClick();
          onClick();
        }
      }}
      className={clsx(
        'rounded-xl bg-slate-900/75 border border-slate-800/80 p-4 transition-all duration-150 select-none relative overflow-hidden group flex flex-col justify-between',
        variantStyles.glow,
        onClick ? 'cursor-pointer hover:bg-slate-900 hover:border-slate-700 active:scale-[0.98]' : '',
        className
      )}
    >
      {/* Top Header Plate */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        <div className={clsx('w-8 h-8 rounded-lg border shrink-0 flex items-center justify-center', variantStyles.iconBg)}>
          {icon}
        </div>
      </div>

      {/* Numeric Metric */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
            {value}
          </div>
          {badge && (
            <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border', variantStyles.badgeBg)}>
              {badge}
            </span>
          )}
        </div>

        {subtitle && (
          <div className="text-xs text-slate-400 font-medium mt-1 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
