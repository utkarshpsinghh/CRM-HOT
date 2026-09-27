import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { User, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { settings, updateSettings } = useCRM();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('kingshot_hot');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(username, password, settings);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Access denied. Please check your credentials.');
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    sounds.playClick();
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0806]">
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
              Alliance Leadership Portal
            </p>
          </div>

          {/* Error Banner */}
          {error && (
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
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="e.g. admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-fantasy">
                <Lock className="w-3.5 h-3.5 text-[#ca8a04]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120c08] border border-[#3e2716] text-[#fffbeb] text-sm focus:outline-none focus:border-[#ca8a04] placeholder-stone-600 transition-colors"
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
              <span className="text-[11px] text-stone-500 font-mono">v1.0</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-kingshot-gold w-full py-2.5 text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-4 border-t border-[#3e2716] text-center">
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'kingshot_hot')}
              className="text-xs text-stone-400 hover:text-[#fef08a] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Fill Demo Login (<strong className="text-stone-300 font-mono">admin / kingshot_hot</strong>)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
