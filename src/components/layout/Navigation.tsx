import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Shield, Users, Swords, BarChart3, AlertTriangle, Settings } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, stats, inactiveInsights } = useCRM();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <Shield className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" />, badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes}` : null },
    { id: 'events', label: 'Events', icon: <Swords className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <AlertTriangle className="w-4 h-4" />, badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="md:hidden bg-[#2d1608] border-b border-[#52290d] px-2 py-1.5 overflow-x-auto scrollbar-none sticky top-16 z-30 shadow-md">
      <div className="flex items-center gap-1 min-w-max">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(item.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'btn-kingshot-gold text-[#381a07] font-black'
                  : 'text-[#fef3c7]/80 hover:bg-[#3d1e0c]'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold">
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
