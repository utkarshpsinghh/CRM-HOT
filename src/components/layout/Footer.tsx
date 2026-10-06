import React from 'react';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <Shield className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-slate-300">
          HOT Alliance Command Center
        </span>
        <span className="text-slate-600">•</span>
        <span>Kingdom 1391</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-500">Real-time War Management &amp; Attendance</span>
      </div>
    </footer>
  );
};
