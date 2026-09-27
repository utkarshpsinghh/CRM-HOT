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
      glow: 'shadow-[0_0_15px_rgba(202,138,4,0.15)]',
      valueColor: 'text-[#fef08a]',
      iconBg: 'bg-[#713f12]/40 text-[#fef08a] border-[#eab308]/60',
    },
    emerald: {
      border: 'border-emerald-700/80',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      valueColor: 'text-emerald-300',
      iconBg: 'bg-emerald-950/60 text-emerald-400 border-emerald-600/60',
    },
    crimson: {
      border: 'border-red-700/80',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
      valueColor: 'text-red-400',
      iconBg: 'bg-red-950/70 text-red-400 border-red-600/70',
    },
    amber: {
      border: 'border-amber-600/80',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      valueColor: 'text-amber-300',
      iconBg: 'bg-amber-950/70 text-amber-300 border-amber-600/70',
    },
    slate: {
      border: 'border-stone-700/80',
      glow: 'shadow-[0_0_15px_rgba(0,0,0,0.4)]',
      valueColor: 'text-stone-200',
      iconBg: 'bg-stone-800/80 text-stone-300 border-stone-600/60',
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
        'relative rounded-xl bg-gradient-to-b from-[#1b1f2e] via-[#141724] to-[#0e101a] border-[1.5px] p-4 sm:p-5 transition-all duration-200 select-none overflow-hidden',
        variantStyles.border,
        variantStyles.glow,
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110 active:translate-y-0' : ''
      )}
    >
      {/* Corner Filigree */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-[#fef08a]/60 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-[#fef08a]/60 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-[#fef08a]/60 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-[#fef08a]/60 pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-fantasy text-xs uppercase tracking-wider text-stone-300 font-bold truncate">
          {title}
        </span>
        <div className={clsx('p-2 rounded-lg border shrink-0', variantStyles.iconBg)}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className={clsx('font-fantasy font-black text-3xl sm:text-4xl tracking-tight', variantStyles.valueColor)}>
          {value}
        </div>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/70 text-amber-300 font-bold uppercase font-fantasy">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-stone-400 font-sans truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};
