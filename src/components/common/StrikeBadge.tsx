import React from 'react';
import { clsx } from 'clsx';
import { Flame, Skull } from 'lucide-react';

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
          'inline-flex items-center gap-1 rounded font-mono text-stone-500 bg-stone-900/40 border border-stone-800/80 px-2 py-0.5 text-xs',
          onClick && 'cursor-pointer hover:border-stone-600'
        )}
        title="Zero strikes"
      >
        <span>0</span>
        <span className="text-[10px] uppercase font-sans">Strikes</span>
      </span>
    );
  }

  const isCritical = count >= 2;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center font-fantasy rounded border font-bold uppercase transition-all shrink-0',
        sizeClasses,
        isCritical
          ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-red-200 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
          : 'bg-gradient-to-r from-amber-950 to-red-950 text-amber-200 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
        onClick && 'cursor-pointer hover:scale-105 active:scale-95'
      )}
      title={`${count} Alliance Strike(s)`}
    >
      {isCritical ? (
        <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
      ) : (
        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      )}
      <span>{count}</span>
      <span className="text-[10px] font-sans font-normal opacity-90">
        {count === 1 ? 'Strike' : 'Strikes'}
      </span>
    </span>
  );
};
