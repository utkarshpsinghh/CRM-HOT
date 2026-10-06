import React from 'react';
import { clsx } from 'clsx';
import { Flame, Skull, ShieldCheck } from 'lucide-react';

interface StrikeBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const StrikeBadge: React.FC<StrikeBadgeProps> = ({ count, size = 'md', onClick }) => {
  if (count === 0) {
    return (
      <span
        onClick={onClick}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-xl font-fantasy uppercase text-stone-400 bg-[#1f130b] border-2 border-[#3d2212] px-2.5 py-0.5 text-xs shadow-[0_2px_0_#0f0703]',
          onClick && 'cursor-pointer hover:border-amber-600 active:translate-y-0.5'
        )}
        title="Zero strikes - Clean record"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>0 Strikes</span>
      </span>
    );
  }

  const isCritical = count >= 2;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 rounded-xl',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-xl',
    lg: 'text-sm px-3.5 py-1.5 gap-2 rounded-2xl font-black',
  }[size];

  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center font-fantasy font-black uppercase select-none transition-all shrink-0 tracking-wider',
        sizeClasses,
        isCritical
          ? 'bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white border-2 border-[#fecaca] shadow-[0_3px_0_#7f1d1d] animate-pulse'
          : 'bg-gradient-to-b from-[#fb923c] to-[#ea580c] text-white border-2 border-[#fed7aa] shadow-[0_3px_0_#7c2d12]',
        onClick && 'cursor-pointer hover:scale-105 active:translate-y-0.5 active:shadow-none'
      )}
      title={`${count} Alliance Strike(s)`}
    >
      {isCritical ? (
        <Skull className="w-3.5 h-3.5 text-white shrink-0 drop-shadow" />
      ) : (
        <Flame className="w-3.5 h-3.5 text-yellow-200 shrink-0 drop-shadow" />
      )}
      <span>{count}</span>
      <span className="text-[10px] opacity-90">
        {count === 1 ? 'Strike' : 'Strikes'}
      </span>
    </span>
  );
};
