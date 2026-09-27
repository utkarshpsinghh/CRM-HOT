import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { KeyRound, User, Lock, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
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
      setError(result.error || 'Access denied. Only recognized officers may enter.');
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    sounds.playClick();
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cartoon Flowers */}
      <div className="hidden sm:block absolute left-12 top-20 text-3xl select-none animate-bounce" style={{ animationDuration: '3s' }}>
        🌸
      </div>
      <div className="hidden sm:block absolute right-16 bottom-24 text-3xl select-none animate-bounce" style={{ animationDuration: '3.5s' }}>
        🌸
      </div>

      {/* Main Login Wooden Signboard (Matches Screenshot) */}
      <div className="w-full max-w-md relative z-10">
        <div className="kingshot-signboard p-6 sm:p-8 relative">
          {/* Corner Rivet Bolts + Leaf Sprouts 🌱 */}
          <div className="corner-bolt top-3 left-3" />
          <div className="absolute top-2 left-6 text-sm select-none">🌱</div>

          <div className="corner-bolt top-3 right-3" />
          <div className="absolute top-2 right-6 text-sm select-none">🌱</div>

          <div className="corner-bolt bottom-3 left-3" />
          <div className="corner-bolt bottom-3 right-3" />

          {/* Alliance Crest & Header */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#fbbf24] p-2 shadow-lg flex items-center justify-center">
              <img src="/favicon.svg" alt="HOT Crest" className="w-full h-full object-contain" />
            </div>

            <div className="text-[11px] font-black uppercase tracking-widest text-[#fbbf24]">
              KINGSHOT ALLIANCE
            </div>
            <h1 className="woodcut-title text-3xl sm:text-4xl font-black uppercase leading-tight">
              HOT ALLIANCE
            </h1>
            <p className="text-xs text-stone-200 mt-1 font-bold">
              Command Center Officer Gate
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/90 border-2 border-red-500 text-red-200 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#fef08a] uppercase tracking-wider mb-1 flex items-center gap-1.5 font-sans">
                <User className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>Officer Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="e.g. admin"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#140802] border-2 border-[#54290d] text-[#fffbeb] text-sm focus:outline-none focus:border-[#fbbf24] placeholder-stone-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#fef08a] uppercase tracking-wider mb-1 flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>Command Passphrase</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#140802] border-2 border-[#54290d] text-[#fffbeb] text-sm focus:outline-none focus:border-[#fbbf24] placeholder-stone-500"
              />
            </div>

            {/* Mode selection toggle */}
            <div className="pt-1 flex items-center justify-between text-xs text-stone-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.demoMode}
                  onChange={e => updateSettings({ ...settings, demoMode: e.target.checked })}
                  className="rounded bg-[#140802] border-[#54290d] text-[#fbbf24] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-bold">Offline Demo Mode</span>
              </label>

              <span className="text-[11px] text-[#fbbf24] font-bold">v1.0 MVP</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-kingshot-gold w-full py-3 text-sm sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>{isSubmitting ? 'AUTHENTICATING...' : 'ENTER WAR ROOM'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-5 pt-3 border-t border-[#4d2309] bg-[#140802]/70 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 text-center rounded-b-xl">
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-bold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Officer Credentials</span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'kingshot_hot')}
              className="text-[11px] px-3 py-1 rounded bg-[#2e1507] border border-[#d97706] text-[#fef08a] hover:bg-[#431d08] transition-colors cursor-pointer"
            >
              User: <span className="font-mono font-bold">admin</span> | Pass: <span className="font-mono font-bold">kingshot_hot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
