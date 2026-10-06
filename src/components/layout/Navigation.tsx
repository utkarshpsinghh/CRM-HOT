import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { sounds } from '../../utils/sound';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, stats, inactiveInsights } = useCRM();
  const { isMainAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Headquarters', icon: '🏰' },
    { id: 'members', label: 'Roster', icon: '👥', badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes}` : null },
    { id: 'events', label: 'War Room', icon: '⚔️' },
    { id: 'attendance', label: 'War Ledger', icon: '📋' },
    { id: 'leaderboard', label: 'Hall of Fame', icon: '🏆' },
    { id: 'activity', label: 'Slacker Watch', icon: '⚠️', badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Treasury', icon: '🎖️' }] : []),
    { id: 'profile', label: 'Officer Profile', icon: '👤' },
    ...(isMainAdmin ? [{ id: 'settings', label: 'Alliance Vault', icon: '⚙️' }] : []),
  ];

  return (
    <div className="lg:hidden bg-[#120a05] border-b-[3px] border-[#381c0c] px-2 py-2 overflow-x-auto scrollbar-none sticky top-16 z-30 shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 min-w-max px-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(item.id);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-fantasy font-black uppercase transition-all cursor-pointer select-none relative ${
                isActive
                  ? 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] text-[#291304] border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] transform -translate-y-0.5'
                  : 'text-stone-300 hover:text-white bg-[#1c1109] border-2 border-[#3d2210] shadow-[0_2px_0_#0f0703] active:translate-y-0.5 active:shadow-none'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black shadow-sm">
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
