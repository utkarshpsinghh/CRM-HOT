import React from 'react';
import { clsx } from 'clsx';
import { CommunicationStatus, MemberActivityStatus, VoteStatus, AttendanceStatus } from '../../types/crm';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Check, X, Minus } from 'lucide-react';

interface CommunicationBadgeProps {
  status: CommunicationStatus;
  size?: 'sm' | 'md';
}

export const CommunicationBadge: React.FC<CommunicationBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    Good: {
      label: 'Good Comms',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-300" />,
      style: 'bg-emerald-950 text-emerald-300 border-2 border-emerald-600 shadow-[0_2px_0_#064e3b]',
    },
    Warning: {
      label: 'Warning',
      icon: <AlertTriangle className="w-3 h-3 text-amber-300" />,
      style: 'bg-amber-950 text-amber-300 border-2 border-amber-600 shadow-[0_2px_0_#78350f]',
    },
    Poor: {
      label: 'Poor Comms',
      icon: <XCircle className="w-3 h-3 text-red-300" />,
      style: 'bg-red-950 text-red-300 border-2 border-red-600 shadow-[0_2px_0_#450a0a]',
    },
    Unreachable: {
      label: 'Unreachable',
      icon: <XCircle className="w-3 h-3 text-rose-300" />,
      style: 'bg-rose-950 text-rose-300 border-2 border-rose-700 shadow-[0_2px_0_#4c0519]',
    },
    Unknown: {
      label: 'Unknown',
      icon: <HelpCircle className="w-3 h-3 text-stone-300" />,
      style: 'bg-stone-900 text-stone-300 border-2 border-stone-600 shadow-[0_2px_0_#1c1917]',
    },
  }[status] || {
    label: status,
    icon: <HelpCircle className="w-3 h-3 text-stone-300" />,
    style: 'bg-stone-900 text-stone-300 border-2 border-stone-600 shadow-[0_2px_0_#1c1917]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-fantasy uppercase tracking-wider select-none shrink-0',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface ActivityBadgeProps {
  status: MemberActivityStatus;
  size?: 'sm' | 'md';
}

export const ActivityBadge: React.FC<ActivityBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    Active: {
      label: 'Active Warrior',
      style: 'bg-emerald-950 text-emerald-300 border-2 border-emerald-500 shadow-[0_2px_0_#064e3b]',
      dot: 'bg-emerald-400',
    },
    'Needs Attention': {
      label: 'Needs Attention',
      style: 'bg-amber-950 text-amber-300 border-2 border-amber-500 shadow-[0_2px_0_#78350f]',
      dot: 'bg-amber-400 animate-pulse',
    },
    Inactive: {
      label: 'Slacker',
      style: 'bg-red-950 text-red-300 border-2 border-red-500 shadow-[0_2px_0_#450a0a]',
      dot: 'bg-red-400',
    },
    Visitor: {
      label: 'Guest',
      style: 'bg-cyan-950 text-cyan-300 border-2 border-cyan-500 shadow-[0_2px_0_#083344]',
      dot: 'bg-cyan-400',
    },
    Archived: {
      label: 'Archived',
      style: 'bg-stone-900 text-stone-400 border-2 border-stone-700 shadow-[0_2px_0_#1c1917]',
      dot: 'bg-stone-500',
    },
  }[status] || {
    label: status,
    style: 'bg-stone-900 text-stone-300 border-2 border-stone-600 shadow-[0_2px_0_#1c1917]',
    dot: 'bg-stone-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-fantasy uppercase tracking-wider select-none shrink-0',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full shadow-sm', config.dot)} />
      <span>{config.label}</span>
    </span>
  );
};

interface VoteBadgeProps {
  status: VoteStatus;
  size?: 'sm' | 'md';
}

export const VoteBadge: React.FC<VoteBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    YES: {
      label: 'VOTED YES',
      icon: <Check className="w-3 h-3 text-black stroke-[3]" />,
      style: 'bg-gradient-to-b from-[#86efac] to-[#22c55e] text-black border-2 border-[#bbf7d0] shadow-[0_2px_0_#15803d]',
    },
    NO: {
      label: 'VOTED NO',
      icon: <X className="w-3 h-3 text-white stroke-[3]" />,
      style: 'bg-gradient-to-b from-[#fca5a5] to-[#ef4444] text-white border-2 border-[#fecaca] shadow-[0_2px_0_#991b1b]',
    },
    'NO RESPONSE': {
      label: 'NO VOTE',
      icon: <Minus className="w-3 h-3 text-stone-300 stroke-[3]" />,
      style: 'bg-[#29170c] text-stone-400 border-2 border-[#452714] shadow-[0_2px_0_#140b05]',
    },
  }[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl font-fantasy font-black uppercase select-none shrink-0 tracking-wider',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface AttendanceBadgeProps {
  status: AttendanceStatus;
  size?: 'sm' | 'md';
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    JOINED: {
      label: 'JOINED WAR',
      icon: <Check className="w-3.5 h-3.5 text-black stroke-[3]" />,
      style: 'bg-gradient-to-b from-[#86efac] to-[#16a34a] text-black border-2 border-[#bbf7d0] shadow-[0_3px_0_#052e16]',
    },
    DIDNT_JOIN: {
      label: 'MISSED WAR',
      icon: <X className="w-3.5 h-3.5 text-white stroke-[3]" />,
      style: 'bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white border-2 border-[#fecaca] shadow-[0_3px_0_#450a0a]',
    },
    NOT_APPLICABLE: {
      label: 'NO PARTICIPATION',
      icon: <Minus className="w-3.5 h-3.5 text-stone-300 stroke-[3]" />,
      style: 'bg-[#24150b] text-stone-400 border-2 border-[#472511] shadow-[0_2px_0_#120803]',
    },
  }[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl uppercase select-none shrink-0 font-fantasy font-black tracking-wider',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1',
        config.style
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
