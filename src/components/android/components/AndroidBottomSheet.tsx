import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { sounds } from '../../../utils/sound';

interface AndroidBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const AndroidBottomSheet: React.FC<AndroidBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[85vh]',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    sounds.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={handleClose}
      />

      {/* Sheet panel */}
      <div
        className={`relative z-10 w-full bg-[#050811] border-t border-rose-500/40 rounded-t-[32px] shadow-[0_-10px_40px_rgba(225,29,72,0.25)] flex flex-col ${maxHeight} animate-slide-up overflow-hidden pb-safe`}
      >
        {/* Android drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1.5">
          <div className="w-12 h-1 bg-gradient-to-r from-rose-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.5)]" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-rose-500/15 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white tracking-tight uppercase font-mono">{title}</h3>
            {subtitle && <p className="text-xs text-rose-300/80 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-300 hover:text-white active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet Content scrollable area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
