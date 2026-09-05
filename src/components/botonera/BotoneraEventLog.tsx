'use client';

import React, { useState } from 'react';
import {
  List,
  Trash2,
  FileCode2,
  Download,
  Search,
  Clock,
  User,
  MapPin,
  Tag,
  ChevronDown,
  CheckCircle,
  FileText,
  Pencil,
  X,
  Save,
  PlayCircle,
} from 'lucide-react';
import { NormalizedEvent, BotoneraButton } from '@/types';
import { getButtonColorHex } from './BotoneraPanelEditor';

interface BotoneraEventLogProps {
  events: NormalizedEvent[];
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent?: (updatedEvent: NormalizedEvent) => void;
  onClearAllEvents: () => void;
  onExportXml: () => void;
  onExportJson: () => void;
  /** Called when the user clicks the ▶ button to seek the video to 12s before this event */
  onSeekToEvent?: (event: NormalizedEvent) => void;
  /** Buttons of the active botonera, used to paint each row with its button colour */
  buttons?: BotoneraButton[];
}

export const BotoneraEventLog: React.FC<BotoneraEventLogProps> = ({
  events,
  onDeleteEvent,
  onUpdateEvent,
  onClearAllEvents,
  onExportXml,
  onExportJson,
  onSeekToEvent,
  buttons = [],
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Fila desplegada: categoría, coordenadas y demás detalles solo al hacer clic
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  
  // Edit Event State
  const [editingEvent, setEditingEvent] = useState<NormalizedEvent | null>(null);
  const [editPlayerName, setEditPlayerName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPeriod, setEditPeriod] = useState<number>(1);
  const [editMin, setEditMin] = useState<number>(0);
  const [editSec, setEditSec] = useState<number>(0);
  const [editOutcome, setEditOutcome] = useState<string>('');

  // Filter events
  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      e.category.toLowerCase().includes(q) ||
      (e.event_type || '').toLowerCase().includes(q) ||
      e.player_name.toLowerCase().includes(q) ||
      (e.subcategory || '').toLowerCase().includes(q) ||
      (e.outcome && e.outcome.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  /** Descriptores marcados en el evento (los nuevos van en metadata, los viejos en subcategory) */
  const getDescriptors = (evt: NormalizedEvent): string[] => {
    const fromMeta = evt.metadata?.descriptors;
    if (Array.isArray(fromMeta) && fromMeta.length > 0) return fromMeta;
    if (evt.subcategory) return evt.subcategory.split(',').map((d) => d.trim()).filter(Boolean);
    return [];
  };

  /** Color del botón que generó el evento, para pintar la fila igual que la botonera */
  const getEventColor = (evt: NormalizedEvent): string => {
    const stored = evt.metadata?.buttonColor;
    if (typeof stored === 'string' && stored) return getButtonColorHex(stored);
    const match = buttons.find(
      (b) => b.name === evt.event_type || b.name === evt.category || b.category === evt.category
    );
    return getButtonColorHex(match?.color || 'emerald');
  };

  const formatMinSec = (timestampSec: number | null) => {
    if (timestampSec === null) return '--:--';
    const m = Math.floor(timestampSec / 60);
    const s = Math.floor(timestampSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const categoriesList = Array.from(new Set(events.map((e) => e.category)));

  // Start Editing an Event
  const handleStartEdit = (evt: NormalizedEvent) => {
    setEditingEvent(evt);
    setEditPlayerName(evt.player_name || '');
    setEditCategory(evt.category || '');
    setEditPeriod(evt.period || 1);
    const totalSec = evt.timestamp || 0;
    setEditMin(Math.floor(totalSec / 60));
    setEditSec(Math.floor(totalSec % 60));
    setEditOutcome(evt.outcome || '');
  };

  // Save Edited Event
  const handleSaveEdit = () => {
    if (!editingEvent || !onUpdateEvent) return;

    const totalSeconds = editMin * 60 + editSec;
    const updated: NormalizedEvent = {
      ...editingEvent,
      player_name: editPlayerName.trim() || 'Sin asignar',
      category: editCategory.trim() || 'Acción',
      period: editPeriod,
      timestamp: totalSeconds,
      minute: editMin,
      second: editSec,
      outcome: editOutcome.trim() || null,
      updated_at: new Date().toISOString(),
    };

    onUpdateEvent(updated);
    setEditingEvent(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Log Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <List className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm tracking-wide flex items-center gap-2">
              FEED DE EVENTOS REGISTRADOS ({events.length})
            </h3>
            <p className="text-xs text-slate-400">
              Cronología de eventos anotados en vivo (editables y eliminables 1 a 1)
            </p>
          </div>
        </div>

        {/* Action buttons: Export & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportXml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>XML LongoMatch</span>
          </button>

          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          {events.length > 0 && (
            <button
              onClick={onClearAllEvents}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition text-xs"
              title="Borrar Todos los Eventos"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <div className="flex-1 min-w-44 flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por evento, jugador, descriptor..."
            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 text-xs text-slate-300 font-semibold px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none"
        >
          <option value="all">Todas las categorías ({events.length})</option>
          {categoriesList.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Events Table Stream */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="p-2.5">Tiempo</th>
              <th className="p-2.5">Periodo</th>
              <th className="p-2.5">Evento</th>
              <th className="p-2.5">Jugador</th>
              <th className="p-2.5">Descriptores</th>
              <th className="p-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 text-xs italic">
                  No hay eventos registrados aún. Usa la botonera o atajos de teclado para marcar acciones del partido.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => {
                const color = getEventColor(evt);
                const descriptors = getDescriptors(evt);
                const isExpanded = expandedEventId === evt.event_id;

                return (
                  <React.Fragment key={evt.event_id}>
                    <tr
                      onClick={() => setExpandedEventId(isExpanded ? null : evt.event_id)}
                      title="Clic para ver categoría, coordenadas y detalles"
                      className="cursor-pointer transition hover:brightness-125"
                      style={{ backgroundColor: `${color}1f` }}
                    >
                      <td
                        className="p-2.5 font-mono font-bold text-slate-100"
                        style={{ borderLeft: `4px solid ${color}` }}
                      >
                        {formatMinSec(evt.timestamp)}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950/60 text-slate-300 font-bold">
                          {evt.period === 1 ? '1ª Parte' : evt.period === 2 ? '2ª Parte' : `ET ${evt.period}`}
                        </span>
                      </td>

                      {/* Nombre del botón pulsado */}
                      <td className="p-2.5">
                        <span className="flex items-center gap-1.5 font-black text-slate-50">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          {evt.event_type || evt.category}
                          <ChevronDown
                            className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </td>

                      <td className="p-2.5 font-semibold text-slate-200">
                        {evt.player_name || 'Sin asignar'}
                      </td>

                      {/* Descriptores marcados */}
                      <td className="p-2.5">
                        {descriptors.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {descriptors.map((d, i) => (
                              <span
                                key={`${evt.event_id}_d${i}`}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: `${color}26`,
                                  borderColor: `${color}80`,
                                  color: '#e2e8f0',
                                }}
                              >
                                {d}
                              </span>
                            ))}
                          </span>
                        ) : evt.outcome ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {evt.outcome}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="p-2.5 text-right">
                        <span
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onSeekToEvent && (
                            <button
                              onClick={() => onSeekToEvent(evt)}
                              className="p-1 rounded bg-slate-950/50 hover:bg-emerald-600/50 text-emerald-400 hover:text-emerald-200 border border-emerald-700/40 hover:border-emerald-500/60 transition"
                              title={`▶ Ir al vídeo (-12s del evento en t=${formatMinSec(evt.timestamp)})`}
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(evt)}
                            className="p-1 rounded bg-slate-950/50 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
                            title="Editar este evento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteEvent(evt.event_id)}
                            className="p-1 rounded bg-slate-950/50 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-700 transition"
                            title="Eliminar este evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </td>
                    </tr>

                    {/* Detalle desplegable: categoría, coordenadas y metadatos */}
                    {isExpanded && (
                      <tr style={{ backgroundColor: `${color}0f` }}>
                        <td colSpan={6} className="px-3 pb-3 pt-1">
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2">
                            <span className="flex items-center gap-1.5">
                              <Tag className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide">Categoría:</span>
                              <span className="text-slate-200 font-bold">{evt.category || '-'}</span>
                            </span>

                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide">Coordenadas:</span>
                              <span className="text-slate-200 font-mono">
                                {evt.x !== null ? (
                                  <>
                                    ({evt.x}, {evt.y})
                                    {evt.end_x !== null && ` ➔ (${evt.end_x}, ${evt.end_y})`}
                                  </>
                                ) : evt.metadata?.zone ? (
                                  <span className="text-blue-400 font-semibold">{evt.metadata.zone}</span>
                                ) : (
                                  '-'
                                )}
                              </span>
                            </span>

                            <span className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide">Equipo:</span>
                              <span className="text-slate-200">{evt.team_name || '-'}</span>
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide">Ventana:</span>
                              <span className="text-slate-200 font-mono">
                                -{evt.metadata?.leadTime ?? 0}s / +{evt.metadata?.lagTime ?? 0}s
                              </span>
                            </span>

                            {evt.outcome && (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-500 font-bold uppercase tracking-wide">Resultado:</span>
                                <span className="text-amber-300 font-bold">{evt.outcome}</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">Editar Evento Registrado</h3>
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Categoría / Tipo de Accion</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Jugador Asignado</label>
                <input
                  type="text"
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Periodo</label>
                  <select
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none"
                  >
                    <option value={1}>1ª Parte</option>
                    <option value={2}>2ª Parte</option>
                    <option value={3}>Prórroga 1</option>
                    <option value={4}>Prórroga 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tiempo (Min : Seg)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={editMin}
                      onChange={(e) => setEditMin(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 font-mono text-center focus:outline-none"
                    />
                    <span className="text-slate-500 font-bold">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={editSec}
                      onChange={(e) => setEditSec(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 font-mono text-center focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Resultado / Descriptores</label>
                <input
                  type="text"
                  value={editOutcome}
                  onChange={(e) => setEditOutcome(e.target.value)}
                  placeholder="Ej: Éxito, Fallido, Cabeza, Pie Derecho..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
