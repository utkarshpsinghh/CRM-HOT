import React, { useState } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { useAuth } from '../../../context/AuthContext';
import { Zap, Clock, AlertTriangle, Shield, CheckCircle2, RefreshCw, Flame, Bot, UserX, Plus } from 'lucide-react';
import { sounds } from '../../../utils/sound';

interface AndroidOfficerOpsViewProps {
  onOpenCreateEvent: () => void;
  onOpenAddStrikePrompt: () => void;
}

export const AndroidOfficerOpsView: React.FC<AndroidOfficerOpsViewProps> = ({
  onOpenCreateEvent,
  onOpenAddStrikePrompt,
}) => {
  const { inactiveInsights, refreshData, isSyncing } = useCRM();
  const { isMainAdmin, isAuthenticated } = useAuth();
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);

  const handleManualSync = async () => {
    sounds.playClick();
    setTriggeringScheduler(true);
    await refreshData();
    sounds.playSuccess();
    setTriggeringScheduler(false);
  };

  const warningCount = inactiveInsights.filter(i => i.tier === 'Warning').length;
  const inactiveCount = inactiveInsights.filter(i => i.tier === 'Inactive').length;
  const criticalCount = inactiveInsights.filter(i => i.tier === 'Critical').length;

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* Quick Action Buttons Grid - Tactical Deck */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            sounds.playClick();
            onOpenCreateEvent();
          }}
          className="p-4 rounded-3xl bg-gradient-to-br from-rose-950/80 via-[#0a0714] to-[#04060e] border border-rose-500/50 text-left space-y-2.5 active:scale-95 transition-all cursor-pointer shadow-[0_4px_25px_rgba(225,29,72,0.3)] android-pulse-crimson"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300">
            <Flame className="w-5 h-5 fill-rose-400" />
          </div>
          <div>
            <div className="font-black text-xs text-white uppercase font-mono tracking-wider">Deploy Battle</div>
            <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">Schedule Bear Trap / War</div>
          </div>
        </button>

        <button
          onClick={handleManualSync}
          disabled={triggeringScheduler || isSyncing}
          className="p-4 rounded-3xl bg-gradient-to-br from-[#061524] via-[#080d1e] to-[#04060e] border border-cyan-500/40 text-left space-y-2.5 active:scale-95 transition-all cursor-pointer shadow-[0_4px_25px_rgba(6,182,212,0.25)] disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
            <RefreshCw className={`w-5 h-5 ${triggeringScheduler || isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          </div>
          <div>
            <div className="font-black text-xs text-white uppercase font-mono tracking-wider">Sync Matrix</div>
            <div className="text-[10px] text-cyan-300/80 font-mono mt-0.5">Cloud Database Reconcile</div>
          </div>
        </button>
      </div>

      {/* Discord Bot Real-time Radar Card */}
      <div className="p-4 rounded-3xl bg-[#060914]/90 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-xs text-white uppercase font-mono tracking-wider">Discord Bot Grid</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-0.5 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ONLINE // VOTES MONITORED
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-mono font-black">
          17 CMDS
        </span>
      </div>

      {/* Inactivity Threat Radar Card */}
      <div className="p-4 rounded-3xl bg-[#060914]/90 border border-rose-500/25 space-y-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose-400" />
            <h3 className="font-black text-xs text-white uppercase tracking-widest font-mono">
              Inactivity Threat Radar
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30">
            {inactiveInsights.length} FLAGGED
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
          <div className="p-2.5 rounded-2xl bg-[#090d1c] border border-amber-500/30">
            <div className="text-lg font-black text-amber-400">{warningCount}</div>
            <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">Warning (3d+)</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#090d1c] border border-orange-500/30">
            <div className="text-lg font-black text-orange-400">{inactiveCount}</div>
            <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">Inactive (7d+)</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#090d1c] border border-rose-500/50 shadow-[0_0_12px_rgba(225,29,72,0.2)]">
            <div className="text-lg font-black text-rose-400">{criticalCount}</div>
            <div className="text-[9px] text-rose-300 font-mono uppercase tracking-wider mt-0.5">Critical (14d+)</div>
          </div>
        </div>
      </div>

      {/* Flagged Members Quick List */}
      {criticalCount > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-black text-rose-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Immediate Action Required
          </h4>
          <div className="space-y-2">
            {inactiveInsights
              .filter(i => i.tier === 'Critical')
              .slice(0, 5)
              .map(item => (
                <div
                  key={item.member.id}
                  className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-2 shadow-[0_2px_15px_rgba(225,29,72,0.1)]"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate font-sans">{item.member.name}</div>
                    <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">
                      Inactive {item.daysInactive}d • Strikes: {item.member.strikes || 0}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                    Review
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
