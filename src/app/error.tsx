'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Error Captured:', error);
  }, [error]);

  return (
    <div className="p-12 text-center space-y-4 max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-extrabold text-white">Error de Ejecución Capturado</h2>
        <p className="text-xs text-slate-400">
          {error.message || 'Se produjo un problema temporal al renderizar el componente.'}
        </p>
      </div>

      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Reintentar Carga</span>
      </button>
    </div>
  );
}
