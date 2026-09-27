import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { Volume2, VolumeX, LogOut, Shield, Database, RefreshCw, Crown } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const Header: React.FC = () => {
  const { admin, logout } = useAuth();
  const { syncStatus, syncMessage, settings, updateSettings, refreshData, isLoading, setActiveTab } = useCRM();

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playClick();
  };

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'connected':
        return (
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs font-medium cursor-pointer hover:border-emerald-400 transition-colors"
            title="Google Sheets connected. Click to view Settings."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Sheets Live</span>
            <span className="sm:hidden">Live</span>
          </button>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/80 text-blue-300 text-xs font-medium">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
            <span className="hidden sm:inline">Syncing...</span>
          </div>
        );
      case 'error':
        return (
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/80 text-red-300 text-xs font-medium cursor-pointer hover:border-red-400 transition-colors"
            title="Google Sheets error. Click to check settings."
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Sheets Error</span>
          </button>
        );
      case 'demo':
      default:
        return (
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/80 text-amber-300 text-xs font-medium cursor-pointer hover:border-amber-400 transition-colors"
            title="Local storage database. Click to connect Google Sheets."
          >
            <Database className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Demo DB</span>
            <span className="sm:hidden">Demo</span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f121c]/95 backdrop-blur-md border-b-2 border-[#644e23] shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
        {/* Alliance Crest & Title */}
        <div
          onClick={() => {
            sounds.playClick();
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none group"
        >
          {/* Kingshot Crest Emblem */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#eab308] flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-105 transition-transform shrink-0">
            <img src="/favicon.svg" alt="HOT Crest" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-fantasy font-black text-lg sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] tracking-wider drop-shadow-md">
                HOT ALLIANCE
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-[#7f1d1d] text-[#fef08a] border border-[#eab308]/60">
                CRM
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#a8a29e] tracking-wide font-sans hidden sm:block">
              Kingshot Command Center • &quot;Strength Through Unity&quot;
            </p>
          </div>
        </div>

        {/* Right Actions: Sync status, Sound, Officer, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync status */}
          <div className="shrink-0">{getSyncBadge()}</div>

          {/* Refresh button */}
          <button
            onClick={() => {
              sounds.playClick();
              refreshData();
            }}
            disabled={isLoading}
            className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/60 text-stone-300 hover:text-[#fef08a] hover:border-[#ca8a04] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Alliance Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-stone-900/60 border border-stone-700/60 text-stone-300 hover:text-[#fef08a] hover:border-[#ca8a04] transition-colors cursor-pointer"
            title={settings.soundEnabled ? 'Mute Game SFX' : 'Enable Game SFX'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#eab308]" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Admin User Badge */}
          {admin && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900/80 border border-[#524126]">
              <Crown className="w-4 h-4 text-[#eab308]" />
              <div className="text-left text-xs leading-tight">
                <div className="font-bold text-[#fef08a]">{admin.username}</div>
                <div className="text-[10px] text-stone-400">{admin.role}</div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={() => {
              sounds.playClick();
              logout();
            }}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/50 hover:border-red-600 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Log Out Officer Session"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
