import React from 'react';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#2c1d15] bg-[#100b08] py-4 px-4 text-center text-xs text-stone-500">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <Shield className="w-4 h-4 text-[#eab308]" />
        <span className="font-fantasy font-bold text-stone-300 tracking-wide">
          HOT ALLIANCE COMMAND CENTER
        </span>
        <span className="text-stone-600">•</span>
        <span className="italic text-stone-400">&quot;Strength Through Unity&quot;</span>
      </div>
    </footer>
  );
};
