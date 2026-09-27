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

  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed game-btn relative font-fantasy rounded-md shadow-md';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 border',
    md: 'text-sm px-4 py-2 gap-2 border-[1.5px]',
    lg: 'text-base px-6 py-3 gap-2.5 border-2 shadow-lg',
  };

  const variantStyles = {
    gold: `
      bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#a16207]
      text-[#1e1503] border-[#fef08a]
      hover:from-[#fef9c3] hover:to-[#b45309] hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]
      active:border-[#ca8a04] shadow-[0_3px_0_#713f12]
    `,
    crimson: `
      bg-gradient-to-b from-[#ef4444] via-[#b91c1c] to-[#7f1d1d]
      text-[#fef2f2] border-[#f87171]
      hover:from-[#f87171] hover:to-[#991b1b] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]
      active:border-[#b91c1c] shadow-[0_3px_0_#450a0a]
    `,
    emerald: `
      bg-gradient-to-b from-[#22c55e] via-[#15803d] to-[#14532d]
      text-[#f0fdf4] border-[#86efac]
      hover:from-[#4ade80] hover:to-[#166534] hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]
      active:border-[#15803d] shadow-[0_3px_0_#052e16]
    `,
    slate: `
      bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0f172a]
      text-[#f1f5f9] border-[#64748b]
      hover:from-[#475569] hover:to-[#1e293b] hover:shadow-[0_0_15px_rgba(148,163,184,0.3)]
      active:border-[#475569] shadow-[0_3px_0_#020617]
    `,
    parchment: `
      bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#d97706]
      text-[#451a03] border-[#fef08a]
      hover:brightness-105 active:shadow-none shadow-[0_3px_0_#92400e]
    `,
    outline: `
      bg-transparent text-[#eab308] border-[#eab308]/60
      hover:bg-[#eab308]/15 hover:border-[#eab308]
      active:bg-[#eab308]/25
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
