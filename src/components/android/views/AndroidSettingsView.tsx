import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCRM } from '../../../context/CRMContext';
import { Settings, Shield, Volume2, VolumeX, Database, LogOut, Smartphone, Monitor, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { sounds } from '../../../utils/sound';

interface AndroidSettingsViewProps {
  onToggleForceWeb: () => void;
  isForceWeb: boolean;
}

export const AndroidSettingsView: React.FC<AndroidSettingsViewProps> = ({
  onToggleForceWeb,
  isForceWeb,
}) => {
  const { admin, logout, isMainAdmin } = useAuth();
  const { settings, updateSettings, syncStatus } = useCRM();

  const [soundEnabled, setSoundEnabled] = useState(() => settings.soundEnabled ?? true);

  const handleToggleSound = async () => {
    sounds.playClick();
    const next = !soundEnabled;
    setSoundEnabled(next);
    await updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playSuccess();
  };

  const handleLogout = () => {
    sounds.playAlert();
    logout();
  };

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Officer Profile Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-white truncate">
              {admin?.name || admin?.username || 'Officer'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                {admin?.role || 'Officer'}
              </span>
              <span className="text-xs text-slate-400 font-mono">@{admin?.username}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Alliance Tag:</span>
          <span className="text-amber-400 font-bold font-mono">[HOT] OneForAll (#1391)</span>
        </div>
      </div>

      {/* App Preferences */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden shadow-sm">
        {/* Sound Toggle */}
        <div
          onClick={handleToggleSound}
          className="p-4 flex items-center justify-between gap-3 active:bg-slate-800/40 cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <div className="font-bold text-xs text-white">Audio & Sound FX</div>
              <div className="text-[10px] text-slate-400">Tactile sounds on actions & votes</div>
            </div>
          </div>
          <div
            className={`w-11 h-6 rounded-full transition-colors p-1 ${
              soundEnabled ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Switch to Web Command Center Mode */}
        <div
          onClick={() => {
            sounds.playClick();
            onToggleForceWeb();
          }}
          className="p-4 flex items-center justify-between gap-3 active:bg-slate-800/40 cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">Desktop Command Center</div>
              <div className="text-[10px] text-slate-400">Switch to full web interface layout</div>
            </div>
          </div>
          <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
            Switch <ChevronRight className="w-4 h-4" />
          </span>
        </div>

        {/* Supabase Cloud Connection Status */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">Cloud Database</div>
              <div className="text-[10px] text-slate-400">Supabase live replication</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Connected
          </span>
        </div>
      </div>

      {/* App Version Info */}
      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-900 text-center space-y-1">
        <div className="text-[11px] font-bold text-slate-400">
          HOT Command Center Android Edition
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          v1.0.0 • Kingdom #1391 • Native Capacitor 8
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of Officer Account</span>
      </button>
    </div>
  );
};
