import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Clock, Database, CheckCircle2, RefreshCw, X, Shield, Server, Zap } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getLoginAttemptState, resetLoginAttempts } from '../../utils/security';
import { apiService } from '../../services/api';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const {
    settings,
    connectGoogleSheets,
    disconnectGoogleSheets,
    connectSupabase,
    disconnectSupabase,
    activeDbProvider,
  } = useCRM();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Database Connection Modal state
  const [showDbModal, setShowDbModal] = useState(false);
  const [modalTab, setModalTab] = useState<'supabase' | 'sheets'>(
    settings.dbProvider === 'sheets' ? 'sheets' : 'supabase'
  );
  const [sheetUrlInput, setSheetUrlInput] = useState(settings.gasWebAppUrl || '');
  const [supaUrlInput, setSupaUrlInput] = useState(settings.supabaseUrl || '');
  const [supaKeyInput, setSupaKeyInput] = useState(settings.supabaseAnonKey || '');
  const [isConnectingDb, setIsConnectingDb] = useState(false);
  const [dbModalError, setDbModalError] = useState<string | null>(null);
  const [dbModalSuccess, setDbModalSuccess] = useState<string | null>(null);

  // Sync inputs if settings change
  useEffect(() => {
    if (settings.gasWebAppUrl) {
      setSheetUrlInput(settings.gasWebAppUrl);
    }
    if (settings.supabaseUrl) {
      setSupaUrlInput(settings.supabaseUrl);
    }
    if (settings.supabaseAnonKey) {
      setSupaKeyInput(settings.supabaseAnonKey);
    }
  }, [settings.gasWebAppUrl, settings.supabaseUrl, settings.supabaseAnonKey]);

  // Check lockout on mount and poll countdown
  useEffect(() => {
    const checkLockout = () => {
      const state = getLoginAttemptState();
      if (state.isLocked) {
        setLockoutSeconds(state.remainingSeconds);
      } else {
        setLockoutSeconds(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLocked = lockoutSeconds > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setError(null);
    setIsSubmitting(true);

    const result = await login(username, password, settings);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid username or password.');
      const state = getLoginAttemptState();
      if (state.isLocked) {
        setLockoutSeconds(state.remainingSeconds);
      }
    }
  };

  const handleConnectSupabaseOnLogin = async () => {
    setDbModalError(null);
    setDbModalSuccess(null);
    if (!supaUrlInput.trim() || !supaKeyInput.trim()) {
      setDbModalError('Both Supabase Project URL and Anon API Key are required.');
      return;
    }

    setIsConnectingDb(true);
    try {
      const res = await connectSupabase(supaUrlInput.trim(), supaKeyInput.trim());
      if (res.success) {
        setDbModalSuccess('Connected to Supabase PostgreSQL database successfully!');
        sounds.playSuccess();
        setTimeout(() => {
          setShowDbModal(false);
          setDbModalSuccess(null);
        }, 1200);
      } else {
        setDbModalError(res.message);
        sounds.playAlert();
      }
    } catch (err: any) {
      setDbModalError(err.message || 'Connection failed.');
      sounds.playAlert();
    } finally {
      setIsConnectingDb(false);
    }
  };

  const handleConnectSheetOnLogin = async () => {
    setDbModalError(null);
    setDbModalSuccess(null);
    if (!sheetUrlInput.trim()) {
      setDbModalError('Please enter your Google Apps Script Web App URL.');
      return;
    }

    setIsConnectingDb(true);
    try {
      const res = await connectGoogleSheets(sheetUrlInput.trim());
      if (res.success) {
        setDbModalSuccess('Connected to live Google Sheet database successfully!');
        sounds.playSuccess();
        setTimeout(() => {
          setShowDbModal(false);
          setDbModalSuccess(null);
        }, 1200);
      } else {
        setDbModalError(res.message);
        sounds.playAlert();
      }
    } catch (err: any) {
      setDbModalError(err.message || 'Connection failed.');
      sounds.playAlert();
    } finally {
      setIsConnectingDb(false);
    }
  };

  const handleDisconnectDbOnLogin = () => {
    if (activeDbProvider === 'supabase') {
      disconnectSupabase();
    } else {
      disconnectGoogleSheets();
    }
    setDbModalSuccess('Switched to local / offline mode.');
    setTimeout(() => {
      setShowDbModal(false);
      setDbModalSuccess(null);
    }, 1000);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLive = apiService.isLiveSheets(settings);

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-4 relative overflow-hidden bg-[#0c0806] w-full max-w-full">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 min-w-0">
        <div className="bg-[#1c140e] border-2 border-[#522d14] rounded-2xl shadow-2xl p-5 sm:p-8">
          {/* Alliance Crest & Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#ca8a04] p-2.5 shadow-lg flex items-center justify-center">
              <img src="./favicon.svg" alt="HOT Crest" className="w-full h-full object-contain" />
            </div>

            <div className="text-xs font-fantasy font-black uppercase tracking-widest text-[#ca8a04]">
              Kingshot Alliance
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fef08a] uppercase tracking-wide mt-0.5">
              HOT Alliance CRM
            </h1>
            <div className="text-xs text-stone-300 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
              <span>Officer Portal</span>
              <span className="text-stone-500">&bull;</span>
              {isLive ? (
                <button
                  type="button"
                  onClick={() => setShowDbModal(true)}
                  className="text-emerald-400 font-medium flex items-center gap-1 hover:underline cursor-pointer bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-600/40 transition-colors"
                  title="Live Database Connected (Tap to inspect/reconnect)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Database</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDbModal(true)}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 bg-amber-950/50 hover:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/50 cursor-pointer transition-colors shadow-sm"
                  title="Click to connect Google Sheets Web App URL"
                >
                  <Database className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Offline Mode</span>
                  <span className="text-[10px] text-amber-300/80 underline ml-0.5">Connect Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* Lockout Warning Banner */}
          {isLocked && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs flex items-center justify-between gap-2.5 shadow-md">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-100">Too many attempts.</span> Wait{' '}
                  <span className="font-mono font-bold text-amber-300">{formatCountdown(lockoutSeconds)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetLoginAttempts();
                  setLockoutSeconds(0);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] uppercase tracking-wider cursor-pointer"
              >
                Unlock
              </button>
            </div>
          )}

          {/* Error Banner */}
          {!isLocked && error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {!isLive && (
                  <div className="mt-1 text-[11px] text-amber-300/90">
                    Offline mode active. Only local credentials can log in, or tap <button type="button" onClick={() => setShowDbModal(true)} className="underline font-bold text-amber-200">Connect Sheet</button> above.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-fantasy">
                <User className="w-3.5 h-3.5 text-[#ca8a04]" />
                <span>Username</span>
              </label>
              <input
                type="text"
                value={username}
                disabled={isLocked}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="off"
                placeholder="Username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-base sm:text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wide mb-1 flex items-center justify-between font-fantasy">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#ca8a04]" />
                  <span>Password</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-stone-400 hover:text-amber-300 text-[11px] font-sans flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={isLocked}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-base sm:text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="btn-kingshot-gold w-full py-2.5 text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing In...' : isLocked ? `Locked (${formatCountdown(lockoutSeconds)})` : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Database Connection Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#1c140e] border-2 border-[#522d14] shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3e2716]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#2e180a] border border-[#ca8a04]/40 text-[#fef08a]">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-fantasy font-black text-base sm:text-lg text-[#fef08a]">
                    Alliance Database Engine
                  </h3>
                  <p className="text-xs text-stone-400">
                    {activeDbProvider === 'supabase'
                      ? '⚡ Connected to Supabase PostgreSQL (Ultra-fast)'
                      : isLive
                      ? 'Connected to Google Sheets'
                      : 'Currently in Offline / Local Mode'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDbModal(false);
                  setDbModalError(null);
                  setDbModalSuccess(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Engine Tabs */}
            <div className="flex rounded-xl bg-[#120c08] p-1 border border-[#3e2716] gap-1">
              <button
                type="button"
                onClick={() => setModalTab('supabase')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalTab === 'supabase'
                    ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Supabase PostgreSQL</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('sheets')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-fantasy font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalTab === 'sheets'
                    ? 'bg-gradient-to-r from-[#ca8a04] to-[#eab308] text-black shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </button>
            </div>

            {/* TAB 1: SUPABASE */}
            {modalTab === 'supabase' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-fantasy font-bold text-stone-300 uppercase">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={supaUrlInput}
                    onChange={e => setSupaUrlInput(e.target.value)}
                    placeholder="https://xyzabcdefghijklmn.supabase.co"
                    className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-xs font-mono focus:outline-none focus:border-[#ca8a04] placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-fantasy font-bold text-stone-300 uppercase">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={supaKeyInput}
                    onChange={e => setSupaKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-xs font-mono focus:outline-none focus:border-[#ca8a04] placeholder-stone-600"
                  />
                  <p className="text-[10px] text-stone-400">
                    Find these in Supabase Dashboard &gt; Project Settings &gt; API.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConnectSupabaseOnLogin}
                    disabled={isConnectingDb || !supaUrlInput.trim() || !supaKeyInput.trim()}
                    className="btn-kingshot-gold flex-1 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isConnectingDb ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying &amp; Connecting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Connect &amp; Save Supabase</span>
                      </>
                    )}
                  </button>

                  {(activeDbProvider === 'supabase' || isLive) && (
                    <button
                      type="button"
                      onClick={handleDisconnectDbOnLogin}
                      disabled={isConnectingDb}
                      className="px-3 py-2 rounded-xl bg-[#29160a] border border-[#42220d] text-stone-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Disconnect (Use Offline)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SHEETS */}
            {modalTab === 'sheets' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-fantasy font-bold text-stone-300 uppercase">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    value={sheetUrlInput}
                    onChange={e => setSheetUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-xs font-mono focus:outline-none focus:border-[#ca8a04] placeholder-stone-600"
                  />
                  <p className="text-[10px] text-stone-400">
                    Must start with <code className="text-[#fef08a] font-mono">https://script.google.com/macros/s/.../exec</code>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConnectSheetOnLogin}
                    disabled={isConnectingDb || !sheetUrlInput.trim()}
                    className="btn-kingshot-gold flex-1 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isConnectingDb ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying &amp; Connecting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Connect &amp; Save Sheet</span>
                      </>
                    )}
                  </button>

                  {(activeDbProvider === 'supabase' || isLive) && (
                    <button
                      type="button"
                      onClick={handleDisconnectDbOnLogin}
                      disabled={isConnectingDb}
                      className="px-3 py-2 rounded-xl bg-[#29160a] border border-[#42220d] text-stone-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Disconnect (Use Offline)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error / Success Feedback */}
            {dbModalError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{dbModalError}</span>
              </div>
            )}
            {dbModalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{dbModalSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
