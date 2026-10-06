import React from 'react';
import { clsx } from 'clsx';
import { AllianceRank } from '../../types/crm';
import { Crown, Swords, Shield, Axe, ShieldCheck } from 'lucide-react';

interface RankBadgeProps {
  rank: AllianceRank | 'None';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'md', showLabel = true }) => {
  if (rank === 'None') {
    return <span className="text-xs text-slate-500 font-mono">—</span>;
  }

  const rankConfig = {
    R5: {
      title: 'Leader',
      icon: <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
    R4: {
      title: 'Officer',
      icon: <Swords className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
      classes: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    },
    R3: {
      title: 'Elite',
      icon: <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
      classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    },
    R2: {
      title: 'Warrior',
      icon: <Axe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    R1: {
      title: 'Recruit',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
      classes: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    },
  }[rank];

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 rounded-lg font-bold',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center border tracking-wide shrink-0 select-none transition-colors',
        sizeClasses,
        rankConfig.classes
      )}
      title={`${rank} - ${rankConfig.title}`}
    >
      {rankConfig.icon}
      <span>{rank}</span>
      {showLabel && size !== 'sm' && (
        <span className="opacity-80 text-[10px] font-normal hidden sm:inline">
          {rankConfig.title}
        </span>
      )}
    </span>
  );
};
