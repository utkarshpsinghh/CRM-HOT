import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  Volume2,
  VolumeX,
  LogOut,
  RefreshCw,
  Swords,
  Shield,
  User,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Trophy,
  AlertTriangle,
  Award,
  Settings,
  Plus,
} from 'lucide-react';
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
    refreshData,
    isSyncing,
    inactiveInsights,
    stats,
  } = useCRM();

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playClick();
  };

  const navLinks: Array<{ id: string; label: string; icon: React.ReactNode; count?: number; badge?: string | null }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'members', label: 'Members', count: stats.totalMembers, icon: <Users className="w-4 h-4" /> },
    { id: 'events', label: 'Events', icon: <Swords className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    {
      id: 'activity',
      label: 'Activity',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    ...(isMainAdmin ? [{ id: 'contributions', label: 'Contributions', icon: <Award className="w-4 h-4" /> }] : []),
    ...(isMainAdmin ? [{ id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3 w-full">
        
        {/* Left: Brand Identity */}
        <div
          onClick={() => {
            sounds.playClick();
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-[1px] shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-all flex items-center justify-center">
            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-100 tracking-tight group-hover:text-amber-400 transition-colors truncate">
                HOT Command
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isMainAdmin
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isMainAdmin ? 'Main Admin' : 'Officer'}
              </span>
            </div>
            
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
              <span>HOT Alliance</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400/90 font-mono">K1391</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-300 font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 border border-sky-500/25">UTC Time</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800/80">
          {navLinks.map(link => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(link.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 relative ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{link.icon}</span>
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-semibold shadow-sm">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Quick Create Event */}
          {isMainAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                if (onOpenCreateEvent) onOpenCreateEvent();
                else setActiveTab('events');
              }}
              className="hidden sm:inline-flex btn-primary px-3 py-1.5 text-xs font-semibold items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New War</span>
            </button>
          )}

          {/* Sync Cloud Records */}
          <button
            onClick={() => refreshData()}
            disabled={isSyncing}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Alliance Cloud Records"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Officer Profile */}
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('profile');
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title={`Officer Profile: ${admin?.name || admin?.username}`}
          >
            <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-amber-400" />
            </div>
            <span className="hidden md:inline text-xs font-medium truncate max-w-[90px]">
              {admin?.name || admin?.username}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="hidden sm:flex p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
            title={settings.soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              sounds.playClick();
              logout();
            }}
            className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
            title={`Log out (${admin?.username})`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
