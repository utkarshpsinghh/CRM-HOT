import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getLoginAttemptState, resetLoginAttempts } from '../../utils/security';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { settings } = useCRM();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

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
    if (isLocked || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    sounds.playClick();

    const result = await login(username.trim(), password, settings);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid officer credentials. Please check your username and password.');
      const state = getLoginAttemptState();
      if (state.isLocked) {
        setLockoutSeconds(state.remainingSeconds);
      }
    }
  };

  const handleResetLockout = () => {
    sounds.playSuccess();
    resetLoginAttempts();
    setLockoutSeconds(0);
    setError(null);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#090d16] w-full max-w-full selection:bg-amber-500 selection:text-slate-950">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 relative overflow-hidden">
          
          {/* Top Amber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          {/* Alliance Crest & Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-[1px] shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full rounded-[15px] bg-slate-950 flex items-center justify-center">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
              HOT Alliance • Kingdom 1391
            </div>
            <h1 className="font-bold text-2xl text-slate-100 tracking-tight mt-1">
              Command Portal
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Officer Roster &amp; War Ledger Access
            </p>
          </div>

          {/* Cooldown Active Banner */}
          {isLocked && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-200">Cooldown Active</p>
                  <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                    Remaining: {formatCountdown(lockoutSeconds)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetLockout}
                className="btn-secondary px-2.5 py-1 text-xs font-semibold"
              >
                Reset
              </button>
            </div>
          )}

          {/* Error Banner */}
          {!isLocked && error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Officer Username</span>
              </label>
              <input
                type="text"
                value={username}
                disabled={isLocked || isSubmitting}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="Enter officer username"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 placeholder-slate-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={isLocked || isSubmitting}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 placeholder-slate-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isLocked || !username.trim() || !password}
                className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : isLocked
                    ? `Locked (${formatCountdown(lockoutSeconds)})`
                    : 'Sign In'}
                </span>
                <ArrowRight className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </form>

          {/* Security Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Authorized Officers (R4 / R5)</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              HOT Alliance • Strength Through Unity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
