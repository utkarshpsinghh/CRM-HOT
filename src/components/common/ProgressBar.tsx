import React from 'react';
import { clsx } from 'clsx';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  subLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'gold' | 'emerald' | 'crimson' | 'blue';
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  subLabel,
  size = 'md',
  color = 'gold',
  showPercentage = true,
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3.5',
    lg: 'h-5',
  }[size];

  const colorGradients = {
    gold: 'bg-gradient-to-r from-[#ca8a04] via-[#eab308] to-[#fef08a] shadow-[0_0_10px_rgba(234,179,8,0.5)]',
    emerald: 'bg-gradient-to-r from-[#15803d] via-[#22c55e] to-[#86efac] shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    crimson: 'bg-gradient-to-r from-[#991b1b] via-[#ef4444] to-[#fca5a5] shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    blue: 'bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#93c5fd] shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  }[color];

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <div className="flex items-center gap-2">
            {label && <span className="text-[#f4ecd8] font-fantasy">{label}</span>}
            {subLabel && <span className="text-stone-400 text-[11px] font-sans">({subLabel})</span>}
          </div>
          {showPercentage && (
            <span className="font-mono font-bold text-[#fef08a]">{clamped}%</span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-[#0a0d14] rounded-full overflow-hidden border border-[#524126]/80 p-0.5',
          heightClasses
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorGradients
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
