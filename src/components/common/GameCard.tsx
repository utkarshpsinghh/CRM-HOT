import React from 'react';
import { clsx } from 'clsx';

interface GameCardProps {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'stone' | 'gold' | 'parchment' | 'crimson';
  noPadding?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  variant = 'stone',
  noPadding = false,
}) => {
  const variantStyles = {
    stone: 'bg-gradient-to-b from-[#1c202d] to-[#121520] border-[#524126] shadow-[0_8px_30px_rgba(0,0,0,0.65)]',
    gold: 'bg-gradient-to-b from-[#242938] to-[#161a26] border-[#ca8a04] shadow-[0_0_20px_rgba(202,138,4,0.2)]',
    parchment: 'bg-gradient-to-b from-[#2b2216] to-[#1b150c] border-[#8d6930] shadow-[0_8px_30px_rgba(0,0,0,0.7)]',
    crimson: 'bg-gradient-to-b from-[#2a1315] to-[#170a0b] border-[#991b1b] shadow-[0_0_20px_rgba(153,27,27,0.25)]',
  };

  return (
    <div
      className={clsx(
        'rounded-lg border-[1.5px] relative overflow-hidden transition-all duration-200',
        variantStyles[variant],
        className
      )}
    >
      {/* Golden Corner Accents */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#eab308]/70 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#eab308]/70 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#eab308]/70 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#eab308]/70 pointer-events-none" />

      {/* Card Header if title or icon provided */}
      {(title || icon || action) && (
        <div className="px-4 py-3 border-b border-[#453820] bg-black/35 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="text-[#eab308] shrink-0 text-lg">{icon}</div>}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h3 className="font-fantasy font-bold text-sm sm:text-base text-[#fef08a] tracking-wide truncate">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && <p className="text-xs text-[#a8a29e] truncate">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Card Body */}
      <div className={clsx(!noPadding && 'p-4')}>{children}</div>
    </div>
  );
};
