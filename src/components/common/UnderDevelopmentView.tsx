import React, { useState } from 'react';
import { Lock, ArrowRight, Shield, ArrowLeft } from 'lucide-react';
import { LoginView } from '../auth/LoginView';
import { sounds } from '../../utils/sound';

export const UnderDevelopmentView: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return (
      <div className="relative">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => {
              sounds.playClick();
              setShowLogin(false);
            }}
            className="btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
        <LoginView />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#090d16] w-full max-w-full selection:bg-amber-500 selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in text-center">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Top Amber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          {/* Alliance Crest */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-[1px] shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[15px] bg-slate-950 flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
              HOT Alliance • Kingdom 1391
            </div>
            <h1 className="font-bold text-2xl text-slate-100 tracking-tight">
              Portal Under Maintenance
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-sm mx-auto leading-relaxed pt-1">
              The alliance database and war records are undergoing maintenance. Regular visitors will be able to access the site shortly.
            </p>
          </div>

          {/* Officer Login Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowLogin(true);
              }}
              className="btn-primary w-full py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>Officer Portal Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
