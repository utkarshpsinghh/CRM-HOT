import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Flame,
  AlertCircle,
  ArrowRight,
  Shield,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getLoginAttemptState } from '../../utils/security';
import { storageService } from '../../services/storage';

interface AndroidLoginViewProps {
  onToggleForceWeb?: () => void;
  isForceWeb?: boolean;
}

export const AndroidLoginView: React.FC<AndroidLoginViewProps> = ({
  onToggleForceWeb,
  isForceWeb,
}) => {
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
    if (isSubmitting || isLocked) return;

    if (!username.trim() || !password.trim()) {
      setError('Please enter both your officer username and password.');
      sounds.playAlert();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    sounds.playClick();

    try {
      const result = await login(username.trim(), password, settings);
      if (!result.success) {
        setError(result.error || 'Invalid credentials. Access denied.');
        sounds.playAlert();
      } else {
        sounds.playSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please try again.');
      sounds.playAlert();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between font-sans px-4 pt-safe pb-safe selection:bg-amber-400 selection:text-slate-950">
      {/* Top Mobile Bar */}
      <header className="pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Flame className="w-4.5 h-4.5 fill-slate-950 stroke-slate-950" />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight text-slate-900 font-mono">
              [HOT] ONE FOR ALL
            </span>
            <span className="text-[10px] text-amber-600 font-bold font-mono block">
              KINGDOM #1391
            </span>
          </div>
        </div>

        {onToggleForceWeb && (
          <button
            onClick={onToggleForceWeb}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
            title="Switch to Web UI"
          >
            <Monitor className="w-3 h-3 text-slate-400" />
            <span>Web UI</span>
          </button>
        )}
      </header>

      {/* Main Login Card - Light Modern Gaming Aesthetic */}
      <main className="my-auto py-6 max-w-sm mx-auto w-full animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 mb-1 shadow-sm">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">
              Officer Sign In
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Enter your credentials to access the Alliance Command Center
            </p>
          </div>

          {/* Lockout Notice */}
          {isLocked && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>Too many attempts. Locked for {lockoutSeconds}s.</span>
            </div>
          )}

          {/* Error Notice */}
          {error && !isLocked && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Officer Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isSubmitting || isLocked}
                  placeholder="e.g. officer"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isSubmitting || isLocked}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 text-center text-[11px] text-slate-400 font-mono">
        <div>HOT Command Center • Android Mobile Edition</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Kingdom #1391 • Secured by Supabase Cloud</div>
      </footer>
    </div>
  );
};
