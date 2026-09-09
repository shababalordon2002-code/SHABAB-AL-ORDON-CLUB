'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Search, Globe, Flag } from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Team } from '@/types';

export default function EquiposPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTeams(dbStore.getTeams());
  }, []);

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.short_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span>Equipos & Clubes Registrados</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Catálogo de clubes de la Jordan Pro League y competiciones continentales.
        </p>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por equipo..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((t) => (
          <div key={t.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 card-hover-effect">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-xs text-emerald-400 font-mono">
                {t.short_name}
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                {t.country}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-100">{t.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">ID: <code className="text-slate-400 font-mono">{t.id}</code></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
