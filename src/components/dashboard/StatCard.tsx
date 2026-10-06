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
      cardBg: 'from-[#2a1a0d] to-[#1a1007]',
      border: 'border-[#ca8a04]',
      bevelColor: '#78350f',
      valueColor: 'text-[#fef08a] gold-text-glow',
      iconBg: 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] text-black border-2 border-[#fef9c3]',
      tagBg: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
    },
    emerald: {
      cardBg: 'from-[#132418] to-[#0c160e]',
      border: 'border-emerald-600',
      bevelColor: '#064e3b',
      valueColor: 'text-emerald-300 game-text-shadow',
      iconBg: 'bg-gradient-to-b from-[#86efac] to-[#16a34a] text-black border-2 border-[#bbf7d0]',
      tagBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
    },
    crimson: {
      cardBg: 'from-[#291010] to-[#170808]',
      border: 'border-red-600',
      bevelColor: '#450a0a',
      valueColor: 'text-red-300 game-text-shadow',
      iconBg: 'bg-gradient-to-b from-[#fca5a5] to-[#dc2626] text-white border-2 border-[#fecaca]',
      tagBg: 'bg-red-950/80 text-red-300 border-red-600/60',
    },
    amber: {
      cardBg: 'from-[#281609] to-[#180c05]',
      border: 'border-amber-600',
      bevelColor: '#7c2d12',
      valueColor: 'text-amber-300 game-text-shadow',
      iconBg: 'bg-gradient-to-b from-[#fed7aa] to-[#ea580c] text-white border-2 border-[#ffedd5]',
      tagBg: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
    },
    slate: {
      cardBg: 'from-[#20150d] to-[#140d07]',
      border: 'border-[#4a2610]',
      bevelColor: '#170c06',
      valueColor: 'text-stone-200 game-text-shadow',
      iconBg: 'bg-[#331c0d] text-amber-300 border-2 border-[#5a3217]',
      tagBg: 'bg-stone-900/80 text-stone-300 border-stone-700',
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
      style={{
        boxShadow: `0 6px 0 ${variantStyles.bevelColor}, 0 12px 24px rgba(0, 0, 0, 0.5)`,
      }}
      className={clsx(
        'rounded-2xl bg-gradient-to-b border-[3px] p-4 transition-all duration-150 select-none relative overflow-hidden group',
        variantStyles.cardBg,
        variantStyles.border,
        onClick ? 'cursor-pointer hover:-translate-y-1 active:translate-y-1 active:shadow-none' : '',
        className
      )}
    >
      {/* Top Header Plate */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-fantasy font-black uppercase text-stone-200 tracking-wider truncate">
          {title}
        </span>
        <div className={clsx('w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-md', variantStyles.iconBg)}>
          {icon}
        </div>
      </div>

      {/* Numeric Loot Counter */}
      <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-baseline justify-between gap-2">
        <div className={clsx('text-2xl sm:text-3xl lg:text-4xl font-fantasy font-black tracking-wide leading-none', variantStyles.valueColor)}>
          {value}
        </div>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-fantasy font-black uppercase shadow-md animate-pulse">
            {badge}
          </span>
        )}
      </div>

      {/* Subtitle / Description */}
      {subtitle && (
        <div className="mt-2 text-[11px] text-stone-300 font-medium truncate flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0" />
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};
