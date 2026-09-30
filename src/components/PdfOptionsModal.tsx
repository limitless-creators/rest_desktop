import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Stamp, Percent } from 'lucide-react';
import { Language } from '../types';

export interface PdfOptions {
  includeStamp: boolean;
  taxType: 'none' | 'iva' | 'ispc';
}

interface PdfOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: PdfOptions) => void;
  language: Language;
  hasStamp: boolean;
}

export default function PdfOptionsModal({ isOpen, onClose, onGenerate, language, hasStamp }: PdfOptionsModalProps) {
  const [includeStamp, setIncludeStamp] = useState(true);
  const [taxType, setTaxType] = useState<'none' | 'iva' | 'ispc'>('ispc');

  if (!isOpen) return null;

  const pt = language !== 'en';

  const taxOptions: { value: 'none' | 'iva' | 'ispc'; label: string; desc: string }[] = [
    {
      value: 'none',
      label: pt ? 'Sem imposto' : 'No tax',
      desc: pt ? 'Documento isento de tributação' : 'Document exempt from taxation',
    },
    {
      value: 'iva',
      label: pt ? 'IVA — 16%' : 'VAT — 16%',
      desc: pt ? '16% sobre o subtotal (não acumula com ISPC)' : '16% on subtotal (cannot combine with ISPC)',
    },
    {
      value: 'ispc',
      label: pt ? 'ISPC — 3%' : 'ISPC — 3%',
      desc: pt ? '3% sobre o subtotal, Lei 5/2009' : '3% on subtotal, Law 5/2009',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {pt ? 'Opções de Geração do PDF' : 'PDF Generation Options'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Stamp checkbox — only show if company has a stamp configured */}
          {hasStamp && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Stamp size={11} />
                {pt ? 'Carimbo' : 'Stamp'}
              </p>
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="checkbox"
                  checked={includeStamp}
                  onChange={e => setIncludeStamp(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {pt ? 'Incluir carimbo e assinatura no PDF' : 'Include stamp & signature in PDF'}
                </span>
              </label>
            </div>
          )}

          {/* Tax type — radio buttons, mutually exclusive */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Percent size={11} />
              {pt ? 'Imposto / Taxa' : 'Tax / Levy'}
            </p>
            <div className="space-y-1.5">
              {taxOptions.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    taxType === opt.value
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="taxType"
                    value={opt.value}
                    checked={taxType === opt.value}
                    onChange={() => setTaxType(opt.value)}
                    className="w-4 h-4 accent-primary mt-0.5"
                  />
                  <div>
                    <p className={`text-sm font-semibold ${taxType === opt.value ? 'text-primary dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {pt ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={() => { onGenerate({ includeStamp, taxType }); onClose(); }}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1.5 transition-opacity"
          >
            <Download size={13} />
            {pt ? 'Gerar PDF' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
