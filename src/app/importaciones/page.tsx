'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  ShieldCheck,
  Search
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { ImportLog } from '@/types';

export default function ImportacionesPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLogs(dbStore.getImportLogs());
  }, []);

  const filteredLogs = logs.filter(l =>
    l.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.match_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <span>Historial de Importaciones & Logs XML</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditoría de archivos XML procesados, verificación de hashes anti-duplicados, número de eventos y registro de avisos.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por archivo, partido o estado..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Archivo XML</th>
                <th className="py-3 px-4">Partido Vinculado</th>
                <th className="py-3 px-4 text-center">Eventos</th>
                <th className="py-3 px-4 font-mono text-[10px]">Hash SHA-256</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Avisos / Errores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(log.imported_at).toLocaleString('es-ES')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{log.file_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{log.user_name}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {log.match_title}
                  </td>
                  <td className="py-3 px-4 text-center font-bold font-mono text-emerald-400">
                    {log.event_count} ev.
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                    {log.file_hash.substring(0, 14)}...
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      log.status === 'Completado'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : log.status === 'Completado con avisos'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-[11px]">
                    {log.warnings.length > 0 ? (
                      <span className="text-amber-400 font-medium">{log.warnings.length} aviso(s)</span>
                    ) : log.errors.length > 0 ? (
                      <span className="text-red-400 font-medium">{log.errors.length} error(es)</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Sin incidencias</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
