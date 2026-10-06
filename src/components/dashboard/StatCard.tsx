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
      border: 'border-[#522d14] hover:border-[#f59e0b]',
      valueColor: 'text-[#fef08a]',
      iconBg: 'bg-[#451f08] text-[#fbbf24] border border-[#f59e0b]/30',
    },
    emerald: {
      border: 'border-emerald-800/80 hover:border-emerald-500',
      valueColor: 'text-emerald-300',
      iconBg: 'bg-emerald-950 text-emerald-400 border border-emerald-600/30',
    },
    crimson: {
      border: 'border-red-900/80 hover:border-red-500',
      valueColor: 'text-red-300',
      iconBg: 'bg-red-950 text-red-400 border border-red-600/30',
    },
    amber: {
      border: 'border-amber-900/80 hover:border-amber-500',
      valueColor: 'text-amber-300',
      iconBg: 'bg-amber-950 text-amber-300 border border-amber-600/30',
    },
    slate: {
      border: 'border-[#3d200e] hover:border-[#ca8a04]',
      valueColor: 'text-stone-200',
      iconBg: 'bg-[#29160a] text-stone-300 border border-[#522d14]',
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
        'rounded-2xl bg-[#1e140d] border-2 p-4 transition-all duration-150 select-none shadow-[0_4px_0_rgba(0,0,0,0.4)]',
        variantStyles.border,
        onClick ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5' : '',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-fantasy font-black uppercase text-stone-300 tracking-wide truncate">
          {title}
        </span>
        <div className={clsx('p-2 rounded-xl shrink-0 shadow-inner', variantStyles.iconBg)}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className={clsx('text-2xl sm:text-3xl font-fantasy font-black tracking-wide', variantStyles.valueColor)}>
          {value}
        </div>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-black uppercase shadow-sm">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-stone-400 font-medium truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};
