'use client';

import React, { useState } from 'react';
import {
  Video,
  Link2,
  Ban,
  Trophy,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UploadCloud,
  FolderOpen,
  Calendar,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Match, BotoneraTemplate, BotoneraProjectVideoType } from '@/types';

interface BotoneraSetupWizardProps {
  matches: Match[];
  templates: BotoneraTemplate[];
  onDeleteTemplate?: (templateId: string) => void;
  onCancel?: () => void;
  onComplete: (config: {
    videoType: BotoneraProjectVideoType;
    videoSourceName: string | null;
    videoUrl: string | null;
    videoFile: File | null;
    matchId: string;
    templateId: string;
  }) => void;
}

const STEPS = [
  { id: 1, label: 'Tipo de Proyecto' },
  { id: 2, label: 'Partido' },
  { id: 3, label: 'Botonera' },
];

export const BotoneraSetupWizard: React.FC<BotoneraSetupWizardProps> = ({
  matches,
  templates,
  onDeleteTemplate,
  onCancel,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);

  const [videoType, setVideoType] = useState<BotoneraProjectVideoType | null>('none');
  const [videoSourceName, setVideoSourceName] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const [matchId, setMatchId] = useState<string>('free_session');
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || '');
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<BotoneraTemplate | null>(null);

  const hasExplicitVideo =
    (videoType === 'link' && videoUrl.trim() !== '') ||
    (videoType === 'local' && (videoFile !== null || videoSourceName.trim() !== ''));

  const canGoStep2 = videoType !== null && (videoType !== 'local' || videoSourceName.trim() !== '') && (videoType !== 'link' || videoUrl.trim() !== '');
  const canGoStep3 = matchId !== '';
  const canFinish = true;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoSourceName(file.name);
      setVideoFile(file);
    }
  };

  const handleSelectMatch = (m: Match) => {
    setMatchId(m.id);
    // CRITICAL: If the user explicitly provided or chose a video in Step 1, NEVER overwrite it with the match's old video!
    if (hasExplicitVideo) {
      return;
    }

    // Only auto-fill from the match if the user hasn't provided a video and didn't select 'none'
    if (m.video_url && videoType !== 'none') {
      setVideoUrl(m.video_url);
      setVideoType(m.video_type || 'link');
      if (m.video_source_name) setVideoSourceName(m.video_source_name);
    }
  };

  const handleFinish = () => {
    const finalVideoType: BotoneraProjectVideoType = videoType || 'none';
    const finalVideoUrl = finalVideoType === 'link' ? (videoUrl.trim() || null) : null;
    const finalVideoSource = finalVideoType === 'local'
      ? (videoSourceName.trim() || videoFile?.name || 'Archivo Local')
      : (finalVideoUrl ? (videoSourceName.trim() || 'Enlace Web') : null);
    const finalTemplateId = templateId || templates[0]?.id || 'default_template';

    onComplete({
      videoType: finalVideoType,
      videoSourceName: finalVideoSource,
      videoUrl: finalVideoUrl,
      videoFile: finalVideoType === 'local' ? videoFile : null,
      matchId: matchId || 'free_session',
      templateId: finalTemplateId,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-wide">
              NUEVO REGISTRO EN DIRECTO — CONFIGURACIÓN INICIAL
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Antes de empezar a etiquetar, configura el proyecto. Una vez iniciado el registro, el cronómetro permanecerá activo.
            </p>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition cursor-pointer shrink-0 ml-4"
              title="Cerrar y salir"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800 bg-slate-900/60">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                  step === s.id
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : step > s.id
                    ? 'bg-slate-800 text-emerald-500 border-slate-700'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}>
                  {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s.id}</span>}
                  <span>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-800" />}
              </React.Fragment>
            ))}
          </div>

        {/* Body */}
        <div className="p-6 space-y-4 min-h-[280px]">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">¿Cómo quieres analizar este partido?</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setVideoType('local')}
                  className={`p-4 rounded-xl border text-left transition ${
                    videoType === 'local'
                      ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Video className="w-5 h-5 mb-2 text-emerald-400" />
                  <p className="text-xs font-bold">Vídeo Local</p>
                  <p className="text-[11px] text-slate-500 mt-1">Un archivo de vídeo guardado en tu PC o Mac.</p>
                </button>

                <button
                  onClick={() => setVideoType('link')}
                  className={`p-4 rounded-xl border text-left transition ${
                    videoType === 'link'
                      ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Link2 className="w-5 h-5 mb-2 text-blue-400" />
                  <p className="text-xs font-bold">Vídeo Enlace</p>
                  <p className="text-[11px] text-slate-500 mt-1">Un enlace externo, por ejemplo de YouTube.</p>
                </button>

                <button
                  onClick={() => setVideoType('none')}
                  className={`p-4 rounded-xl border text-left transition ${
                    videoType === 'none'
                      ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Ban className="w-5 h-5 mb-2 text-slate-400" />
                  <p className="text-xs font-bold">Sin Vídeo</p>
                  <p className="text-[11px] text-slate-500 mt-1">Etiquetado en directo desde el terreno de juego.</p>
                </button>
              </div>

              {videoType === 'local' && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition w-fit">
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span>Seleccionar archivo de vídeo…</span>
                    <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {videoSourceName && (
                    <p className="text-[11px] text-emerald-400 font-mono">📹 {videoSourceName}</p>
                  )}
                </div>
              )}

              {videoType === 'link' && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-400">URL del vídeo (YouTube u otro enlace)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Selecciona el partido que vas a analizar
              </p>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                <button
                  type="button"
                  onClick={() => setMatchId('free_session')}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                    matchId === 'free_session'
                      ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ⚡ <strong>Sesión Libre</strong> <span className="text-slate-500">(sin partido asignado)</span>
                </button>

                {matches.map((m) => {
                  const isShababHome = m.home_team.toLowerCase().includes('shabab al ordon');
                  const isShababAway = m.away_team.toLowerCase().includes('shabab al ordon');
                  const isSelected = matchId === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMatch(m)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/15 border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                          : 'bg-slate-950/90 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        {/* Competition, Jornada/Round & Date */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="font-extrabold text-amber-400 flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            <span>{m.competition}</span>
                          </span>

                          {m.round && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium text-[10px]">
                              {m.round}
                            </span>
                          )}

                          <span className="text-slate-400 font-mono flex items-center gap-1 text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{m.date} {m.time ? `• ${m.time}` : ''}</span>
                          </span>
                        </div>

                        {/* Teams */}
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            {m.home_team_logo && (
                              <img src={m.home_team_logo} alt="" className="w-4 h-4 object-contain rounded bg-slate-950 p-0.5 shrink-0" />
                            )}
                            <span className={isShababHome ? 'text-amber-400 font-extrabold' : 'text-slate-100'}>{m.home_team}</span>
                          </div>

                          <span className="font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-900 text-[10px] border border-slate-800 shrink-0">
                            {m.status === 'Finalizado' ? `${m.home_score} - ${m.away_score}` : 'vs'}
                          </span>

                          <div className="flex items-center gap-1.5 truncate">
                            {m.away_team_logo && (
                              <img src={m.away_team_logo} alt="" className="w-4 h-4 object-contain rounded bg-slate-950 p-0.5 shrink-0" />
                            )}
                            <span className={isShababAway ? 'text-amber-400 font-extrabold' : 'text-slate-100'}>{m.away_team}</span>
                          </div>
                        </div>
                      </div>

                      {/* Event count, Video status & Match Status */}
                      <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        {m.video_url && (
                          <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/60 text-sky-300 font-bold flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            <span>Vídeo Vinculado</span>
                          </span>
                        )}
                        {m.event_count > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                            {m.event_count} evs
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded font-bold border ${
                          m.status === 'Finalizado'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {matches.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic p-3">
                    No hay partidos guardados todavía en Partidos. Puedes continuar con una Sesión Libre.
                  </p>
                )}
              </div>

              {/* Match Video Feedback & Control */}
              {(() => {
                const selectedM = matches.find((m) => m.id === matchId);
                if (!selectedM) return null;

                if (hasExplicitVideo && selectedM.video_url && selectedM.video_url !== videoUrl) {
                  return (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Este partido tenía otro vídeo vinculado previamente</span>
                        </div>
                        <p className="text-[11px] text-amber-200/80 truncate">
                          Se usará tu <strong>nuevo vídeo</strong> ({videoType === 'local' ? (videoSourceName || 'Archivo Local') : videoUrl}) y se actualizará el partido.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl(selectedM.video_url || '');
                          setVideoType(selectedM.video_type || 'link');
                          if (selectedM.video_source_name) setVideoSourceName(selectedM.video_source_name);
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-[11px] font-bold border border-amber-500/40 transition shrink-0 cursor-pointer"
                      >
                        Usar vídeo anterior del partido
                      </button>
                    </div>
                  );
                }

                if (!hasExplicitVideo && selectedM.video_url) {
                  return (
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                          <Video className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Vídeo existente en este partido</span>
                        </div>
                        <p className="text-[11px] text-sky-200/80 truncate">
                          {selectedM.video_source_name || selectedM.video_url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl(selectedM.video_url || '');
                          setVideoType(selectedM.video_type || 'link');
                          if (selectedM.video_source_name) setVideoSourceName(selectedM.video_source_name);
                        }}
                        className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded-lg text-[11px] font-bold border border-sky-500/40 transition shrink-0 cursor-pointer"
                      >
                        {videoUrl === selectedM.video_url ? '✓ Vídeo cargado' : 'Cargar este vídeo'}
                      </button>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                Selecciona la botonera que vas a utilizar
              </p>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`flex-1 text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                        templateId === t.id
                          ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      🎛️ <strong>{t.name}</strong>
                      <span className="text-slate-500"> — {t.buttons.length} botones</span>
                      {t.description && <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>}
                    </button>
                    {!t.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmTemplate(t);
                        }}
                        className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 transition shrink-0 cursor-pointer"
                        title="Eliminar botonera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {templates.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic p-3">
                    No hay botoneras guardadas. Crea una desde el Modo Configuración.
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                Podrás editar esta botonera en cualquier momento durante el registro con el botón "Editar Botonera".
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          {step === 1 ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-300 hover:bg-red-950/40 border border-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar / Salir</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Atrás</span>
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition shadow-lg"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canFinish}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition shadow-lg"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Comenzar Registro</span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Confirmation Modal for Deleting Template */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm">
                  ¿Eliminar Pizarra "{deleteConfirmTemplate.name}"?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirmación requerida antes de eliminar.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
              Esta acción eliminará la plantilla de pizarra permanentemente. Los datos ya etiquetados en partidos no se verán afectados.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onDeleteTemplate) {
                    onDeleteTemplate(deleteConfirmTemplate.id);
                  }
                  if (templateId === deleteConfirmTemplate.id) {
                    const remaining = templates.filter(t => t.id !== deleteConfirmTemplate.id);
                    setTemplateId(remaining[0]?.id || '');
                  }
                  setDeleteConfirmTemplate(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Pizarra</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
