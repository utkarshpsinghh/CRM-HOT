import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Shield } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        sounds.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          sounds.playClick();
          onClose();
        }}
      />

      {/* Modal Dialog */}
      <div
        className={clsx(
          'relative w-full rounded-xl bg-gradient-to-b from-[#1c2130] via-[#141824] to-[#0c0e17] border-2 border-[#ca8a04] shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(202,138,4,0.25)] z-10 overflow-hidden my-8',
          maxWidthClasses
        )}
      >
        {/* Ornate Gold Filigree Corners */}
        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#fef08a] pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#fef08a] pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#fef08a] pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#fef08a] pointer-events-none" />

        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#2a1719] via-[#1f2438] to-[#171b29] border-b border-[#524126] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded bg-[#991b1b]/40 border border-[#ca8a04]/50 text-[#fef08a] shrink-0">
              {icon || <Shield className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-fantasy font-bold text-base sm:text-lg text-[#fef08a] tracking-wide truncate">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-stone-400 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-[#fef08a] hover:bg-stone-800/80 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
