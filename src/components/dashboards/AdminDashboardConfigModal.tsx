'use client';

import React, { useState } from 'react';
import {
  Settings,
  X,
  Video,
  Activity,
  Users,
  Radio,
  Sliders,
  CheckCircle2,
  BarChart2,
  Grid,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';
import { DashboardGlobalConfig, ButtonDashboardConfig } from '@/types';
import { dbStore } from '@/lib/store/db-store';
import { TacticalLineupPitch } from '@/components/pitch/TacticalLineupPitch';

interface AdminDashboardConfigModalProps {
  currentConfig: DashboardGlobalConfig;
  onClose: () => void;
  onSave: (updatedConfig: DashboardGlobalConfig) => void;
}

const AVAILABLE_H2H_CATEGORIES = [
  'Tiro',
  'Remate',
  'Pase',
  'Falta',
  'Córner',
  'Presión',
  'Recuperación',
  'Entrada',
  'Centro',
  'Fuera de Juego',
  'Parada',
  'Salida Balón',
];

export const AdminDashboardConfigModal: React.FC<AdminDashboardConfigModalProps> = ({
  currentConfig,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'h2h' | 'lineups' | 'buttons'>('h2h');
  const [config, setConfig] = useState<DashboardGlobalConfig>({
    ...currentConfig,
    selectedH2HCategories: currentConfig.selectedH2HCategories || AVAILABLE_H2H_CATEGORIES.slice(0, 8),
    h2hDisplayMode: currentConfig.h2hDisplayMode || 'both',
    lineupsViewMode: currentConfig.lineupsViewMode || 'both',
    lineupFormation: currentConfig.lineupFormation || '4-3-3',
    buttonConfigs: currentConfig.buttonConfigs || {},
  });

  // Get active template buttons from dbStore
  const templates = dbStore.getBotoneraTemplates();
  const activeButtons = templates[0]?.buttons || [];

  const handleToggleCategory = (cat: string) => {
    const list = config.selectedH2HCategories || [];
    const exists = list.includes(cat);
    const updated = exists ? list.filter((c) => c !== cat) : [...list, cat];
    setConfig((prev) => ({ ...prev, selectedH2HCategories: updated }));
  };

  const handleUpdateButtonConfig = (
    buttonId: string,
    patch: Partial<ButtonDashboardConfig>
  ) => {
    const currentMap = config.buttonConfigs || {};
    const existing = currentMap[buttonId] || { visible: true, displayAs: 'bar' };
    const updatedMap = {
      ...currentMap,
      [buttonId]: { ...existing, ...patch },
    };
    setConfig((prev) => ({ ...prev, buttonConfigs: updatedMap }));
  };

  const handleSave = () => {
    dbStore.saveDashboardConfig(config);
    onSave(config);
    onClose();
  };

  const players = dbStore.getPlayers();

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                PANEL DE CONFIGURACIÓN ADMIN
              </span>
              <h3 className="font-extrabold text-white text-base">Personalizar Vistas del Dashboard</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('h2h')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'h2h'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Barras H2H & Métricas</span>
          </button>

          <button
            onClick={() => setActiveTab('lineups')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'lineups'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alineaciones Tácticas</span>
          </button>

          <button
            onClick={() => setActiveTab('buttons')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'buttons'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Ajustes Botón por Botón</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: BARRAS H2H & MÉTRICAS */}
          {activeTab === 'h2h' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <span>Configuración de Barras Comparativas de Eventos (H2H)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Selecciona qué categorías de acciones se comparan en las barras horizontales por equipo y cómo se muestran los datos.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300">Modo de Despliegue de los Datos:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'both', label: 'Conteo + Porcentaje (%)' },
                    { key: 'count', label: 'Solo Conteo Absoluto' },
                    { key: 'percentage', label: 'Solo Porcentaje (%)' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setConfig({ ...config, h2hDisplayMode: m.key as any })}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all text-center ${
                        config.h2hDisplayMode === m.key
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Checkboxes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Categorías de Acciones Disponibles para Comparar:</label>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    {(config.selectedH2HCategories || []).length} seleccionadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {AVAILABLE_H2H_CATEGORIES.map((cat) => {
                    const isSelected = (config.selectedH2HCategories || []).includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => handleToggleCategory(cat)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        <span>{cat}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 accent-emerald-500 pointer-events-none"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALINEACIONES TÁCTICAS */}
          {activeTab === 'lineups' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Configuración de Alineaciones y Formaciones Tácticas</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Elige cómo visualizar las plantillas de los equipos: sobre el dibujo táctico del campo o en lista por dorsales.
                </p>
              </div>

              {/* View Mode Selector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300">Modo de Visualización de las Alineaciones:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'both', label: 'Campo Táctico + Lista Dorsales' },
                    { key: 'field', label: 'Solo Esquema Táctico en Campo' },
                    { key: 'list', label: 'Solo Lista por Dorsales' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setConfig({ ...config, lineupsViewMode: m.key as any })}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all text-center ${
                        config.lineupsViewMode === m.key
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formation Selector & Pitch Preview */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Formación Táctica por Defecto:</label>
                  <select
                    value={config.lineupFormation}
                    onChange={(e) => setConfig({ ...config, lineupFormation: e.target.value as any })}
                    className="py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  >
                    <option value="4-3-3">4 - 3 - 3 (Clásico)</option>
                    <option value="4-2-3-1">4 - 2 - 3 - 1 (Pivotes)</option>
                    <option value="4-4-2">4 - 4 - 2 (Doble Punta)</option>
                    <option value="3-5-2">3 - 5 - 2 (Carrileros)</option>
                  </select>
                </div>

                {/* Pitch Preview Component */}
                <div className="pt-2">
                  <TacticalLineupPitch
                    teamName="Shabab Al Ordon Club"
                    formation={config.lineupFormation}
                    players={players}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AJUSTES BOTÓN POR BOTÓN */}
          {activeTab === 'buttons' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Grid className="w-4 h-4 text-purple-400" />
                  <span>Ajustes Botón por Botón de la Botonera</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Configura para **cada botón** su visibilidad en el Dashboard, formato de visualización y asignación de color.
                </p>
              </div>

              <div className="space-y-2.5">
                {activeButtons.map((btn) => {
                  const cfg = config.buttonConfigs?.[btn.id] || { visible: true, displayAs: 'bar' };
                  return (
                    <div
                      key={btn.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        cfg.visible
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                      }`}
                    >
                      {/* Button Label & Category */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateButtonConfig(btn.id, { visible: !cfg.visible })}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            cfg.visible
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                          title={cfg.visible ? 'Ocultar en Dashboard' : 'Mostrar en Dashboard'}
                        >
                          {cfg.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-white">{btn.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {btn.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display Format & Color Config */}
                      <div className="flex items-center gap-3">
                        <select
                          value={cfg.displayAs}
                          onChange={(e) =>
                            handleUpdateButtonConfig(btn.id, { displayAs: e.target.value as any })
                          }
                          disabled={!cfg.visible}
                          className="py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        >
                          <option value="bar">Barra Comparativa H2H</option>
                          <option value="kpi">KPI Numérico</option>
                          <option value="pitch">Puntos en Campograma</option>
                          <option value="matrix">Matriz de Descriptores</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar Ajustes Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
