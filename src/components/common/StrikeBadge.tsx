import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, Flame, ShieldCheck } from 'lucide-react';

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
          'inline-flex items-center gap-1 rounded-md text-slate-400 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 text-xs font-medium',
          onClick && 'cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-colors'
        )}
        title="Zero strikes - Clean record"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>0</span>
      </span>
    );
  }

  const isCritical = count >= 2;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 rounded-md font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-md font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 rounded-lg font-bold',
  }[size];

  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center border select-none transition-all shrink-0',
        sizeClasses,
        isCritical
          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          : 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        onClick && 'cursor-pointer hover:scale-105 active:scale-95'
      )}
      title={`${count} Alliance Strike(s)`}
    >
      {isCritical ? (
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      ) : (
        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      )}
      <span>{count}</span>
      <span className="opacity-80 text-[10px] font-normal">
        {count === 1 ? 'Strike' : 'Strikes'}
      </span>
    </span>
  );
};
