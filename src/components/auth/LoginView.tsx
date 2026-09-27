import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { GameButton } from '../common/GameButton';
import { Shield, KeyRound, User, Lock, AlertCircle, Info, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0c13] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-red-950/25 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-950/20 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Login Stone Tablet */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl bg-gradient-to-b from-[#1e2333] via-[#151926] to-[#0d0f17] border-2 border-[#ca8a04] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_25px_rgba(202,138,4,0.3)] relative overflow-hidden">
          {/* Filigree Corner Emblems */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#fef08a]" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#fef08a]" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#fef08a]" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#fef08a]" />

          {/* Alliance Crest & Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-b from-[#991b1b] to-[#450a0a] border-2 border-[#fef08a] p-2.5 shadow-[0_0_20px_rgba(234,179,8,0.5)] flex items-center justify-center">
              <img src="/favicon.svg" alt="HOT Crest" className="w-full h-full object-contain" />
            </div>

            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#fffbeb] via-[#fef08a] to-[#ca8a04] tracking-wider">
              HOT ALLIANCE
            </h1>
            <p className="font-fantasy font-bold text-xs uppercase tracking-widest text-[#ca8a04] mt-0.5">
              Command Center Gate
            </p>
            <p className="text-xs text-stone-400 mt-1 italic">
              &quot;Strength Through Unity&quot; • Authorized Officers Only
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/80 border border-red-500/80 text-red-200 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#ca8a04]" />
                <span>Officer Username / Call-sign</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="e.g. admin"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0c13] border border-[#524126] text-[#f4ecd8] text-sm focus:outline-none focus:border-[#ca8a04] focus:ring-1 focus:ring-[#ca8a04] placeholder-stone-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#ca8a04]" />
                <span>Command Passphrase</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0c13] border border-[#524126] text-[#f4ecd8] text-sm focus:outline-none focus:border-[#ca8a04] focus:ring-1 focus:ring-[#ca8a04] placeholder-stone-600 transition-colors"
                />
              </div>
            </div>

            {/* Mode selection toggle */}
            <div className="pt-1 flex items-center justify-between text-xs text-stone-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.demoMode}
                  onChange={e => updateSettings({ ...settings, demoMode: e.target.checked })}
                  className="rounded bg-[#0c0e16] border-[#524126] text-[#ca8a04] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-stone-300">Offline / Demo Mode</span>
              </label>

              <span className="text-[11px] text-[#ca8a04] font-medium">HOT v1.0 MVP</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <GameButton
                type="submit"
                variant="gold"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
                icon={<KeyRound className="w-4 h-4" />}
              >
                {isSubmitting ? 'Authenticating...' : 'Enter War Room'}
              </GameButton>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-4 border-t border-[#3f321d] bg-black/30 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Default Alliance Credentials</span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'kingshot_hot')}
                className="text-[11px] px-2.5 py-1 rounded bg-[#251f14] border border-[#ca8a04]/60 text-[#fef08a] hover:bg-[#3d3119] transition-colors cursor-pointer"
              >
                User: <span className="font-mono font-bold">admin</span> | Pass: <span className="font-mono font-bold">kingshot_hot</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-500 mt-2">
              Google Sheets backend integration can also be configured after entering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
