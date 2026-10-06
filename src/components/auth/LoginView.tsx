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
  Castle,
  Crown,
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0805] w-full max-w-full selection:bg-[#ca8a04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-amber-500/20 via-red-950/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-[#b45309]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-pop-in">
        <div className="bg-gradient-to-b from-[#24170f] via-[#1a110a] to-[#120b06] border-[3.5px] border-[#ca8a04] rounded-3xl p-6 sm:p-8 shadow-[0_8px_0_#451a03,0_16px_36px_rgba(0,0,0,0.7)] relative overflow-hidden">
          
          {/* Top Gold Rim Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

          {/* Alliance Crest & Header */}
          <div className="text-center mb-6">
            <div className="relative w-20 h-20 mx-auto mb-3.5 group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#facc15] to-[#f59e0b] rounded-2xl blur-sm opacity-50 group-hover:opacity-80 transition duration-500" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#f59e0b] via-[#b45309] to-[#78350f] p-0.5 border-2 border-[#fef08a] shadow-[0_4px_0_#451a03] flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#881337] to-[#4c0519] flex items-center justify-center">
                  <Castle className="w-10 h-10 text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                </div>
              </div>
            </div>

            <div className="text-[11px] font-fantasy font-black uppercase tracking-widest text-[#facc15] gold-text-glow">
              👑 HOT ALLIANCE • K1391
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fffbeb] uppercase tracking-wide mt-1 game-text-shadow">
              Command Center
            </h1>
            <p className="text-xs text-amber-200/80 font-medium mt-1">
              Officer Roster &amp; Battle Ledger Access
            </p>
          </div>

          {/* Brute-force Lockout Banner */}
          {isLocked && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-950 border-2 border-amber-500 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-[0_3px_0_#451a03]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-fantasy font-black uppercase text-amber-100">Cooldown Active</p>
                  <p className="text-[11px] text-amber-300 font-mono font-bold mt-0.5">
                    Remaining: {formatCountdown(lockoutSeconds)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetLockout}
                className="btn-kingshot-gold px-3 py-1.5 text-[11px] font-fantasy font-black uppercase shadow"
              >
                Reset
              </button>
            </div>
          )}

          {/* Error Banner */}
          {!isLocked && error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-950 border-2 border-red-500 text-red-200 text-xs flex items-start gap-2.5 shadow-[0_3px_0_#450a0a]">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-fantasy font-black text-[#fef08a] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#100905] border-2 border-[#3d200e] text-[#fffbeb] text-sm font-medium focus:outline-none focus:border-[#fde047] shadow-inner placeholder-stone-600 transition-all disabled:opacity-50"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-fantasy font-black text-[#fef08a] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Passcode</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-amber-400 hover:text-amber-300 text-[11px] font-fantasy uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#100905] border-2 border-[#3d200e] text-[#fffbeb] text-sm font-medium focus:outline-none focus:border-[#fde047] shadow-inner placeholder-stone-600 transition-all disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isLocked || !username.trim() || !password}
                className="btn-kingshot-gold w-full py-3 text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xl disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : isLocked
                    ? `Locked (${formatCountdown(lockoutSeconds)})`
                    : '⚔️ Enter Command Center'}
                </span>
                <ArrowRight className={`w-4 h-4 stroke-[3] ${isSubmitting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </form>

          {/* Security Footnote */}
          <div className="mt-6 pt-4 border-t-2 border-[#2c1d15] text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-fantasy uppercase text-amber-300/80 tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Authorized R4 / R5 Officers Only</span>
            </div>
            <div className="text-[10px] text-stone-500 font-mono">
              HOT Alliance • Strength Through Unity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
