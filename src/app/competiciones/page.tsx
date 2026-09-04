'use client';

import React, { useEffect, useState } from 'react';
import { Award, Search, Calendar, Globe } from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Competition } from '@/types';

export default function CompeticionesPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    setCompetitions(dbStore.getCompetitions());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Competiciones & Torneos</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Registro oficial de ligas y copas procesadas en la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {competitions.map((c) => (
          <div key={c.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 card-hover-effect">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                {c.type}
              </span>
              <span className="text-[11px] font-mono text-slate-400">{c.season}</span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-100">{c.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.country}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
