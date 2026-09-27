import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Volume2, VolumeX, LogOut, Castle, RefreshCw, PlusCircle, Database, Swords } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface HeaderProps {
  onOpenCreateEvent?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCreateEvent }) => {
  const { admin, logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    syncStatus,
    settings,
    updateSettings,
    refreshData,
    isLoading,
    inactiveInsights,
    stats,
  } = useCRM();

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playClick();
  };

  const navLinks = [
    { id: 'dashboard', label: 'Home' },
    { id: 'members', label: 'Members', badge: stats.membersWithStrikes > 0 ? `${stats.membersWithStrikes}` : null },
    { id: 'events', label: 'Events' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'activity', label: 'Activity', badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#351b0b] border-b-2 border-[#542d13] shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left: Golden Castle Rook + Brand Name (Matches screenshot's K1391 logo) */}
        <div
          onClick={() => {
            sounds.playClick();
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          {/* Golden Rook / Tower Icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-b from-[#78350f] to-[#451a03] border-2 border-[#fbbf24] flex items-center justify-center text-[#fef08a] shadow-[0_2px_6px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform">
            <Castle className="w-6 h-6 text-[#fbbf24]" />
          </div>

          <div>
            <div className="font-kingshot text-lg sm:text-2xl text-[#fffbeb] tracking-wide leading-none group-hover:text-[#fde047] transition-colors">
              HOT
            </div>
            <div className="text-[10px] sm:text-[11px] font-sans font-bold tracking-widest text-[#d97706] uppercase mt-0.5">
              KINGSHOT ALLIANCE
            </div>
          </div>
        </div>

        {/* Center: Top Navigation Links (Matches screenshot's top horizontal menu) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map(link => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(link.id);
                }}
                className={`relative py-2 text-sm lg:text-base font-bold transition-colors cursor-pointer select-none flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#ffffff] font-extrabold'
                    : 'text-[#fef3c7]/80 hover:text-[#ffffff]'
                }`}
              >
                <span>{link.label}</span>

                {link.badge && (
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold">
                    {link.badge}
                  </span>
                )}

                {/* Golden horizontal active line (Matches screenshot) */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: "APPLY TO JOIN" style button & Officer tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Summon Event Button (Matches orange rectangular button in reference) */}
          <button
            onClick={() => {
              sounds.playClick();
              if (onOpenCreateEvent) onOpenCreateEvent();
              else setActiveTab('events');
            }}
            className="btn-kingshot-orange px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Swords className="w-4 h-4 text-[#fef08a]" />
            <span className="hidden sm:inline">Summon War</span>
            <span className="sm:hidden">War</span>
          </button>

          {/* Sync Status Pill */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
              syncStatus === 'connected'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-[#291307] text-[#fbbf24] border-[#78350f]'
            }`}
            title="Google Sheets Sync Status"
          >
            <Database className="w-3 h-3 text-[#fbbf24]" />
            <span>{syncStatus === 'connected' ? 'Sheets Live' : 'Demo Mode'}</span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-[#271205] border border-[#5c2a0d] text-[#fef3c7] hover:text-[#fbbf24] transition-colors cursor-pointer"
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
            className="p-2 rounded-lg bg-[#271205] border border-[#5c2a0d] text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
