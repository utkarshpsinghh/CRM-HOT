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
      border: 'border-[#522d14]',
      valueColor: 'text-[#fef08a]',
      iconBg: 'bg-[#451f08] text-[#fbbf24]',
    },
    emerald: {
      border: 'border-emerald-900/60',
      valueColor: 'text-emerald-300',
      iconBg: 'bg-emerald-950 text-emerald-400',
    },
    crimson: {
      border: 'border-red-900/60',
      valueColor: 'text-red-300',
      iconBg: 'bg-red-950 text-red-400',
    },
    amber: {
      border: 'border-amber-900/60',
      valueColor: 'text-amber-300',
      iconBg: 'bg-amber-950 text-amber-300',
    },
    slate: {
      border: 'border-[#3d200e]',
      valueColor: 'text-stone-200',
      iconBg: 'bg-[#29160a] text-stone-300',
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
        'rounded-xl bg-[#20150f] border p-4 transition-all duration-150 select-none shadow-sm',
        variantStyles.border,
        onClick ? 'cursor-pointer hover:border-[#b45309] hover:bg-[#271a13]' : '',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-stone-300 truncate">
          {title}
        </span>
        <div className={clsx('p-1.5 rounded-lg shrink-0', variantStyles.iconBg)}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className={clsx('text-2xl sm:text-3xl font-extrabold tracking-tight', variantStyles.valueColor)}>
          {value}
        </div>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/70 text-red-200 font-bold uppercase">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-stone-400 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};
