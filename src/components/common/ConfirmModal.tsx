import React from 'react';
import { Modal } from './Modal';
import { GameButton } from './GameButton';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'crimson' | 'gold' | 'emerald';
  position?: 'top' | 'center';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'crimson',
  position = 'top',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
      maxWidth="sm"
      position={position}
    >
      <div className="space-y-5">
        <div className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <GameButton variant="slate" size="md" onClick={onClose}>
            {cancelLabel}
          </GameButton>
          <GameButton
            variant={variant}
            size="md"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </GameButton>
        </div>
      </div>
    </Modal>
  );
};
