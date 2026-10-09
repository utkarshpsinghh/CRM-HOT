import React from 'react';
import { Swords, Trophy, Users, Zap, ShieldAlert, Sliders } from 'lucide-react';
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
      label: 'System',
      icon: Sliders,
    },
  ];

  const handleSelect = (tab: AndroidTab) => {
    sounds.playClick();
    onTabChange(tab);
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 px-3 pointer-events-none select-none">
      <nav className="pointer-events-auto max-w-md mx-auto p-1.5 rounded-3xl bg-[#060913]/92 backdrop-blur-2xl border border-rose-500/25 shadow-[0_12px_40px_-5px_rgba(225,29,72,0.35)] flex items-center justify-between">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl transition-all duration-300 cursor-pointer flex-1 ${
                isActive
                  ? 'bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/40 scale-105'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4.5 h-4.5 transition-transform ${
                    isActive ? 'stroke-[2.5px] text-white scale-110' : 'stroke-[1.8px] text-slate-400'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-cyan-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-[#060913] animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight font-mono uppercase ${isActive ? 'text-white font-black tracking-wider' : 'text-slate-400 font-semibold'}`}>
                {tab.label}
              </span>

              {/* Glowing Cyber Dot for active state */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

