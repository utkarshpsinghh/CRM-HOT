import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { User, Lock, AlertCircle, ArrowRight, Sparkles, ShieldCheck, Eye, EyeOff, Clock } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getLoginAttemptState } from '../../utils/security';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { settings, updateSettings } = useCRM();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('kingshot_hot');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

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
      setError(result.error || 'Access denied. Please check your credentials.');
      const state = getLoginAttemptState();
      if (state.isLocked) {
        setLockoutSeconds(state.remainingSeconds);
      }
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    if (isLocked) return;
    sounds.playClick();
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0806]">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1c140e] border-2 border-[#522d14] rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Alliance Crest & Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#ca8a04] p-2.5 shadow-lg flex items-center justify-center">
              <img src="/favicon.svg" alt="HOT Crest" className="w-full h-full object-contain" />
            </div>

            <div className="text-xs font-fantasy font-black uppercase tracking-widest text-[#ca8a04]">
              Kingshot Alliance
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fef08a] uppercase tracking-wide mt-0.5">
              HOT Alliance CRM
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Alliance Leadership Command Portal
            </p>
          </div>

          {/* Lockout Warning Banner */}
          {isLocked && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/90 border border-red-500/70 text-red-200 text-xs flex items-start gap-2.5 shadow-md animate-pulse">
              <Clock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-100">Rate-Limit Lockout Active</div>
                <div className="text-[11px] text-red-300 mt-0.5">
                  Too many failed attempts. Login unlocked in{' '}
                  <span className="font-mono font-bold text-amber-300">{formatCountdown(lockoutSeconds)}</span>.
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {!isLocked && error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                placeholder="e.g. admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors disabled:opacity-50"
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
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Offline demo toggle */}
            <div className="pt-1 flex items-center justify-between text-xs text-stone-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.demoMode}
                  onChange={e => updateSettings({ ...settings, demoMode: e.target.checked })}
                  className="rounded bg-[#120c08] border-[#3e2716] text-[#ca8a04] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs">Offline Demo Mode</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] text-stone-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="btn-kingshot-gold w-full py-2.5 text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Authenticating...' : isLocked ? `Locked (${formatCountdown(lockoutSeconds)})` : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-5 pt-3.5 border-t border-[#3e2716] space-y-2 text-center">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ca8a04]" />
              <span>Quick Demo Accounts</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => handleQuickFill('admin', 'kingshot_hot')}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#120c08] border border-[#d97706]/60 text-xs text-amber-300 hover:bg-[#25150a] transition-all cursor-pointer font-bold disabled:opacity-40"
              >
                👑 Main Admin (<span className="font-mono text-amber-200">admin</span>)
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => handleQuickFill('officer', 'hot123')}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#120c08] border border-stone-600/60 text-xs text-stone-300 hover:bg-[#25150a] transition-all cursor-pointer font-bold disabled:opacity-40"
              >
                ⚔️ Sub-Admin (<span className="font-mono text-stone-200">officer</span>)
              </button>
            </div>
          </div>

          {/* Security Assurance Footer */}
          <div className="mt-4 pt-2.5 border-t border-[#25150c] flex items-center justify-center gap-1.5 text-[10px] text-stone-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#ca8a04]" />
            <span>256-Bit Cryptographic Vault & Brute-Force Rate Limiter</span>
          </div>
        </div>
      </div>
    </div>
  );
};
