'use client';

import React, { useState } from 'react';
import { X, FileText, CheckCircle2, Sparkles, Loader2, Globe } from 'lucide-react';
import { Match } from '@/types';

export type PdfReportLanguage = 'es' | 'en' | 'ar';

interface PdfLanguageModalProps {
  match: Match;
  onClose: () => void;
  onGeneratePdf: (language: PdfReportLanguage) => Promise<void> | void;
  isGenerating?: boolean;
  progressMessage?: string;
}

const LANGUAGES: {
  id: PdfReportLanguage;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
}[] = [
  {
    id: 'es',
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    description: 'Informe técnico completo en castellano con formato ejecutivo post-partido.',
  },
  {
    id: 'en',
    name: 'English',
    nativeName: 'English (UK / US)',
    flag: '🇬🇧',
    description: 'Full technical match report translated to English for international staff.',
  },
  {
    id: 'ar',
    name: 'Jordano / Árabe',
    nativeName: 'الأردنية / العربية',
    flag: '🇯🇴',
    description: 'تقرير فني كامل باللغة العربية المعتمدة للجهاز الفني والنادي.',
  },
];

export const PdfLanguageModal: React.FC<PdfLanguageModalProps> = ({
  match,
  onClose,
  onGeneratePdf,
  isGenerating = false,
  progressMessage,
}) => {
  const [selectedLang, setSelectedLang] = useState<PdfReportLanguage>('es');

  const handleGenerate = async () => {
    await onGeneratePdf(selectedLang);
  };

  const homeTeam = match.home_team || 'Shabab Al Ordon';
  const awayTeam = match.away_team || 'Al Ramtha';

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Decorative Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>EXPORTAR INFORME PDF TÉCNICO</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Multipágina
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {homeTeam} vs {awayTeam} • {match.competition || 'Jordan Pro League'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selection List */}
        <div className="space-y-3 relative z-10">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Selecciona el Idioma del Informe PDF:</span>
          </label>

          <div className="space-y-2.5">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedLang(lang.id)}
                  disabled={isGenerating}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-xl scale-[1.01]'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950 text-slate-300'
                  }`}
                >
                  <span className="text-3xl shrink-0 select-none">{lang.flag}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>{lang.name}</span>
                        <span className="text-xs text-amber-300/80 font-normal">({lang.nativeName})</span>
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lang.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Structure Info Pill */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 text-xs space-y-1.5 text-slate-300 relative z-10">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Contenido Incluido en el Documento:</span>
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
            <li><strong>Página 1 (Portada)</strong>: Escudos oficiales, resultado final, fecha y jornada.</li>
            <li><strong>Página 2 (Resumen General)</strong>: Alineaciones tácticas y estadísticas generales.</li>
            <li><strong>Páginas 3+ (Desglose por Evento)</strong>: Campogramas e indicadores frente a frente.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-800 relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>{progressMessage || 'Generando PDF...'}</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>GENERAR INFORME PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
