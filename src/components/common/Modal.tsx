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
          'relative w-full rounded-2xl bg-[#1c140e] border-2 border-[#522d14] shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_15px_rgba(202,138,4,0.15)] z-10 overflow-hidden my-8',
          maxWidthClasses
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#2c190e] via-[#24160f] to-[#1c130d] border-b border-[#3e2716] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-[#522d14]/40 border border-[#ca8a04]/40 text-[#fef08a] shrink-0">
              {icon || <Shield className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-fantasy font-black text-base sm:text-lg text-[#fef08a] tracking-wide truncate">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-stone-400 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-[#fef08a] hover:bg-stone-800/50 transition-colors cursor-pointer shrink-0"
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

