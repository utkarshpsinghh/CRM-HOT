import React from 'react';
import { Swords, Trophy, Users, Zap, Settings } from 'lucide-react';
import { sounds } from '../../../utils/sound';

export type AndroidTab = 'warroom' | 'leaderboard' | 'roster' | 'ops' | 'settings';

interface AndroidBottomNavProps {
  currentTab: AndroidTab;
  onTabChange: (tab: AndroidTab) => void;
  isMainAdmin: boolean;
  upcomingEventCount?: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  currentTab,
  onTabChange,
  isMainAdmin,
  upcomingEventCount = 0,
}) => {
  const tabs = [
    {
      id: 'warroom' as AndroidTab,
      label: 'War Room',
      icon: Swords,
      badge: upcomingEventCount > 0 ? upcomingEventCount : undefined,
    },
    {
      id: 'leaderboard' as AndroidTab,
      label: 'Rankings',
      icon: Trophy,
    },
    {
      id: 'roster' as AndroidTab,
      label: 'Roster',
      icon: Users,
    },
    {
      id: 'ops' as AndroidTab,
      label: 'Officer Ops',
      icon: Zap,
    },
    {
      id: 'settings' as AndroidTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  const handleSelect = (tab: AndroidTab) => {
    sounds.playClick();
    onTabChange(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 pb-safe pt-1.5 shadow-2xl select-none">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer min-w-[56px] ${
                isActive
                  ? 'text-amber-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {/* Active pill background indicator */}
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-sm shadow-amber-500/50" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.4px] text-amber-400' : 'stroke-[1.8px]'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full border border-slate-950 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'text-amber-300 font-bold' : 'text-slate-400 font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
