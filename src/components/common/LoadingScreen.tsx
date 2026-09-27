import React from 'react';
import { Castle } from 'lucide-react';

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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#78350f] via-[#522509] to-[#331405] border-2 border-[#fbbf24] flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.25)]">
            <Castle className="w-8 h-8 text-[#fbbf24] animate-pulse" />
          </div>
          {/* Subtle spinning gold ring */}
          <div
            className="absolute -inset-1.5 border-2 border-dashed border-[#fbbf24]/40 rounded-3xl animate-spin"
            style={{ animationDuration: '6s' }}
          />
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-[#fffbeb] tracking-wide">
            {message}
          </h3>
          {subMessage && (
            <p className="text-xs text-amber-200/70 font-sans">
              {subMessage}
            </p>
          )}
        </div>

        {/* Minimal sleek loader line */}
        <div className="w-44 bg-[#1f130b] h-1.5 rounded-full overflow-hidden border border-[#522509]/60 p-0.5">
          <div className="h-full bg-gradient-to-r from-[#d97706] to-[#fbbf24] rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
};
