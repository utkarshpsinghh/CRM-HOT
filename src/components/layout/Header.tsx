import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Volume2, VolumeX, LogOut, Castle, RefreshCw, Swords, ShieldCheck, Shield, User, Award } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface HeaderProps {
  onOpenCreateEvent?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCreateEvent }) => {
  const { logout, admin, isMainAdmin } = useAuth();
  const {
    activeTab,
    setActiveTab,
    settings,
    updateSettings,
    activeDbProvider,
    refreshData,
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
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'activity', label: 'Inactive', badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Contributions' }] : []),
    ...(isMainAdmin ? [{ id: 'settings', label: 'Settings' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1c140e] border-b border-[#3d200e] shadow-md w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3 w-full min-w-0">
        {/* Left: Brand */}
        <div
          onClick={() => {
            sounds.playClick();
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-2 cursor-pointer select-none group shrink min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#b45309] to-[#78350f] flex items-center justify-center text-[#fffbeb] shadow group-hover:scale-105 transition-transform border border-[#f59e0b]/40 shrink-0">
            <Castle className="w-4 h-4 sm:w-5 sm:h-5 text-[#fffbeb]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-fantasy font-black text-sm sm:text-lg text-[#fffbeb] tracking-wide group-hover:text-[#f59e0b] transition-colors truncate">
                HOT Alliance
              </span>
              {/* Role Badge */}
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border shrink-0 ${
                  isMainAdmin
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                    : 'bg-stone-800/80 text-stone-300 border-stone-600/60'
                }`}
              >
                {isMainAdmin ? 'Main Admin' : 'R4'}
              </span>
            </div>
            <div className="text-[10px] text-stone-400 font-medium truncate">Kingshot CRM</div>
          </div>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(link.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#331c0d] text-[#fbbf24] border border-[#522d14] shadow-sm'
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Create Event (MainAdmin only) */}
          {isMainAdmin && (
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
          )}

          {/* Sync Cloud Database Button */}
          <button
            onClick={() => (activeDbProvider === 'supabase' ? refreshData() : syncWithGoogleSheets())}
            disabled={isSyncingSheets}
            className="p-1.5 sm:p-2 rounded-xl bg-[#29160a] border border-[#42220d] text-amber-300 hover:text-white hover:border-[#b45309] transition-colors cursor-pointer disabled:opacity-50"
            title={activeDbProvider === 'supabase' ? 'Sync with Supabase PostgreSQL' : 'Sync with Google Sheets'}
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncingSheets ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Profile Quick Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('profile');
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-[#331c0d] border-[#fbbf24] text-amber-300'
                : 'bg-[#29160a] border-[#42220d] text-stone-300 hover:text-white hover:border-[#b45309]'
            }`}
            title={`My Profile (${admin?.name || admin?.username})`}
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="hidden lg:inline text-xs font-bold">{admin?.name || admin?.username}</span>
          </button>

          {/* Audio Toggle (Hidden on narrow mobile, available in Settings) */}
          <button
            onClick={toggleSound}
            className="hidden sm:flex p-2 rounded-xl bg-[#29160a] border border-[#42220d] text-stone-300 hover:text-[#fbbf24] transition-colors cursor-pointer"
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
            className="p-1.5 sm:p-2 rounded-xl bg-[#29160a] border border-[#42220d] text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
            title={`Log out (${admin?.username})`}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
