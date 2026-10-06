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
    return <span className="text-xs text-stone-500 font-mono">—</span>;
  }

  const rankConfig = {
    R5: {
      title: 'R5 Leader',
      icon: <Crown className="w-3.5 h-3.5 text-black drop-shadow" />,
      classes: 'badge-rank-r5 font-black',
    },
    R4: {
      title: 'R4 Officer',
      icon: <Swords className="w-3.5 h-3.5 text-purple-950 drop-shadow" />,
      classes: 'badge-rank-r4 font-black',
    },
    R3: {
      title: 'R3 Elite',
      icon: <Shield className="w-3.5 h-3.5 text-sky-950 drop-shadow" />,
      classes: 'badge-rank-r3 font-black',
    },
    R2: {
      title: 'R2 Warrior',
      icon: <Axe className="w-3.5 h-3.5 text-emerald-950 drop-shadow" />,
      classes: 'badge-rank-r2 font-black',
    },
    R1: {
      title: 'R1 Recruit',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-stone-900 drop-shadow" />,
      classes: 'badge-rank-r1 font-black',
    },
  }[rank];

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 rounded-lg',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-xl',
    lg: 'text-sm px-3.5 py-1.5 gap-2 rounded-xl text-shadow',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-fantasy uppercase tracking-wider shrink-0 select-none shadow-sm transition-transform hover:scale-105',
        sizeClasses,
        rankConfig.classes
      )}
      title={`${rank} - ${rankConfig.title}`}
    >
      <span className="shrink-0">{rankConfig.icon}</span>
      <span>{rank}</span>
      {showLabel && size === 'lg' && (
        <span className="text-[10px] opacity-90 tracking-normal ml-0.5">
          {rankConfig.title.split(' ')[1]}
        </span>
      )}
    </span>
  );
};
