import { useEffect, useState } from "react";
import { localClient } from "../lib/localClient";
export default function DesktopSettings({
  language,
}: {
  language: "pt" | "en";
}) {
  const en = language === "en";
  const [info, setInfo] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  useEffect(() => {
    window.restDesktop
      .info()
      .then(setInfo)
      .catch((e) => setMessage(e.message));
  }, []);
  async function run(task: () => Promise<any>) {
    setBusy(true);
    setMessage("");
    try {
      const result = await task();
      if (!result?.canceled)
        setMessage(
          result?.path
            ? (en ? "Saved: " : "Guardado: ") + result.path
            : en
              ? "Completed."
              : "Concluído.",
        );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword() {
    setBusy(true);
    const result = await localClient.auth.changePassword({
      currentPassword: oldPassword,
      newPassword,
    });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else
      window.alert(
        (en
          ? "New recovery code — keep it safe: "
          : "Novo código de recuperação — guarde-o: ") +
          result.data.recoveryCode,
      );
  }
  const button =
    "px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50";
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <h3 className="font-bold text-lg">REST Desktop · Limitless, Lda</h3>
      <p className="mt-2 text-sm text-slate-500">
        {en
          ? "Your business data stays on this computer. Automatic daily backups run while the app is open (14 retained). Keep an external copy."
          : "Os dados ficam neste computador. Cópias diárias automáticas com a aplicação aberta (14 conservadas). Guarde também uma cópia num disco externo."}
      </p>
      {info && (
        <p className="mt-2 text-xs break-all text-slate-400">{info.path}</p>
      )}
      <div className="flex flex-wrap gap-3 mt-4">
        <>
            <button
              disabled={busy}
              className={button}
              onClick={() => run(() => window.restDesktop.rootExport())}
            >
              {en ? "Create root backup" : "Criar backup root"}
            </button>
            <button
              disabled={busy}
              className={button}
              onClick={() => run(() => window.restDesktop.rootRestore())}
            >
              {en ? "Restore backup" : "Restaurar cópia de segurança"}
            </button>
          </>
        <button
          disabled={busy}
          className={button}
          onClick={() => run(() => window.restDesktop.importData())}
        >
          {en ? "Import data (JSON)" : "Importar dados (JSON)"}
        </button>
      </div>
      <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-5">
        <h4 className="font-bold">{en ? 'Sync files' : 'Arquivos de sincronização'}</h4>
        <p className="mt-2 text-sm text-slate-500">{en ? 'Exchange data and attachments with a paired phone. Import the reply on the phone to confirm changes.' : 'Troque dados e anexos com um celular emparelhado. Importe a resposta no celular para confirmar as alterações.'}</p>
        <div className="flex flex-wrap gap-3 mt-3">
          <button disabled={busy} className={button} onClick={() => run(() => window.restDesktop.devices())}>{en ? 'Manage phones' : 'Gerir celulares'}</button>
          <button disabled={busy} className={button} onClick={() => run(() => window.restDesktop.syncExport())}>{en ? 'Export sync file' : 'Exportar sincronização'}</button>
          <button disabled={busy} className={button} onClick={() => run(() => window.restDesktop.syncImport())}>{en ? 'Import sync file' : 'Importar sincronização'}</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-5">
        <input
          type="password"
          autoComplete="current-password"
          placeholder={en ? "Current password" : "Senha actual"}
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          className="p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder={en ? "New password (8+)" : "Nova senha (8+)"}
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className="p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700 text-sm"
        />
        <button
          className={button}
          disabled={busy || newPassword.length < 8 || !oldPassword}
          onClick={changePassword}
        >
          {en ? "Change password" : "Alterar senha"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-emerald-600">
          {message}
        </p>
      )}
    </section>
  );
}
