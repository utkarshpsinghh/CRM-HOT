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

  const baseStyles = 'inline-flex items-center justify-center font-black tracking-wide uppercase transition-all duration-100 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed game-btn relative font-fantasy rounded-xl active:translate-y-1 active:shadow-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 border-2',
    md: 'text-sm px-4.5 py-2 gap-2 border-2',
    lg: 'text-base px-6 py-2.5 gap-2.5 border-2',
  };

  const variantStyles = {
    gold: `
      bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#ca8a04]
      text-[#261103] border-[#fef9c3]
      hover:from-[#fffbeb] hover:to-[#d97706]
      shadow-[0_4px_0_#78350f,0_6px_12px_rgba(0,0,0,0.35)]
    `,
    crimson: `
      bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b]
      text-[#ffffff] border-[#fca5a5]
      hover:from-[#fca5a5] hover:to-[#b91c1c]
      shadow-[0_4px_0_#450a0a,0_6px_12px_rgba(0,0,0,0.35)]
    `,
    emerald: `
      bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#15803d]
      text-[#ffffff] border-[#86efac]
      hover:from-[#86efac] hover:to-[#166534]
      shadow-[0_4px_0_#052e16,0_6px_12px_rgba(0,0,0,0.35)]
    `,
    slate: `
      bg-gradient-to-b from-[#475569] via-[#334155] to-[#1e293b]
      text-[#f8fafc] border-[#94a3b8]
      hover:from-[#64748b] hover:to-[#0f172a]
      shadow-[0_4px_0_#0f172a,0_6px_12px_rgba(0,0,0,0.35)]
    `,
    parchment: `
      bg-gradient-to-b from-[#fef9c3] via-[#fde047] to-[#eab308]
      text-[#451a03] border-[#fef08a]
      hover:brightness-105
      shadow-[0_4px_0_#854d0e,0_6px_12px_rgba(0,0,0,0.3)]
    `,
    outline: `
      bg-[#241710] text-[#facc15] border-[#ca8a04]
      hover:bg-[#332014] hover:border-[#facc15]
      shadow-[0_4px_0_#140b06]
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
