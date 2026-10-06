import React, { useState } from 'react';
import {
  Shield,
  Crown,
  Lock,
  ArrowRight,
  Users,
  Swords,
  Trophy,
  Flame,
} from 'lucide-react';
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
            className="px-3 py-1.5 rounded-xl bg-[#1c130d] hover:bg-[#2c1d15] border border-[#3e2716] text-amber-300 text-xs font-fantasy font-bold uppercase transition-all flex items-center gap-1.5 shadow"
          >
            <span>← Back to Portal Overview</span>
          </button>
        </div>
        <LoginView />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0705] w-full max-w-full selection:bg-[#ca8a04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-amber-600/15 via-red-950/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-[#b45309]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-72 h-72 bg-[#ca8a04]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 animate-fade-in my-8">
        <div className="bg-gradient-to-b from-[#1c130d] to-[#140d09] border-2 border-[#3e2716] hover:border-[#522d14] rounded-3xl shadow-2xl p-6 sm:p-10 backdrop-blur-sm transition-colors text-center space-y-6">
          {/* Alliance Crest */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#ca8a04] to-[#f59e0b] rounded-3xl blur-md opacity-40 group-hover:opacity-70 transition duration-500 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#801418] to-[#450a0a] border-2 border-[#ca8a04] p-3.5 shadow-2xl flex items-center justify-center">
              <img
                src="./favicon.svg"
                alt="HOT Alliance Crest"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/70 text-amber-300 text-xs font-fantasy font-black uppercase tracking-wider shadow-inner">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Portal Under Preparation</span>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <div className="text-xs font-fantasy font-black uppercase tracking-widest text-[#ca8a04]">
              Kingdom #1391 • HOT Alliance
            </div>
            <h1 className="font-fantasy font-black text-2xl sm:text-4xl text-[#fef08a] uppercase tracking-wide leading-tight">
              War Portal Coming Soon
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed">
              We are currently preparing the official war room and battle attendance portal for Kingdom #1391 [HOT] Alliance. 
              Full access will open once final battle drills are complete.
            </p>
          </div>

          {/* Feature Highlights (Gamer-facing, non-technical) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-2xl bg-[#120c08] border border-[#3e2716] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Swords className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-fantasy font-bold text-stone-200 uppercase">Bear Trap &amp; War Battles</h2>
                <p className="text-[11px] text-stone-400 mt-0.5">Rally schedules, attendance check-ins, and mandatory battle calls.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#120c08] border border-[#3e2716] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-fantasy font-bold text-stone-200 uppercase">Alliance Roster &amp; Ranks</h2>
                <p className="text-[11px] text-stone-400 mt-0.5">Complete roster directory from R1 warriors to R5 alliance leadership.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#120c08] border border-[#3e2716] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-fantasy font-bold text-stone-200 uppercase">War Leaderboards</h2>
                <p className="text-[11px] text-stone-400 mt-0.5">Monthly and all-time rankings honoring our most active warriors.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#120c08] border border-[#3e2716] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-fantasy font-bold text-stone-200 uppercase">Alliance Readiness</h2>
                <p className="text-[11px] text-stone-400 mt-0.5">Strike tracking, war participation records, and member activity.</p>
              </div>
            </div>
          </div>

          {/* Action Area: Officer Access */}
          <div className="pt-4 border-t border-[#2c1d15] space-y-3">
            <p className="text-xs text-stone-400">
              Alliance Officers and Leaders:
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowLogin(true);
                }}
                className="btn-kingshot-gold px-6 py-2.5 text-xs sm:text-sm font-fantasy font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                <Lock className="w-4 h-4" />
                <span>Officer Sign-In</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2 text-[11px] text-stone-500 font-mono flex items-center justify-center gap-2">
            <span>Strength Through Unity</span>
            <span>•</span>
            <span>Kingdom #1391 [HOT]</span>
          </div>
        </div>
      </div>
    </div>
  );
};
