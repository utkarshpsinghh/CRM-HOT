import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, Swords, BarChart3, AlertTriangle, Settings, Award, User } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, stats, inactiveInsights } = useCRM();
  const { isMainAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-3.5 h-3.5" />, badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes}` : null },
    { id: 'events', label: 'Events', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'attendance', label: 'Attendance', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'activity', label: 'Inactive', icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Contributions', icon: <Award className="w-3.5 h-3.5" /> }] : []),
    { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
    ...(isMainAdmin ? [{ id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <div className="md:hidden bg-[#1a120b] border-b border-[#3e2716] px-2 py-1.5 overflow-x-auto scrollbar-none sticky top-16 z-30 shadow-md">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'btn-kingshot-gold text-[#1a120b] font-black shadow-sm'
                  : 'text-stone-300 hover:text-white bg-[#120c08] border border-[#2c1d15]'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black">
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
