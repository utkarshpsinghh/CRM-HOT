import React from 'react';
import { clsx } from 'clsx';
import { sounds } from '../../utils/sound';

export interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'crimson' | 'emerald' | 'slate' | 'outline' | 'parchment';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  soundType?: 'click' | 'strike' | 'success' | 'alert' | 'none';
}

export const GameButton: React.FC<GameButtonProps> = ({
  children,
  variant = 'gold',
  size = 'md',
  icon,
  className,
  onClick,
  soundType = 'click',
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      if (soundType === 'click') sounds.playClick();
      else if (soundType === 'strike') sounds.playStrike();
      else if (soundType === 'success') sounds.playSuccess();
      else if (soundType === 'alert') sounds.playAlert();
    }
    onClick?.(e);
  };

  const baseStyles = 'inline-flex items-center justify-center font-semibold tracking-normal transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    gold: `
      bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold
      border border-amber-400/40 hover:from-amber-400 hover:to-amber-500
      shadow-md shadow-amber-500/20
    `,
    crimson: `
      bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold
      border border-rose-500/40 hover:from-rose-500 hover:to-rose-600
      shadow-md shadow-rose-600/20
    `,
    emerald: `
      bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold
      border border-emerald-500/40 hover:from-emerald-500 hover:to-emerald-600
      shadow-md shadow-emerald-600/20
    `,
    slate: `
      bg-slate-800 border border-slate-700 text-slate-200
      hover:bg-slate-700 hover:text-white hover:border-slate-600
    `,
    parchment: `
      bg-amber-500/15 border border-amber-500/30 text-amber-300
      hover:bg-amber-500/25
    `,
    outline: `
      bg-slate-900 border border-slate-800 text-slate-300
      hover:border-amber-500/50 hover:text-amber-300
    `,
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
