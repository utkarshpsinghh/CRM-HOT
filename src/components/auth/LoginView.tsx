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
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getLoginAttemptState, resetLoginAttempts } from '../../utils/security';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { settings, activeDbProvider } = useCRM();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const handleQuickFill = (user: string, pass: string) => {
    sounds.playClick();
    setUsername(user);
    setPassword(pass);
    setError(null);
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0705] w-full max-w-full selection:bg-[#ca8a04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-amber-600/15 via-red-950/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-[#b45309]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-gradient-to-b from-[#1c130d] to-[#140d09] border-2 border-[#3e2716] hover:border-[#522d14] rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm transition-colors">
          {/* Alliance Crest & Header */}
          <div className="text-center mb-6">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3.5 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#ca8a04] to-[#eab308] rounded-2xl blur-sm opacity-30 group-hover:opacity-60 transition duration-500" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#ca8a04] p-3 shadow-xl flex items-center justify-center">
                <img
                  src="./favicon.svg"
                  alt="HOT Alliance Crest"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
            </div>

            <div className="text-[11px] font-fantasy font-black uppercase tracking-widest text-[#ca8a04]">
              Kingshot Alliance
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fef08a] uppercase tracking-wide mt-0.5">
              HOT Alliance CRM
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Officer Command &amp; War Attendance Portal
            </p>

            {/* Cloud Gateway Indicator Badge */}
            <div className="mt-2.5 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#120c08] border border-[#2c1d15] text-stone-300 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {activeDbProvider === 'supabase'
                    ? 'PostgreSQL Cloud Gateway'
                    : 'Secure Alliance Gateway'}
                </span>
              </span>
            </div>
          </div>

          {/* Brute-force Lockout Banner */}
          {isLocked && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-amber-100">Access temporarily restricted</p>
                  <p className="text-[11px] text-amber-300/90 mt-0.5">
                    Security cooldown active: <span className="font-mono font-bold text-amber-300">{formatCountdown(lockoutSeconds)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetLockout}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-fantasy font-black text-[11px] uppercase transition-colors shrink-0 shadow"
              >
                Reset Lockout
              </button>
            </div>
          )}

          {/* Error Banner */}
          {!isLocked && error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Quick-Fill Credentials Panel */}
          <div className="mb-4 p-3 rounded-xl bg-[#120c08] border border-[#3e2716] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-fantasy font-bold uppercase tracking-wider text-amber-400">
                1-Click Quick Fill Credentials
              </span>
              <span className="text-[10px] text-stone-500 font-mono">HOT Alliance Portal</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('seoyoon', 'masterlogin')}
                className="px-2.5 py-1.5 rounded-lg bg-[#22160d] hover:bg-[#321e10] border border-[#532e14] hover:border-amber-500 text-left transition-all group cursor-pointer"
              >
                <div className="text-[11px] font-fantasy font-bold text-amber-300 flex items-center gap-1">
                  <span>👑 Leader</span>
                </div>
                <div className="text-[10px] text-stone-400 font-mono">seoyoon / masterlogin</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin')}
                className="px-2.5 py-1.5 rounded-lg bg-[#22160d] hover:bg-[#321e10] border border-[#532e14] hover:border-amber-500 text-left transition-all group cursor-pointer"
              >
                <div className="text-[11px] font-fantasy font-bold text-amber-300 flex items-center gap-1">
                  <span>🛡️ Officer</span>
                </div>
                <div className="text-[10px] text-stone-400 font-mono">admin / admin</div>
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#ca8a04]" />
                <span>Officer Username</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  disabled={isLocked || isSubmitting}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. seoyoon"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] focus:ring-1 focus:ring-[#ca8a04]/40 placeholder-stone-600 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#ca8a04]" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-stone-400 hover:text-amber-300 text-[11px] font-sans flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={isLocked || isSubmitting}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] focus:ring-1 focus:ring-[#ca8a04]/40 placeholder-stone-600 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isLocked || !username.trim() || !password}
                className="btn-kingshot-gold w-full py-2.5 text-xs sm:text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : isLocked
                    ? `Locked (${formatCountdown(lockoutSeconds)})`
                    : 'Sign In to Portal'}
                </span>
                <ArrowRight className={`w-4 h-4 stroke-[3] ${isSubmitting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </form>

          {/* Security Footnote */}
          <div className="mt-6 pt-4 border-t border-[#2c1d15] text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>256-Bit Encrypted Session</span>
              <span className="text-stone-600">•</span>
              <span>Authorized R4 / R5 Only</span>
            </div>
            <div className="text-[10px] text-stone-400 font-mono">
              HOT Alliance • Strength Through Unity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
