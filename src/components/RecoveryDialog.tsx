import { useState, type FormEvent } from "react";
import { localClient } from "../lib/localClient";
export default function RecoveryDialog({
  language,
}: {
  language: "pt" | "en";
}) {
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovered, setRecovered] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await localClient.auth.recover({
      email,
      recoveryCode: code,
      newPassword: password,
    });
    setBusy(false);
    if (r.error) setMessage(r.error.message);
    else {
      setRecovered(true);
      setMessage(
        (en
          ? "Keep your NEW recovery code: "
          : "Guarde o NOVO código de recuperação: ") + r.data.recoveryCode,
      );
    }
  }
  return (
    <div className="text-center">
      <button
        type="button"
        className="text-xs text-secondary"
        onClick={() => {
          setOpen(true);
          setMessage("");
          setRecovered(false);
        }}
      >
        {en ? "Recover local account" : "Recuperar conta local"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5">
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 space-y-4 text-left"
          >
            <h2 className="text-lg font-bold">
              {en ? "Recover account" : "Recuperar conta"}
            </h2>
            {!recovered && (
              <>
                <input
                  required
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-slate-800"
                />
                <input
                  required
                  placeholder={en ? "Recovery code" : "Código de recuperação"}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-slate-800"
                />
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder={en ? "New password (8+)" : "Nova senha (8+)"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-slate-800"
                />
                <button
                  disabled={busy}
                  className="px-4 py-2 bg-primary text-white rounded-lg"
                >
                  {en ? "Reset password" : "Redefinir senha"}
                </button>
              </>
            )}
            {message && (
              <p role="status" className="text-sm break-all select-text">
                {message}
              </p>
            )}
            <button
              type="button"
              className="px-4 py-2 text-slate-500"
              onClick={() => setOpen(false)}
            >
              {en ? "Close" : "Fechar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
