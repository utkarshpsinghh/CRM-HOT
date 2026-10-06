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
      label: 'Good',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      style: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60',
    },
    Warning: {
      label: 'Warning',
      icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
      style: 'bg-amber-950/60 text-amber-300 border-amber-600/60',
    },
    Poor: {
      label: 'Poor',
      icon: <XCircle className="w-3 h-3 text-red-400" />,
      style: 'bg-red-950/60 text-red-300 border-red-700/60',
    },
    Unreachable: {
      label: 'Unreachable',
      icon: <XCircle className="w-3 h-3 text-rose-500" />,
      style: 'bg-rose-950/70 text-rose-300 border-rose-800/70',
    },
    Unknown: {
      label: 'Unknown',
      icon: <HelpCircle className="w-3 h-3 text-stone-400" />,
      style: 'bg-stone-900/60 text-stone-400 border-stone-700/60',
    },
  }[status] || {
    label: status,
    icon: <HelpCircle className="w-3 h-3 text-stone-400" />,
    style: 'bg-stone-900 text-stone-400 border-stone-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold select-none shrink-0',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
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
      label: 'Active',
      style: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/70 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
      dot: 'bg-emerald-400',
    },
    'Needs Attention': {
      label: 'Needs Attention',
      style: 'bg-amber-950/70 text-amber-300 border-amber-500/70 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
      dot: 'bg-amber-400 animate-pulse',
    },
    Inactive: {
      label: 'Inactive',
      style: 'bg-red-950/70 text-red-300 border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
      dot: 'bg-red-500',
    },
    Visitor: {
      label: 'Visitor',
      style: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/70 shadow-[0_0_8px_rgba(6,182,212,0.25)]',
      dot: 'bg-cyan-400',
    },
    Archived: {
      label: 'Archived',
      style: 'bg-stone-900/80 text-stone-400 border-stone-700',
      dot: 'bg-stone-500',
    },
  }[status] || {
    label: status,
    style: 'bg-stone-900 text-stone-300 border-stone-600',
    dot: 'bg-stone-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold select-none shrink-0',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
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
      label: 'YES',
      icon: <Check className="w-3 h-3" />,
      style: 'bg-emerald-900/40 text-emerald-300 border-emerald-600/60',
    },
    NO: {
      label: 'NO',
      icon: <X className="w-3 h-3" />,
      style: 'bg-red-900/40 text-red-300 border-red-600/60',
    },
    'NO RESPONSE': {
      label: 'NO VOTE',
      icon: <Minus className="w-3 h-3 text-stone-500" />,
      style: 'bg-stone-900/40 text-stone-400 border-stone-700/50',
    },
  }[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border font-bold uppercase select-none shrink-0',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
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
      label: 'JOINED',
      icon: <Check className="w-3 h-3" />,
      style: 'bg-emerald-900/50 text-emerald-200 border-emerald-500/70 font-semibold shadow-[0_0_6px_rgba(16,185,129,0.3)]',
    },
    DIDNT_JOIN: {
      label: "DIDN'T JOIN",
      icon: <X className="w-3 h-3" />,
      style: 'bg-red-950/70 text-red-200 border-red-600/70 font-semibold shadow-[0_0_6px_rgba(239,68,68,0.3)]',
    },
    NOT_APPLICABLE: {
      label: 'ABSENT',
      icon: <Minus className="w-3 h-3" />,
      style: 'bg-stone-900/40 text-stone-400 border-stone-700/50',
    },
  }[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border uppercase select-none shrink-0 font-fantasy tracking-wider',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
