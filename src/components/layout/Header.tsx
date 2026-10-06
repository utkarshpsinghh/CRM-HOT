import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Volume2, VolumeX, LogOut, Castle, RefreshCw, Swords, Crown, User, Shield, Zap } from 'lucide-react';
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
    isSyncing,
    inactiveInsights,
    stats,
    events,
  } = useCRM();

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playClick();
  };

  const navLinks = [
    { id: 'dashboard', label: 'Headquarters', icon: '🏰' },
    { id: 'members', label: 'Roster', count: stats.totalMembers, icon: '👥' },
    { id: 'events', label: 'War Room', icon: '⚔️' },
    { id: 'attendance', label: 'War Ledger', icon: '📋' },
    { id: 'leaderboard', label: 'Hall of Fame', icon: '🏆' },
    { id: 'activity', label: 'Slacker Watch', badge: inactiveInsights.length > 0 ? `${inactiveInsights.length}` : null, icon: '⚠️' },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Treasury', icon: '🎖️' }] : []),
    ...(isMainAdmin ? [{ id: 'settings', label: 'Vault', icon: '⚙️' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#160f09] border-b-[3px] border-[#42220e] shadow-[0_6px_0_#0a0604,0_10px_20px_rgba(0,0,0,0.5)] w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        
        {/* Left: Alliance Brand Medallion */}
        <div
          onClick={() => {
            sounds.playClick();
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink min-w-0"
        >
          {/* 3D Shield Medallion */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-b from-[#f59e0b] via-[#b45309] to-[#78350f] p-0.5 border-2 border-[#fef08a] shadow-[0_4px_0_#451a03] group-hover:scale-105 group-active:scale-95 transition-all shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#991b1b] to-[#450a0a] flex items-center justify-center">
              <Castle className="w-5 h-5 sm:w-6 sm:h-6 text-[#fef08a] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-fantasy font-black text-sm sm:text-lg text-[#fffbeb] tracking-wide game-text-shadow group-hover:text-[#fde047] transition-colors truncate">
                HOT Command Center
              </span>
              
              {/* Role Badge */}
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-fantasy font-black uppercase tracking-wider border shrink-0 shadow-sm ${
                  isMainAdmin
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-black border-yellow-200'
                    : 'bg-stone-800 text-stone-200 border-stone-600'
                }`}
              >
                {isMainAdmin ? '👑 Main Admin' : '🛡️ R4'}
              </span>
            </div>
            
            <div className="text-[10px] text-amber-300/80 font-bold tracking-wide flex items-center gap-1.5 truncate">
              <span>[HOT] ALLIANCE</span>
              <span className="text-stone-500">•</span>
              <span className="text-stone-300 font-mono">K1391</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Quick Nav Tabs (High-contrast 3D pill tabs) */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-[#100a06] border-2 border-[#381d0c] shadow-inner">
          {navLinks.map(link => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(link.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-fantasy font-black uppercase transition-all cursor-pointer select-none flex items-center gap-1.5 relative ${
                  isActive
                    ? 'bg-gradient-to-b from-[#fde047] to-[#ca8a04] text-[#291304] border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] transform -translate-y-0.5'
                    : 'text-stone-300 hover:text-white hover:bg-[#20130a] active:translate-y-0.5'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black shadow-sm">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions HUD */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Quick Create Event (MainAdmin only) */}
          {isMainAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                if (onOpenCreateEvent) onOpenCreateEvent();
                else setActiveTab('events');
              }}
              className="hidden sm:inline-flex btn-kingshot-gold px-3.5 py-1.5 text-xs font-fantasy font-black uppercase items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Swords className="w-3.5 h-3.5 text-black" />
              <span>New War</span>
            </button>
          )}

          {/* Sync Cloud Database Button */}
          <button
            onClick={() => refreshData()}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-[#221309] border-2 border-[#4a2610] text-amber-300 hover:text-white hover:border-[#b45309] shadow-[0_3px_0_#120803] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Alliance Cloud Records"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Officer Capsule */}
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('profile');
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-[#2f190c] border-[#fde047] text-amber-200 shadow-[0_3px_0_#78350f]'
                : 'bg-[#221309] border-[#4a2610] text-stone-300 hover:text-white hover:border-[#b45309] shadow-[0_3px_0_#120803]'
            } active:translate-y-1 active:shadow-none`}
            title={`Officer Profile: ${admin?.name || admin?.username}`}
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <span className="hidden md:inline text-xs font-fantasy font-black tracking-wide truncate max-w-[90px]">
              {admin?.name || admin?.username}
            </span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleSound}
            className="hidden sm:flex p-2 rounded-xl bg-[#221309] border-2 border-[#4a2610] text-stone-300 hover:text-[#fbbf24] shadow-[0_3px_0_#120803] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            title={settings.soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#fbbf24]" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={() => {
              sounds.playClick();
              logout();
            }}
            className="p-2 rounded-xl bg-[#2a0e0e] border-2 border-[#5c1c1c] text-red-300 hover:text-red-100 hover:bg-[#3b1212] shadow-[0_3px_0_#1a0505] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            title={`Log out (${admin?.username})`}
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
