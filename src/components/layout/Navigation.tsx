import React from 'react';
import { clsx } from 'clsx';
import { useCRM } from '../../context/CRMContext';
import { Shield, Users, Swords, BarChart3, AlertTriangle, Settings } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, stats, inactiveInsights } = useCRM();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Shield className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <Users className="w-4 h-4" />,
      badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes} Strikes` : null,
      badgeColor: 'bg-red-950 text-red-300 border-red-700/80',
    },
    {
      id: 'events',
      label: 'Events',
      icon: <Swords className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <BarChart3 className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: inactiveInsights.length > 0 ? String(inactiveInsights.length) : null,
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      badge: null,
    },
  ];

  return (
    <nav className="w-full bg-[#11141f] border-b border-[#453820] shadow-md sticky top-16 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(item.id);
                }}
                className={clsx(
                  'flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-fantasy text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-150 select-none whitespace-nowrap cursor-pointer relative shrink-0',
                  isActive
                    ? 'bg-gradient-to-b from-[#ca8a04] via-[#a16207] to-[#713f12] text-[#fef9c3] border-2 border-[#fef08a] shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-[1.02]'
                    : 'bg-[#181c28]/80 text-[#d6d3d1] border border-[#3b311c] hover:bg-[#22283a] hover:text-[#fef08a] hover:border-[#ca8a04]/50'
                )}
              >
                <span className={clsx(isActive ? 'text-[#fef08a]' : 'text-stone-400')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>

                {item.badge && (
                  <span
                    className={clsx(
                      'text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-full border shadow-sm',
                      item.badgeColor || 'bg-stone-800 text-stone-200 border-stone-600'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
