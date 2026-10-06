import React from 'react';
import { clsx } from 'clsx';
import { CommunicationStatus, MemberActivityStatus, VoteStatus, AttendanceStatus } from '../../types/crm';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Check, X, Minus, Clock, ShieldAlert } from 'lucide-react';

interface CommunicationBadgeProps {
  status: CommunicationStatus;
  size?: 'sm' | 'md';
}

export const CommunicationBadge: React.FC<CommunicationBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    Good: {
      label: 'Good Comms',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    Warning: {
      label: 'Warning',
      icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
      style: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
    Poor: {
      label: 'Poor Comms',
      icon: <XCircle className="w-3 h-3 text-red-400" />,
      style: 'bg-red-500/10 text-red-300 border-red-500/30',
    },
    Unreachable: {
      label: 'Unreachable',
      icon: <XCircle className="w-3 h-3 text-rose-400" />,
      style: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    },
    Unknown: {
      label: 'Unknown',
      icon: <HelpCircle className="w-3 h-3 text-slate-400" />,
      style: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    },
  }[status] || {
    label: status,
    icon: <HelpCircle className="w-3 h-3 text-slate-400" />,
    style: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border font-medium select-none shrink-0',
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
      label: 'Active',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    Visitor: {
      label: 'Visitor',
      icon: <HelpCircle className="w-3 h-3 text-sky-400" />,
      style: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    },
    Inactive: {
      label: 'Inactive',
      icon: <Clock className="w-3 h-3 text-amber-400" />,
      style: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
    'Needs Attention': {
      label: 'Needs Attention',
      icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
      style: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
    Archived: {
      label: 'Archived',
      icon: <Minus className="w-3 h-3 text-slate-400" />,
      style: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    },
  }[status] || {
    label: status,
    icon: <HelpCircle className="w-3 h-3 text-slate-400" />,
    style: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border font-medium select-none shrink-0',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      {config.icon}
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
      icon: <Check className="w-3 h-3 text-emerald-400" />,
      style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    NO: {
      label: 'NO',
      icon: <X className="w-3 h-3 text-red-400" />,
      style: 'bg-red-500/10 text-red-300 border-red-500/30',
    },
    'NO RESPONSE': {
      label: 'NO VOTE',
      icon: <Minus className="w-3 h-3 text-slate-400" />,
      style: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    },
  }[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border font-semibold select-none shrink-0',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  size?: 'sm' | 'md';
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    JOINED: {
      label: 'Joined',
      icon: <Check className="w-3.5 h-3.5 text-emerald-400" />,
      style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    DIDNT_JOIN: {
      label: 'Missed',
      icon: <X className="w-3.5 h-3.5 text-red-400" />,
      style: 'bg-red-500/10 text-red-300 border-red-500/30',
    },
    NOT_APPLICABLE: {
      label: 'N/A',
      icon: <Minus className="w-3.5 h-3.5 text-slate-500" />,
      style: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    },
  }[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border font-semibold select-none shrink-0',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.style
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

export const AttendanceBadge = AttendanceStatusBadge;
