'use client';

import React from 'react';
import { FileText, Lock } from 'lucide-react';
import Link from 'next/link';

export default function InformesPage() {
  return (
    <div className="p-6 sm:p-12 max-w-xl mx-auto text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
        <FileText className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-extrabold text-white">Informes Técnicos de Partido</h1>
        <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
          Módulo de Exportación PDF & Reportes
        </p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Generador automático de informes post-partido para el cuerpo técnico de Shabab Al Ordon Club basado en el modelo normalizado de eventos.
      </p>

      <div className="pt-4">
        <Link
          href="/partidos"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
        >
          <span>Ver Partidos Disponibles</span>
        </Link>
      </div>
    </div>
  );
}
