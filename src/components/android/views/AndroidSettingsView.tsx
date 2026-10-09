import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCRM } from '../../../context/CRMContext';
import { Settings, Shield, Volume2, VolumeX, Database, LogOut, Smartphone, Monitor, CheckCircle2, ChevronRight, Lock, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';
import { sounds } from '../../../utils/sound';

interface AndroidSettingsViewProps {
  onToggleForceWeb: () => void;
  isForceWeb: boolean;
}

export const AndroidSettingsView: React.FC<AndroidSettingsViewProps> = ({
  onToggleForceWeb,
  isForceWeb,
}) => {
  const { admin, logout, isMainAdmin, isAuthenticated, login } = useAuth();
  const { settings, updateSettings, syncStatus } = useCRM();

  const [soundEnabled, setSoundEnabled] = useState(() => settings.soundEnabled ?? true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleToggleSound = async () => {
    sounds.playClick();
    const next = !soundEnabled;
    setSoundEnabled(next);
    await updateSettings({ ...settings, soundEnabled: next });
    if (next) sounds.playSuccess();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    sounds.playClick();
    const res = await login(username, password, settings);
    if (!res.success) {
      setLoginError(res.error || 'Invalid Officer Credentials');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sounds.playAlert();
    logout();
  };

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Officer Profile Card / Login Portal */}
      {isAuthenticated ? (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-950/70 via-[#090d1c] to-[#04060e] border border-rose-500/50 shadow-[0_4px_30px_rgba(225,29,72,0.3)] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300 shrink-0 shadow-[0_0_15px_rgba(225,29,72,0.5)]">
              <Shield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-white truncate font-mono uppercase tracking-wider">
                {admin?.name || admin?.username || 'Officer'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-black border border-rose-500/40">
                  {admin?.role || 'OFFICER CLEARANCE'}
                </span>
                <span className="text-xs text-cyan-400 font-mono">@{admin?.username}</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-rose-500/20 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Tactical Node:</span>
            <span className="text-cyan-300 font-bold">[HOT] ONE FOR ALL #1391</span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0b1020] to-[#04060e] border border-cyan-500/30 shadow-[0_4px_30px_rgba(6,182,212,0.15)] space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-mono font-black text-xs text-white uppercase tracking-wider">
                Officer Tactical Sign-In
              </h3>
              <p className="text-[10px] text-cyan-300/80 font-mono">Unlock Officer Ops & Roster Controls</p>
            </div>
          </div>

          {loginError && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-mono flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-2.5 pt-1">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Officer Username..."
              className="w-full px-3 py-2 rounded-xl bg-[#060914] border border-cyan-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Security Key..."
              className="w-full px-3 py-2 rounded-xl bg-[#060914] border border-cyan-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  SIGN IN AS OFFICER
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* App Preferences */}
      <div className="rounded-3xl bg-[#060914]/90 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        {/* Sound Toggle */}
        <div
          onClick={handleToggleSound}
          className="p-4 flex items-center justify-between gap-3 active:bg-rose-500/5 cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <div className="font-bold text-xs text-white font-mono uppercase">Combat Audio FX</div>
              <div className="text-[10px] text-slate-400 font-mono">Tactile sound responses on actions</div>
            </div>
          </div>
          <div
            className={`w-11 h-6 rounded-full transition-colors p-1 ${
              soundEnabled ? 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.6)]' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
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
          className="p-4 flex items-center justify-between gap-3 active:bg-cyan-500/5 cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white font-mono uppercase">Desktop Web UI</div>
              <div className="text-[10px] text-slate-400 font-mono">Switch to classic desktop browser view</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
            Toggle <ChevronRight className="w-4 h-4" />
          </span>
        </div>

        {/* Supabase Cloud Connection Status */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white font-mono uppercase">Supabase Cloud Matrix</div>
              <div className="text-[10px] text-slate-400 font-mono">Live multi-device replication</div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            SYNCED
          </span>
        </div>
      </div>

      {/* App Version Info */}
      <div className="p-3.5 rounded-2xl bg-[#04060d] border border-slate-900 text-center space-y-1">
        <div className="text-[11px] font-mono font-bold text-rose-400 tracking-wider">
          HOT COMMAND CENTER // ANDROID EDITION
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          v1.0.0 • Kingdom #1391 • Capacitor 8 Native Engine
        </div>
      </div>

      {/* Logout Button */}
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm hover:bg-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Officer Session</span>
        </button>
      )}
    </div>
  );
};
