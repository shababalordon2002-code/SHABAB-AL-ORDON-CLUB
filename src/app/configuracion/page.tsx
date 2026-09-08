'use client';

import React from 'react';
import { Settings, ShieldCheck, Database, Layers, CheckCircle2 } from 'lucide-react';
import { useRequireRole } from '@/components/providers/AuthProvider';

export default function ConfiguracionPage() {
  const { allowed, loading } = useRequireRole(['admin', 'analyst']);

  if (loading || !allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">
        {loading ? 'Comprobando sesión…' : 'Acceso restringido. Redirigiendo…'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Configuración del Sistema</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Parámetros de la plataforma de análisis para Shabab Al Ordon Club y fuentes de datos.
        </p>
      </div>

      <div className="space-y-4">
        {/* Card 1: Club Settings */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Organización & Club</h3>
              <p className="text-xs text-slate-400">Shabab Al Ordon Club (Jordania)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Nombre del Club</label>
              <input
                type="text"
                readOnly
                value="Shabab Al Ordon Club"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">País / Federación</label>
              <input
                type="text"
                readOnly
                value="Jordania (JFA)"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Parser & Data Sources */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Fuentes de Datos & Parsers</h3>
              <p className="text-xs text-slate-400">Normalización universal multicapa</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">LongoMatch XML Ingestion Parser</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                ACTIVO
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Opta / StatsBomb / Wyscout Parsers</span>
              </div>
              <span className="text-[10px] font-mono">Preparado para Fase Futura</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
