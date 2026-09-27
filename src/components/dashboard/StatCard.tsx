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
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'gold',
  onClick,
  badge,
}) => {
  const variantStyles = {
    gold: {
      border: 'border-[#ca8a04]',
      glow: 'shadow-[0_4px_12px_rgba(202,138,4,0.25)]',
      valueColor: 'text-[#fef08a]',
      iconBg: 'bg-[#52290d] text-[#fef08a] border-[#eab308]',
    },
    emerald: {
      border: 'border-[#15803d]',
      glow: 'shadow-[0_4px_12px_rgba(22,163,74,0.25)]',
      valueColor: 'text-emerald-300',
      iconBg: 'bg-[#0f3d1e] text-emerald-400 border-emerald-500',
    },
    crimson: {
      border: 'border-[#991b1b]',
      glow: 'shadow-[0_4px_12px_rgba(239,68,68,0.25)]',
      valueColor: 'text-red-300',
      iconBg: 'bg-[#450a0a] text-red-400 border-red-600',
    },
    amber: {
      border: 'border-[#d97706]',
      glow: 'shadow-[0_4px_12px_rgba(245,158,11,0.25)]',
      valueColor: 'text-amber-300',
      iconBg: 'bg-[#451a03] text-amber-300 border-amber-600',
    },
    slate: {
      border: 'border-[#5c2a0d]',
      glow: 'shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
      valueColor: 'text-stone-200',
      iconBg: 'bg-[#291307] text-stone-300 border-stone-600',
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
        'relative rounded-xl bg-gradient-to-b from-[#311608] via-[#241005] to-[#1c0c04] border-2 p-4 transition-all duration-200 select-none overflow-hidden',
        variantStyles.border,
        variantStyles.glow,
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110 active:translate-y-0' : ''
      )}
    >
      {/* Corner Rivet Details */}
      <div className="corner-bolt top-2 left-2 !w-2 !h-2" />
      <div className="corner-bolt top-2 right-2 !w-2 !h-2" />
      <div className="corner-bolt bottom-2 left-2 !w-2 !h-2" />
      <div className="corner-bolt bottom-2 right-2 !w-2 !h-2" />

      <div className="flex items-start justify-between gap-2 mb-1.5 pl-1">
        <span className="font-bold text-xs uppercase tracking-wider text-stone-300 truncate font-sans">
          {title}
        </span>
        <div className={clsx('p-2 rounded-lg border-2 shrink-0 shadow-sm', variantStyles.iconBg)}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2 pl-1">
        <div className={clsx('font-kingshot text-3xl sm:text-4xl tracking-tight leading-none', variantStyles.valueColor)}>
          {value}
        </div>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-700 border border-red-500 text-white font-bold uppercase font-sans">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-stone-400 font-sans truncate pl-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
