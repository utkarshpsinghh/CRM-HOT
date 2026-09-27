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
      icon: <Crown className="w-3.5 h-3.5" />,
      color: 'bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-[#fef08a] border-[#eab308] shadow-[0_0_10px_rgba(234,179,8,0.5)]',
      dot: 'bg-[#eab308]',
    },
    R4: {
      title: 'R4 Officer',
      icon: <Swords className="w-3.5 h-3.5" />,
      color: 'bg-gradient-to-r from-[#854d0e] to-[#713f12] text-[#fef3c7] border-[#ca8a04]',
      dot: 'bg-[#facc15]',
    },
    R3: {
      title: 'R3 Elite',
      icon: <Shield className="w-3.5 h-3.5" />,
      color: 'bg-gradient-to-r from-[#334155] to-[#1e293b] text-[#e2e8f0] border-[#94a3b8]',
      dot: 'bg-[#94a3b8]',
    },
    R2: {
      title: 'R2 Warrior',
      icon: <Axe className="w-3.5 h-3.5" />,
      color: 'bg-gradient-to-r from-[#292524] to-[#1c1917] text-[#fed7aa] border-[#78350f]',
      dot: 'bg-[#b45309]',
    },
    R1: {
      title: 'R1 Recruit',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      color: 'bg-gradient-to-r from-[#18181b] to-[#09090b] text-[#d4d4d8] border-[#52525b]',
      dot: 'bg-[#71717a]',
    },
  }[rank];

  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5 gap-1 border',
    md: 'text-xs px-2 py-0.5 gap-1.5 border-[1.5px]',
    lg: 'text-sm px-3 py-1 gap-2 border-2',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-bold font-fantasy tracking-wider rounded uppercase shrink-0',
        sizeClasses,
        rankConfig.color
      )}
      title={`${rank} - ${rankConfig.title}`}
    >
      <span className="shrink-0">{rankConfig.icon}</span>
      <span>{rank}</span>
      {showLabel && size === 'lg' && (
        <span className="text-[10px] font-sans opacity-80 uppercase tracking-normal">
          {rankConfig.title.split(' ')[1]}
        </span>
      )}
    </span>
  );
};
