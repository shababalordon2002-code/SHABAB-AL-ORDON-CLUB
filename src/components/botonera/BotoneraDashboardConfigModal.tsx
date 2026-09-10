'use client';

import React, { useState } from 'react';
import { X, Eye, BarChart2, PieChart, Target, Save, Sparkles, Sliders } from 'lucide-react';
import { BotoneraButton, BotoneraButtonDashboardConfig } from '@/types';

interface BotoneraDashboardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  button: BotoneraButton | null;
  onSave: (buttonId: string, config: BotoneraButtonDashboardConfig) => void;
}

const PITCH_VIEW_OPTIONS = [
  { id: 'heatmap', label: 'Mapa de Calor (Heatmap)', icon: '🔥', desc: 'Densidad térmica de acciones y recuperaciones' },
  { id: 'vector_arrow', label: 'Vector (Origen -> Destino)', icon: '🏹', desc: 'Flechas con trayectoria de pase o tiro' },
  { id: 'point', label: 'Puntos Espaciales', icon: '📍', desc: 'Ubicaciones puntuales exactas' },
  { id: 'zone_remate', label: 'Zonas de Remate', desc: 'Área pequeña, área grande y borde de área', icon: '🎯' },
  { id: 'zone_bandas_centro', label: 'Bandas y Centro', desc: 'Carril Izquierdo, Central y Derecho', icon: '↔️' },
  { id: 'zone_3_hitos', label: '3 Pasillos Longitudinales', desc: 'Iniciación, Creación y Finalización', icon: '📶' },
  { id: 'zone_4_zonas', label: '4 Cuadrantes Campo', desc: 'División en 4 áreas principales', icon: '📊' },
  { id: 'none', label: 'Sin Mapa Táctico', desc: 'Solo mostrar métricas numéricas y gráficas', icon: '🚫' },
];

const CHART_OPTIONS = [
  { id: 'descriptors', label: 'Desglose por Descriptores', type: 'Barra Vertical', desc: 'Detalle de sub-acciones (Ej: Conducción, Pase filtrado)' },
  { id: 'outcome', label: 'Resultado (Éxito vs Fallo)', type: 'Donut', desc: 'Porcentaje de efectividad y aciertos' },
  { id: 'player', label: 'Top Jugadores / Dorsales', type: 'Barra Horizontal', desc: 'Participación individual en la acción' },
  { id: 'time_half', label: 'Distribución por Mitades', type: 'Comparativa', desc: 'Comparativa de volumen 1ª parte vs 2ª parte' },
];

