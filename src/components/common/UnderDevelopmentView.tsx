import React, { useState } from 'react';
import { Lock, ArrowRight, Castle, ShieldAlert } from 'lucide-react';
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
            className="btn-kingshot-cream px-3.5 py-1.5 text-xs font-fantasy font-black uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>← Back to Gate</span>
          </button>
        </div>
        <LoginView />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0805] w-full max-w-full selection:bg-[#ca8a04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-amber-500/20 via-red-950/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-pop-in text-center">
        <div className="bg-gradient-to-b from-[#24170f] via-[#1a110a] to-[#120b06] border-[3.5px] border-[#ca8a04] rounded-3xl p-8 sm:p-10 shadow-[0_8px_0_#451a03,0_16px_36px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
          
          {/* Top Gold Accent Rim */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

          {/* Alliance Crest Medallion */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#f59e0b] via-[#b45309] to-[#78350f] p-0.5 border-2 border-[#fef08a] shadow-[0_4px_0_#451a03] flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#881337] to-[#4c0519] flex items-center justify-center">
                <Castle className="w-10 h-10 text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="text-[11px] font-fantasy font-black uppercase tracking-widest text-[#facc15] gold-text-glow">
              👑 HOT ALLIANCE • K1391
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-3xl text-[#fffbeb] uppercase tracking-wide game-text-shadow">
              Fortress Under Maintenance
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/80 font-medium max-w-sm mx-auto leading-relaxed pt-1">
              The war council is currently fortifying battle records and troop alignments for the next campaign.
            </p>
          </div>

          {/* Officer Login Button */}
          <div className="pt-4 border-t-2 border-[#2c1d15]">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowLogin(true);
              }}
              className="btn-kingshot-gold w-full py-3 text-xs sm:text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xl"
            >
              <Lock className="w-4 h-4 text-black" />
              <span>Officer Portal Access</span>
              <ArrowRight className="w-4 h-4 text-black stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
