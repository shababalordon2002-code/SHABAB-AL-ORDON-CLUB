'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  PlayCircle,
  Eye,
  FileCode2,
  Calendar,
  User,
  Plus,
  Video,
  Trash2,
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';
import { Match, MatchAnalysis } from '@/types';

interface MatchAnalysisSelectorModalProps {
  match: Match;
  analyses: MatchAnalysis[];
  onClose: () => void;
  onSelectVisor: (analysis: MatchAnalysis) => void;
  onDeleteAnalysis?: (analysisId: string) => void;
}

export const MatchAnalysisSelectorModal: React.FC<MatchAnalysisSelectorModalProps> = ({
  match,
  analyses,
  onClose,
  onSelectVisor,
  onDeleteAnalysis,
}) => {
  const router = useRouter();

  const isShababHome = match.home_team.toLowerCase().includes('shabab') || match.home_team.toLowerCase().includes('ordon');
  const isShababAway = match.away_team.toLowerCase().includes('shabab') || match.away_team.toLowerCase().includes('ordon');

  const handleCreateNew = () => {
    router.push(`/botonera?match_id=${match.id}&mode=tag`);
    onClose();
  };

  const handleOpenBotoneraTag = (analysisId: string) => {
    router.push(`/botonera?match_id=${match.id}&analysis_id=${analysisId}&mode=tag`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{match.date}</span>
              <span>·</span>
              <span className="truncate">{match.competition}</span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-white truncate flex items-center gap-2">
              <img
                src={isShababHome ? '/logo.png' : (match.home_team_logo || '/logo.png')}
                alt=""
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target) target.src = '/logo.png';
                }}
              />
              <span>{match.home_team}</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono text-xs border border-slate-800 font-bold">
                {match.status === 'Finalizado' ? `${match.home_score} - ${match.away_score}` : 'vs'}
              </span>
              <span>{match.away_team}</span>
              <img
                src={isShababAway ? '/logo.png' : (match.away_team_logo || '/logo.png')}
                alt=""
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target) target.src = '/logo.png';
                }}
              />
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Single Collaborative Match Analysis */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>Análisis Maestro del Partido</span>
            </span>
          </div>

          {analyses.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
              <Database className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                No hay eventos o análisis registrados aún para este partido. Varios analistas pueden etiquetar simultáneamente.
              </p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Iniciar Etiquetado Colaborativo en Botonera</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((an) => {
                const evtCount = an.events?.length || 0;
                const dateStr = an.created_at
                  ? new Date(an.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Sin fecha';

                const hasVideo = !!(an.video_url || match.video_url);

                return (
                  <div
                    key={an.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Análisis Único Colaborativo
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {an.title || `Análisis ${match.home_team} vs ${match.away_team}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>Analistas: {an.analyst_name || 'Analista SAO'}</span>
                          </span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">{dateStr}</span>
                          <span>·</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold">
                            {evtCount} eventos registrados
                          </span>
                          {hasVideo && (
                            <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 text-[10px] font-semibold flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              <span>Vídeo Vinculado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            onSelectVisor(an);
                            onClose();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 stroke-[2.5]" />
                          <span>Abrir Visor</span>
                        </button>

                        <button
                          onClick={() => handleOpenBotoneraTag(an.id)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                          title="Abrir en Botonera para etiquetar en directo"
                        >
                          <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Etiquetar en Directo</span>
                        </button>

                        {onDeleteAnalysis && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Seguro que deseas reiniciar el análisis de "${match.home_team} vs ${match.away_team}"?`)) {
                                onDeleteAnalysis(an.id);
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition cursor-pointer"
                            title="Reiniciar análisis"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">
            Cada partido tiene un único análisis maestro compartido. Todos los analistas aportan eventos al mismo panel en tiempo real.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
