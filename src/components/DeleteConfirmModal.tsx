import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Language } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: Language;
  documentLabel: string;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, language, documentLabel }: DeleteConfirmModalProps) {
  if (!isOpen) return null;
  const pt = language !== 'en';

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            <h2 className="text-sm font-bold">{pt ? 'Eliminar Documento' : 'Delete Document'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {pt ? (
              <>O documento <span className="font-bold text-slate-900 dark:text-white">{documentLabel}</span> será eliminado permanentemente da base de dados.</>
            ) : (
              <>Document <span className="font-bold text-slate-900 dark:text-white">{documentLabel}</span> will be permanently deleted from the database.</>
            )}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
            {pt ? 'Esta acção não pode ser revertida.' : 'This action cannot be undone.'}
          </p>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {pt ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            {pt ? 'Eliminar' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
