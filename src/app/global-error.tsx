'use client';

import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 antialiased">
        <div className="p-8 text-center space-y-4 max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-white">Error Global en la Plataforma</h2>
            <p className="text-xs text-slate-400">
              {error.message || 'Error crítico de inicialización capturado.'}
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reiniciar Plataforma</span>
          </button>
        </div>
      </body>
    </html>
  );
}
