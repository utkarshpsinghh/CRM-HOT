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
      {/* Quick Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            sounds.playClick();
            onOpenCreateEvent();
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/40 text-left space-y-2 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-white">Create Battle</div>
            <div className="text-[10px] text-slate-400">Schedule Bear Trap / War</div>
          </div>
        </button>

        <button
          onClick={handleManualSync}
          disabled={triggeringScheduler || isSyncing}
          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
            <RefreshCw className={`w-5 h-5 ${triggeringScheduler || isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="font-extrabold text-xs text-white">Cloud Sync</div>
            <div className="text-[10px] text-slate-400">Reconcile Supabase ledger</div>
          </div>
        </button>
      </div>

      {/* Discord Bot Real-time Status Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">Discord Bot Integration</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected & Listening for Votes
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono font-bold">
          17 Slash Cmds
        </span>
      </div>

      {/* Inactivity Radar Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Inactivity Radar
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {inactiveInsights.length} flagged
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20">
            <div className="text-base font-black text-amber-400">{warningCount}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">Warning (3d+)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-orange-500/20">
            <div className="text-base font-black text-orange-400">{inactiveCount}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">Inactive (7d+)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30">
            <div className="text-base font-black text-rose-400">{criticalCount}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">Critical (14d+)</div>
          </div>
        </div>
      </div>

      {/* Flagged Members Quick List */}
      {criticalCount > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Urgent Action Needed
          </h4>
          <div className="space-y-1.5">
            {inactiveInsights
              .filter(i => i.tier === 'Critical')
              .slice(0, 5)
              .map(item => (
                <div
                  key={item.member.id}
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">{item.member.name}</div>
                    <div className="text-[10px] text-rose-300 font-mono">
                      Offline for {item.daysInactive} days • Strikes: {item.member.strikes || 0}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
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
