import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Clock } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getLoginAttemptState } from '../../utils/security';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { settings } = useCRM();

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
            <p className="text-xs text-stone-300 mt-1">
              Officer Portal
            </p>
          </div>

          {/* Lockout Warning Banner */}
          {isLocked && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/90 border border-red-500/70 text-red-200 text-xs flex items-center gap-2.5 shadow-md">
              <Clock className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <span className="font-bold text-red-100">Too many failed attempts.</span> Please wait{' '}
                <span className="font-mono font-bold text-amber-300">{formatCountdown(lockoutSeconds)}</span> before trying again.
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
                autoComplete="off"
                placeholder="Username"
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
                autoComplete="new-password"
                placeholder="Password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors disabled:opacity-50"
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
    </div>
  );
};
