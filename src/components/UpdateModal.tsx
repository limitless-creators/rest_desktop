import { RefreshCw, Sparkles } from 'lucide-react';
import { Language } from '../types';

interface UpdateModalProps {
  language: Language;
}

export default function UpdateModal({ language }: UpdateModalProps) {
  const pt = language === 'pt';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animation-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm text-center animation-scale-up overflow-hidden">

        {/* Top accent strip */}
        <div className="h-1 w-full bg-primary" />

        <div className="p-8">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-5">
            <Sparkles size={26} className="text-primary" />
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg mb-2">
            {pt ? 'Nova Versão Disponível' : 'New Version Available'}
          </h3>

          {/* Description */}
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-7">
            {pt
              ? 'Uma nova versão da aplicação foi publicada. Recarregue para obter as últimas melhorias, novas funcionalidades e correcções.'
              : 'A new version of the application has been deployed. Reload to get the latest improvements, new features and fixes.'}
          </p>

          {/* Reload button */}
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white font-semibold text-sm py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/20"
          >
            <RefreshCw size={15} />
            {pt ? 'Recarregar Agora' : 'Reload Now'}
          </button>
        </div>

      </div>
    </div>
  );
}
