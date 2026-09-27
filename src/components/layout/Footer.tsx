import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#3b301c] bg-[#090b11] py-6 px-4 text-center text-xs text-stone-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#eab308]" />
          <span className="font-fantasy font-bold text-stone-300 tracking-wide">
            HOT ALLIANCE COMMAND CENTER
          </span>
          <span className="text-stone-600">•</span>
          <span className="italic text-stone-400">&quot;Strength Through Unity&quot;</span>
        </div>

        <div className="flex items-center gap-2 text-stone-400">
          <Sparkles className="w-3.5 h-3.5 text-[#ca8a04]" />
          <span>Kingshot War Management System • Google Sheets Powered</span>
        </div>
      </div>
    </footer>
  );
};
