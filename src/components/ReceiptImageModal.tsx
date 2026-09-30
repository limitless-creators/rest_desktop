import { useEffect, useState } from 'react';
import { X, Download, AlertCircle, Loader2, Paperclip } from 'lucide-react';
import { fetchReceiptObjectUrl } from '../lib/b2';
import { Language } from '../types';

interface ReceiptImageModalProps {
  b2Url: string;
  label?: string;
  language: Language;
  onClose: () => void;
}

export default function ReceiptImageModal({ b2Url, label, language, onClose }: ReceiptImageModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setObjectUrl(null);

    fetchReceiptObjectUrl(b2Url)
      .then(url => { if (!cancelled) { setObjectUrl(url); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });

    return () => {
      cancelled = true;
      setObjectUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [b2Url]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = label ? `${label}_comprovativo` : 'comprovativo';
    a.click();
  };

  const handleBackdrop = (e: import('react').MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl flex flex-col gap-3">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/60">
            <Paperclip size={13} />
            <span className="text-xs font-mono">{label ?? 'Comprovativo'}</span>
          </div>
          <div className="flex items-center gap-2">
            {objectUrl && (
              <button
                onClick={handleDownload}
                title={language === 'en' ? 'Download' : 'Descarregar'}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <Download size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              title={language === 'en' ? 'Close' : 'Fechar'}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center bg-black/40 rounded-2xl min-h-64 overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16 text-white/50">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-xs">{language === 'en' ? 'Loading receipt…' : 'A carregar comprovativo…'}</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 py-16 text-red-400">
              <AlertCircle size={28} />
              <p className="text-xs">{language === 'en' ? 'Could not load image' : 'Não foi possível carregar a imagem'}</p>
            </div>
          )}
          {objectUrl && (
            <img
              src={objectUrl}
              alt={label ?? 'Comprovativo'}
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />
          )}
        </div>

      </div>
    </div>
  );
}

// Thumbnail com lazy-load via proxy
interface ReceiptThumbnailProps {
  b2Url: string;
  alt: string;
  onClick: () => void;
}

export function ReceiptThumbnail({ b2Url, alt, onClick }: ReceiptThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReceiptObjectUrl(b2Url)
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => {
      cancelled = true;
      setSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [b2Url]);

  if (err) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-pointer" onClick={onClick}>
        <AlertCircle size={18} />
      </div>
    );
  }
  if (!src) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <Loader2 size={18} className="animate-spin text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    />
  );
}
