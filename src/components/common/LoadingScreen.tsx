import React from 'react';
import { Shield } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  isSheetsSync?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  subMessage,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-xs w-full flex flex-col items-center">
        {/* Subtle glowing alliance crest */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Shield className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
          {/* Subtle spinning accent ring */}
          <div
            className="absolute -inset-1 border border-dashed border-amber-400/40 rounded-2xl animate-spin"
            style={{ animationDuration: '4s' }}
          />
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-semibold text-slate-100 tracking-tight">
            {message}
          </h3>
          {subMessage && (
            <p className="text-xs text-slate-400">
              {subMessage}
            </p>
          )}
        </div>

        {/* Sleek loader bar */}
        <div className="w-36 bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
};
