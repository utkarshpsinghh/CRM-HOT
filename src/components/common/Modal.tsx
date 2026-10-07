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
  position?: 'top' | 'center';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'md',
  position = 'top',
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

  const isTop = position === 'top';

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain animate-fade-in">
      {/* Visual Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity -z-10"
        aria-hidden="true"
      />

      {/* Outer Flex Container for Alignment */}
      <div
        className={clsx(
          'min-h-full flex justify-center p-3 sm:p-4 w-full',
          isTop ? 'items-center sm:items-start sm:pt-8 md:pt-10' : 'items-center'
        )}
        onClick={e => {
          if (e.target === e.currentTarget) {
            sounds.playClick();
            onClose();
          }
        }}
      >
        {/* Modal Dialog */}
        <div
          className={clsx(
            'relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 z-10 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] my-auto sm:my-0',
            maxWidthClasses
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
                {icon || <Shield className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-slate-100 tracking-tight truncate">
                  {title}
                </h3>
                {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 overflow-y-auto space-y-4 text-slate-200 overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
