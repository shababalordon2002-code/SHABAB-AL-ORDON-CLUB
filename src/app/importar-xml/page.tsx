'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileCheck2,
  RefreshCw,
  Info,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  Users,
  Trophy,
  Calendar
} from 'lucide-react';
import { parseLongoMatchXML } from '@/lib/parser/longomatch-parser';
import { normalizeLongoMatchEvents } from '@/lib/normalizer/event-normalizer';
import { getSampleLongoMatchXML } from '@/lib/demo-xml';
import { dbStore } from '@/lib/store/db-store';
import { ParsedXMLAnalysis, Match, ImportLog } from '@/types';

function ImportarXMLContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetMatchId = searchParams.get('match_id');

  // Wizard state: 1 = Select File, 2 = Analyzing, 3 = Review & Warnings, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFileText, setSelectedFileText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<ParsedXMLAnalysis | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'replace' | 'cancel'>('replace');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    eventCount: number;
    categoriesCount: number;
    playersCount: number;
  } | null>(null);

  // Load target match if provided in URL query
  const [presetMatch, setPresetMatch] = useState<Match | null>(null);
  useEffect(() => {
    if (targetMatchId) {
      const m = dbStore.getMatchById(targetMatchId);
      if (m) setPresetMatch(m);
    }
  }, [targetMatchId]);

  // Handle Drag & Drop / File Select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setSelectedFileText(text);
    processXMLAnalysis(text, file.name);
  };

  // Load Demo XML helper
  const handleLoadDemoXML = () => {
    const text = getSampleLongoMatchXML();
    const demoName = 'match_2026_09_01_longomatch_demo.xml';
    setFileName(demoName);
    setSelectedFileText(text);
    processXMLAnalysis(text, demoName);
  };

  // Analyze XML
  const processXMLAnalysis = async (text: string, name: string) => {
    setStep(2);
    setIsProcessing(true);
    const existingHashes = dbStore.getExistingHashes();
    const result = await parseLongoMatchXML(text, name, existingHashes);
    setAnalysis(result);
    setIsProcessing(false);
    setStep(3);
  };

  // Execute Import & Normalization into Database Store
  const handleExecuteImport = () => {
    if (!analysis) return;

    if (analysis.isDuplicate && duplicatePolicy === 'cancel') {
      handleReset();
      return;
    }

    setIsProcessing(true);

    const players = dbStore.getPlayers();
    const mappings = dbStore.getPlayerMappings();

    let matchId = presetMatch ? presetMatch.id : `match_${Date.now()}`;
    if (analysis.isDuplicate && analysis.existingMatchId) {
      matchId = analysis.existingMatchId;
    }

    const homeTeamName = presetMatch ? presetMatch.home_team : analysis.homeTeam;
    const awayTeamName = presetMatch ? presetMatch.away_team : analysis.awayTeam;

    const matchRecord: Match = {
      id: matchId,
      date: analysis.matchDate,
      competition: analysis.competition,
      season: analysis.season,
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_score: presetMatch ? presetMatch.home_score : 2,
      away_score: presetMatch ? presetMatch.away_score : 1,
      status: 'Finalizado',
      duration: analysis.durationFormatted,
      event_count: analysis.rawEventsCount,
      import_status: 'XML Importado',
      xml_imported_at: new Date().toISOString(),
      file_hash: analysis.fileHash
    };

    const { normalizedEvents } = normalizeLongoMatchEvents(
      analysis.events,
      matchId,
      players,
      mappings
    );

    dbStore.saveMatch(matchRecord);
    dbStore.saveNormalizedEvents(normalizedEvents, true);

    const statusResult = analysis.errors.length > 0
      ? 'Error'
      : analysis.warnings.length > 0
      ? 'Completado con avisos'
      : 'Completado';

    const logRecord: ImportLog = {
      id: `log_${Date.now()}`,
      file_name: fileName,
      file_hash: analysis.fileHash,
      imported_at: new Date().toISOString(),
      user_name: 'Analista Principal (SAO)',
      match_id: matchId,
      match_title: `${homeTeamName} vs ${awayTeamName}`,
      event_count: normalizedEvents.length,
      status: statusResult,
      errors: analysis.errors,
      warnings: analysis.warnings
    };

    dbStore.saveImportLog(logRecord);

    setIsProcessing(false);
    setImportSummary({
      matchId,
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      eventCount: normalizedEvents.length,
      categoriesCount: analysis.categoriesCount,
      playersCount: analysis.detectedPlayers.length
    });
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedFileText('');
    setFileName('');
    setAnalysis(null);
    setImportSummary(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-emerald-400" />
          <span>Importar partido de LongoMatch</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Subida y análisis automático de archivos XML de LongoMatch para conversión al modelo normalizado interno.
        </p>
      </div>

      {/* Preset Match Notice */}
      {presetMatch && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Asignando XML al partido: <strong>{presetMatch.home_team} vs {presetMatch.away_team}</strong> ({presetMatch.date})
            </span>
          </div>
          <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
            Target Match ID: {presetMatch.id}
          </span>
        </div>
      )}

      {/* STEP 1: Upload XML or Test Demo */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-900/60 transition-all text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-slate-200 text-sm">Selecciona o arrastra tu archivo LongoMatch XML</h3>
              <p className="text-xs text-slate-400 mt-1">Soporta archivos .xml con nodos de proyectos, categorías y eventos</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <label className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-all hover:scale-105">
                <span>Seleccionar Archivo XML</span>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <span className="text-slate-500 text-xs font-semibold">o también</span>

              <button
                onClick={handleLoadDemoXML}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Cargar XML Demo (Shabab Al Ordon vs Rival)</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-300">Análisis Automático de LongoMatch XML</p>
              <p className="mt-0.5 text-slate-400 text-[11px]">
                El sistema inspecciona automáticamente el archivo XML detectando equipos, fecha, duración, categorías, recuento de eventos y jugadores asignados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Loading State */}
      {step === 2 && (
        <div className="p-12 text-center space-y-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <h3 className="font-bold text-white text-sm">Analizando archivo XML...</h3>
          <p className="text-xs text-slate-400">Verificando sintaxis, extrayendo categorías y calculando hash SHA-256 anti-duplicados</p>
        </div>
      )}

      {/* STEP 3: Review Analysis & Confirm Import */}
      {step === 3 && analysis && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">INFORMACIÓN DETECTADA</span>
                <h2 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <FileCode className="w-5 h-5 text-emerald-400" />
                  <span>{fileName}</span>
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono">Hash SHA-256</span>
                <p className="text-[11px] font-mono text-slate-400">{analysis.fileHash.substring(0, 16)}...</p>
              </div>
            </div>

            {/* Analysis Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Partido</span>
                <p className="font-bold text-white text-sm mt-0.5">{analysis.homeTeam} vs {analysis.awayTeam}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Equipo Local</span>
                <p className="font-bold text-emerald-400 mt-0.5">{analysis.homeTeam}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Equipo Visitante</span>
                <p className="font-bold text-slate-200 mt-0.5">{analysis.awayTeam}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Fecha</span>
                <p className="font-bold text-slate-200 mt-0.5">{analysis.matchDate}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Duración</span>
                <p className="font-bold font-mono text-blue-400 mt-0.5">{analysis.durationFormatted}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Categorías de eventos</span>
                <p className="font-bold text-slate-200 mt-0.5">{analysis.categoriesCount} categorías</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Número de eventos</span>
                <p className="font-extrabold text-amber-400 mt-0.5">{analysis.rawEventsCount} eventos</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Jugadores detectados</span>
                <p className="font-bold text-slate-200 mt-0.5">{analysis.detectedPlayers.length} jugadores</p>
              </div>
            </div>

            {/* List of auto-detected categories */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categorías extraídas del XML:</span>
              <div className="flex flex-wrap gap-1.5">
                {analysis.categories.map(cat => (
                  <span key={cat} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Warnings Section */}
            {analysis.warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-300">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Avisos de Validación</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-200">
                  {analysis.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate File Warning & Options */}
            {analysis.isDuplicate && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span>Este archivo/partido ya está importado.</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Por favor selecciona cómo deseas proceder para evitar duplicar eventos silenciosamente:
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'replace'}
                      onChange={() => setDuplicatePolicy('replace')}
                      className="accent-emerald-500"
                    />
                    <span>Reemplazar importación</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'cancel'}
                      onChange={() => setDuplicatePolicy('cancel')}
                      className="accent-emerald-500"
                    />
                    <span>Cancelar</span>
                  </label>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Confirmar importación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Success Result Screen */}
      {step === 4 && importSummary && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white">Importación completada</h2>
            <p className="text-xs text-slate-400">
              Los eventos del partido se han normalizado y guardado correctamente en la base de datos.
            </p>
          </div>

          {/* Exact Summary Box requested in Prompt */}
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left text-xs space-y-3">
            <h3 className="font-bold text-slate-200 border-b border-slate-800 pb-2 text-xs uppercase tracking-wider">
              Resumen del partido:
            </h3>

            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-slate-400">Partido:</span>
              <span className="font-bold text-white">{importSummary.homeTeam} vs {importSummary.awayTeam}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-slate-400">Eventos:</span>
              <span className="font-bold font-mono text-emerald-400">{importSummary.eventCount}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-slate-400">Categorías:</span>
              <span className="font-bold font-mono text-blue-400">{importSummary.categoriesCount}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-slate-400">Jugadores:</span>
              <span className="font-bold font-mono text-amber-400">{importSummary.playersCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={`/partidos/${importSummary.matchId}`}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>Ver partido</span>
            </Link>

            <Link
              href={`/partidos/${importSummary.matchId}`}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              <Layers className="w-4 h-4" />
              <span>Ver eventos</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportarXMLPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-xs text-slate-400">
        Cargando interfaz de importación...
      </div>
    }>
      <ImportarXMLContent />
    </Suspense>
  );
}
