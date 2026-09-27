import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Volume2, VolumeX, LogOut, Castle, RefreshCw, Swords } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface HeaderProps {
  onOpenCreateEvent?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCreateEvent }) => {
  const { logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    settings,
    updateSettings,
    syncWithGoogleSheets,
    isSyncingSheets,
    inactiveInsights,
    stats,
  } = useCRM();

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playClick();
  };

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'members', label: 'Members', count: stats.totalMembers },
    { id: 'events', label: 'Events' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'activity', label: 'Inactive', badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1c140e] border-b border-[#3d200e] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div
          onClick={() => {
            sounds.playClick();
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-[#b45309] flex items-center justify-center text-[#fffbeb] shadow group-hover:scale-105 transition-transform">
            <Castle className="w-5 h-5 text-[#fffbeb]" />
          </div>
          <div>
            <div className="font-bold text-lg text-[#fffbeb] tracking-tight leading-none group-hover:text-[#f59e0b] transition-colors">
              HOT Alliance
            </div>
            <div className="text-[10px] text-stone-400 font-medium">Kingshot CRM</div>
          </div>
        </div>

        {/* Center: Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navLinks.map(link => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(link.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#331c0d] text-[#fbbf24] shadow-sm'
                    : 'text-stone-300 hover:text-white hover:bg-[#26150a]'
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Create Event */}
          <button
            onClick={() => {
              sounds.playClick();
              if (onOpenCreateEvent) onOpenCreateEvent();
              else setActiveTab('events');
            }}
            className="hidden sm:flex btn-kingshot-gold px-3 py-1.5 text-xs font-bold uppercase items-center gap-1 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>New Event</span>
          </button>

          {/* Sync Sheets Button */}
          <button
            onClick={() => syncWithGoogleSheets()}
            disabled={isSyncingSheets}
            className="p-2 rounded-lg bg-[#29160a] border border-[#42220d] text-amber-300 hover:text-white hover:border-[#b45309] transition-colors cursor-pointer disabled:opacity-50"
            title="Sync with Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-[#29160a] border border-[#42220d] text-stone-300 hover:text-[#fbbf24] transition-colors cursor-pointer"
            title={settings.soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#fbbf24]" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              sounds.playClick();
              logout();
            }}
            className="p-2 rounded-lg bg-[#29160a] border border-[#42220d] text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
