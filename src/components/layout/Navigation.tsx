import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { sounds } from '../../utils/sound';
import {
  LayoutDashboard,
  Users,
  Swords,
  ClipboardCheck,
  Trophy,
  AlertTriangle,
  Award,
  User,
  Settings,
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, stats, inactiveInsights } = useCRM();
  const { isMainAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'members',
      label: 'Roster',
      icon: <Users className="w-4 h-4" />,
      badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes}` : null,
    },
    { id: 'events', label: 'Wars', icon: <Swords className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    {
      id: 'activity',
      label: 'Activity',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Treasury', icon: <Award className="w-4 h-4" /> }] : []),
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    ...(isMainAdmin ? [{ id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="lg:hidden bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-2 py-2 overflow-x-auto scrollbar-none sticky top-16 z-30">
      <div className="flex items-center gap-1.5 min-w-max px-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(item.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none relative ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/80'
              }`}
            >
              <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-semibold shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