export function BotoneraDashboardConfigModal({
  isOpen,
  onClose,
  button,
  onSave,
}: BotoneraDashboardConfigModalProps) {
  if (!isOpen || !button) return null;

  const initialConfig: BotoneraButtonDashboardConfig = button.dashboardConfig || {
    pitchViewType: (button.pitchRequired as any) || 'vector_arrow',
    chart1Type: 'descriptors',
    chart2Type: 'outcome',
  };

  const [config, setConfig] = useState<BotoneraButtonDashboardConfig>(initialConfig);

  const handleSave = () => {
    onSave(button.id, config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">Configuración de Vista en Dashboard</h2>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: button.color ? `${button.color}20` : '#3b82f620',
                    borderColor: button.color || '#3b82f6',
                    color: button.color || '#60a5fa',
                  }}
                >
                  {button.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Define cómo se visualizarán los datos y campogramas de esta jugada al pulsar sobre ella en los dashboards de partido.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

            {/* Left Controls Column (5 cols) */}
            <div className="lg:col-span-5 space-y-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              
              {/* Pitch Visualizer Selection */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> 1. Campograma Táctico Principal
                </label>
                <div className="space-y-1.5">
                  {PITCH_VIEW_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setConfig({ ...config, pitchViewType: opt.id as any })}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition border flex items-start gap-2.5 ${
                        config.pitchViewType === opt.id
                          ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200 ring-1 ring-emerald-500/50'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      <div>
                        <div className="font-semibold text-slate-100">{opt.label}</div>
                        <div className="text-[11px] text-slate-400">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart 1 Selection */}
              <div>
                <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> 2. Gráfica Lateral 1 (Principal)
                </label>
                <select
                  value={config.chart1Type}
                  onChange={(e) => setConfig({ ...config, chart1Type: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                >
                  {CHART_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} ({opt.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chart 2 Selection */}
              <div>
                <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5" /> 3. Gráfica Lateral 2 (Secundaria)
                </label>
                <select
                  value={config.chart2Type}
                  onChange={(e) => setConfig({ ...config, chart2Type: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  {CHART_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} ({opt.type})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Right Live Sample Preview Column (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" /> Ejemplar Vista Previa del Modal en Dashboard
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                  Live Preview
                </span>
              </div>

              {/* Mock Dashboard Modal Card */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 shadow-xl space-y-4">
                
                {/* Header Mock */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: button.color || '#10b981' }}
                    />
                    <span className="text-sm font-bold text-slate-100">{button.name}</span>
                    <span className="text-xs text-slate-400 font-mono">(14 registros en partido)</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    64% Éxito
                  </div>
                </div>

                {/* Main Pitch Preview Box */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 relative flex flex-col items-center justify-center min-h-[160px]">
                  <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    <span>Vista: <strong className="text-slate-200">{PITCH_VIEW_OPTIONS.find(p => p.id === config.pitchViewType)?.label}</strong></span>
                  </div>

                  {/* SVG Pitch Preview */}
                  <div className="w-full max-w-[280px] h-[130px] mt-4 relative border border-emerald-800/40 rounded-md bg-[#0a1e14] overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 100 64" className="w-full h-full">
                      <rect x="2" y="2" width="96" height="60" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.4" />
                      <line x1="50" y1="2" x2="50" y2="62" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.4" />
                      <circle cx="50" cy="32" r="10" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.4" />
                      
                      {config.pitchViewType === 'vector_arrow' && (
                        <g>
                          <line x1="20" y1="45" x2="70" y2="20" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="2 1" />
                          <circle cx="20" cy="45" r="2.5" fill="#06b6d4" />
                          <polygon points="70,20 64,22 66,26" fill="#06b6d4" />
                          
                          <line x1="30" y1="15" x2="80" y2="35" stroke="#10b981" strokeWidth="1.5" />
                          <circle cx="30" cy="15" r="2.5" fill="#10b981" />
                          <polygon points="80,35 74,33 75,37" fill="#10b981" />
                        </g>
                      )}

                      {config.pitchViewType === 'point' && (
                        <g>
                          <circle cx="35" cy="25" r="4" fill="#ef4444" fillOpacity="0.6" />
                          <circle cx="65" cy="40" r="5" fill="#3b82f6" fillOpacity="0.6" />
                          <circle cx="75" cy="20" r="3" fill="#10b981" fillOpacity="0.6" />
                        </g>
                      )}

                      {config.pitchViewType === 'zone_remate' && (
                        <g>
                          <rect x="2" y="16" width="20" height="32" fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" strokeWidth="0.5" />
                          <text x="12" y="34" fill="#ef4444" fontSize="5" textAnchor="middle" fontWeight="bold">60%</text>
                          <rect x="22" y="8" width="25" height="48" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="0.5" />
                          <text x="34" y="34" fill="#f59e0b" fontSize="5" textAnchor="middle" fontWeight="bold">30%</text>
                        </g>
                      )}

                      {config.pitchViewType === 'zone_bandas_centro' && (
                        <g>
                          <rect x="2" y="2" width="96" height="18" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="0.5" />
                          <rect x="2" y="20" width="96" height="24" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
                          <rect x="2" y="44" width="96" height="18" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="0.5" />
                        </g>
                      )}

                      {config.pitchViewType === 'none' && (
                        <text x="50" y="35" fill="#94a3b8" fontSize="6" textAnchor="middle">
                          Sin Campograma
                        </text>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Two Sub-charts Mock */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Chart 1 Preview */}
                  <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-2">
                    <div className="text-[11px] font-semibold text-cyan-400 flex items-center justify-between">
                      <span>{CHART_OPTIONS.find(c => c.id === config.chart1Type)?.label}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>Conducción</span>
                          <span>8</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: '70%' }} />
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>Pase Rápido</span>
                          <span>5</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400/70 rounded-full" style={{ width: '45%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 2 Preview */}
                  <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-2">
                    <div className="text-[11px] font-semibold text-purple-400 flex items-center justify-between">
                      <span>{CHART_OPTIONS.find(c => c.id === config.chart2Type)?.label}</span>
                    </div>
                    <div className="flex items-center justify-around pt-2">
                      {config.chart2Type === 'outcome' || config.chart2Type === 'outcomes' ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-red-500 flex items-center justify-center text-[10px] font-bold text-slate-200">
                            75%
                          </div>
                          <div className="text-[10px] space-y-0.5">
                            <div className="text-emerald-400 font-semibold">9 Éxito</div>
                            <div className="text-red-400 font-semibold">3 Fallo</div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 w-full">
                          <div className="flex justify-between text-[10px] text-slate-300">
                            <span>#10 Messi</span>
                            <span>6</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: '80%' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </div>

      </div>
    </div>
  );
}
