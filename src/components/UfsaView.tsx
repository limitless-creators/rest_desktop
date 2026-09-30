import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw, WifiOff } from 'lucide-react';

export default function UfsaView() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline' | 'unavailable'>('checking');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const generation = useRef(0);
  const running = useRef(false);
  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const request = generation.current;
    setBusy(true);
    try {
      const result = navigator.onLine ? await window.restDesktop.ufsaStatus() : 'offline';
      if (active.current && request === generation.current) setStatus(result);
    } catch {
      if (active.current && request === generation.current) setStatus('offline');
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    const offline = () => { generation.current++; setStatus('offline'); };
    const failed = () => { generation.current++; setStatus(navigator.onLine ? 'unavailable' : 'offline'); };
    const unsubscribe = window.restDesktop.onUfsaFailure(failed);
    window.addEventListener('offline', offline);
    window.addEventListener('online', check);
    void check();
    const timer = window.setInterval(check, 30000);
    return () => {
      active.current = false;
      generation.current++;
      window.clearInterval(timer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', check);
      unsubscribe();
    };
  }, [check]);

  if (status === 'ready') return (
    <iframe src="https://www.ufsa.gov.mz/" title="UFSA – Concursos Públicos"
      className="w-full flex-1 border-0 bg-white" style={{ minHeight: 0 }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" />
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div role="status" aria-live="polite" className="w-full max-w-[448px] text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {status === 'checking' ? <LoaderCircle size={28} className="animate-spin" /> : <WifiOff size={28} />}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {status === 'checking' ? 'A ligar ao UFSA' : status === 'offline' ? 'É necessária uma ligação à internet' : 'Não foi possível abrir o UFSA'}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {status === 'checking' ? 'A verificar o acesso aos anúncios e concursos públicos.' :
            status === 'offline' ? 'Para ver os anúncios e concursos públicos do UFSA, ligue o computador à internet e tente novamente.' :
            'Verifique a ligação à internet e tente novamente. O portal UFSA também pode estar temporariamente indisponível.'}
        </p>
        {status !== 'checking' && <button onClick={check} disabled={busy}
          className="mx-auto mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'A verificar...' : 'Tentar novamente'}
        </button>}
      </div>
    </div>
  );
}
