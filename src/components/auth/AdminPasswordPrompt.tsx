'use client';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Lock } from 'lucide-react';
import { verifyAdminPassword } from '@/lib/supabase/verify-admin';

interface AdminPasswordDialogProps {
  message: string;
  onDone: (ok: boolean) => void;
}

const AdminPasswordDialog: React.FC<AdminPasswordDialogProps> = ({ message, onDone }) => {
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    setError(null);
    const ok = await verifyAdminPassword(password).catch(() => false);
    setChecking(false);
    if (ok) {
      onDone(true);
    } else {
      setError('Contraseña de administrador incorrecta.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Contraseña de administrador</h3>
            <p className="text-xs text-slate-400 mt-0.5">{message}</p>
          </div>
        </div>

        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onDone(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!password || checking}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {checking ? 'Comprobando…' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Asks for the admin password in a modal and resolves true only when it is correct.
 * Used to gate destructive actions (deleting a whole analysis) that any role can reach.
 */
export function requestAdminPassword(
  message = 'Para borrar un análisis completo introduce la contraseña de administrador.'
): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok: boolean) => {
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(<AdminPasswordDialog message={message} onDone={done} />);
  });
}
