import React from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  // When provided, shows a live preview of the actual toggle switch inside
  // the popup itself — the state it will be in once you confirm — so
  // confirming and seeing the result happen in the same place.
  toggleTargetState?: boolean;
  toggleColorClass?: string;
}

// Shared confirmation popup used for team switching and every toggle across
// Settings and Admin — one component so every "are you sure?" in the app
// looks and behaves identically instead of each screen rolling its own.
export default function ConfirmModal({ open, title, message, confirmLabel = 'OK, Confirm', onCancel, onConfirm, toggleTargetState, toggleColorClass }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-[var(--line)] shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h3 className="text-sm font-black text-[var(--navy)]">{title}</h3>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">{message}</p>

        {toggleTargetState !== undefined && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-600">Tap to confirm:</span>
            <button
              onClick={onConfirm}
              className="flex items-center gap-2 cursor-pointer"
              title="Tap the switch to apply this change"
            >
              <span className={`text-[11px] font-black uppercase ${toggleTargetState ? 'text-emerald-600' : 'text-gray-400'}`}>
                {toggleTargetState ? 'ON' : 'OFF'}
              </span>
              <div
                className={`w-10 h-6 rounded-full p-1 flex items-center transition ${
                  toggleTargetState ? `${toggleColorClass || 'bg-blue-600'} justify-end` : 'bg-gray-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-black text-white bg-[var(--blue)] hover:opacity-90 rounded-xl cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
