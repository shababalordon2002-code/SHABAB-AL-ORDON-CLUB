'use client';

import React from 'react';
import { BarChart3, Lock, ShieldCheck, Database } from 'lucide-react';
import Link from 'next/link';

export default function DashboardsPage() {
  return (
    <div className="p-12 max-w-xl mx-auto text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
        <BarChart3 className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-extrabold text-white">Módulo de Dashboards & Visualizaciones</h1>
        <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
          Reservado para la Fase 2 (Analytics Engine)
        </p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Los datos importados actualmente desde LongoMatch XML se están guardando de forma estructurada en el modelo normalizado (<code className="text-emerald-400 font-mono">NormalizedEvent</code>). En la Fase 2 utilizaremos esta base sólida para construir campogramas, mapas de tiros, heatmaps y redes de pases.
      </p>

      <div className="pt-4">
        <Link
          href="/importar-xml"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          <span>Ir a Importar XML</span>
        </Link>
      </div>
    </div>
  );
}
