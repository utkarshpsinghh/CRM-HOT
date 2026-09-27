import React from 'react';
import { Castle, RefreshCw, Database } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  isSheetsSync?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading Alliance Records...',
  subMessage = 'Fetching members, war events, and attendance telemetry...',
  isSheetsSync = false,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl bg-[#241710] border-2 border-[#6d3e1d] shadow-2xl relative overflow-hidden">
        {/* Subtle ambient amber pulse behind crest */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Animated Emblem */}
        <div className="relative inline-block">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-b from-[#78350f] via-[#522509] to-[#331405] border-2 border-[#fbbf24] flex items-center justify-center shadow-lg">
            {isSheetsSync ? (
              <Database className="w-9 h-9 text-[#fbbf24] animate-pulse" />
            ) : (
              <Castle className="w-9 h-9 text-[#fbbf24] animate-bounce" style={{ animationDuration: '2s' }} />
            )}
          </div>
          {/* Circular spinning ring */}
          <div className="absolute -inset-2 border-2 border-dashed border-[#fbbf24]/50 rounded-3xl animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* Text */}
        <div className="space-y-1.5 relative z-10">
          <h3 className="text-lg sm:text-xl font-bold text-[#fffbeb] tracking-wide">
            {message}
          </h3>
          <p className="text-xs text-amber-200/80 leading-relaxed font-sans max-w-xs mx-auto">
            {subMessage}
          </p>
        </div>

        {/* Progress bar animation */}
        <div className="w-full bg-[#170a04] h-2 rounded-full overflow-hidden border border-[#522509] p-0.5">
          <div className="h-full bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#fef08a] rounded-full animate-pulse w-3/4" />
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400 font-mono">
          <RefreshCw className="w-3 h-3 animate-spin text-[#fbbf24]" />
          <span>Synchronizing with Google Sheets</span>
        </div>
      </div>
    </div>
  );
};
