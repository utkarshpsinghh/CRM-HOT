import React from 'react';
import { Castle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t-[3px] border-[#381c0c] bg-[#0c0704] py-4 px-4 text-center text-xs shadow-inner">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <Castle className="w-4 h-4 text-[#fde047]" />
        <span className="font-fantasy font-black text-amber-200 uppercase tracking-wider game-text-shadow">
          HOT ALLIANCE COMMAND CENTER
        </span>
        <span className="text-stone-600">•</span>
        <span className="font-medium text-amber-300/70">&quot;Strength Through Unity • Kingdom 1391&quot;</span>
      </div>
    </footer>
  );
};
