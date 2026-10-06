import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
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
            className="px-3 py-1.5 rounded-xl bg-[#1c130d] hover:bg-[#2c1d15] border border-[#3e2716] text-amber-300 text-xs font-fantasy font-bold uppercase transition-all flex items-center gap-1.5 shadow cursor-pointer"
          >
            <span>← Back</span>
          </button>
        </div>
        <LoginView />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0705] w-full max-w-full selection:bg-[#ca8a04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-amber-600/15 via-red-950/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in text-center">
        <div className="bg-gradient-to-b from-[#1c130d] to-[#140d09] border-2 border-[#3e2716] rounded-3xl shadow-2xl p-8 sm:p-10 backdrop-blur-sm space-y-6">
          {/* Alliance Crest */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#ca8a04] p-3 shadow-xl flex items-center justify-center">
              <img
                src="./favicon.svg"
                alt="HOT Alliance Crest"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="text-xs font-fantasy font-black uppercase tracking-widest text-[#ca8a04]">
              HOT Alliance
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fef08a] uppercase tracking-wide">
              HOT Command Center
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto leading-relaxed pt-1">
              Under Development • Please check back later.
            </p>
          </div>

          {/* Officer Login Button */}
          <div className="pt-4 border-t border-[#2c1d15]">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowLogin(true);
              }}
              className="btn-kingshot-gold w-full py-2.5 text-xs sm:text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Officer Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
