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
  ArrowUpDown,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { NormalizedEvent, BotoneraButton, Player, Match } from '@/types';
import { getButtonColorHex } from './BotoneraPanelEditor';
import { BotoneraEventModal } from './BotoneraEventModal';
import { TeamLogo } from '@/components/player/PlayerBadge';
import { dbStore } from '@/lib/store/db-store';
import { calculateEventVideoTime, formatVideoTime } from '@/lib/analytics/video-utils';

interface BotoneraEventLogProps {
  events: NormalizedEvent[];
  onDeleteEvent?: (eventId: string) => void;
  onUpdateEvent?: (updatedEvent: NormalizedEvent) => void;
  onClearAllEvents?: () => void;
  onRestoreDeletedEvents?: () => void;
  onExportXml?: () => void;
  onExportJson?: () => void;
  /** Called when the user clicks the ▶ button to reproduce the event cut in a pop-up window */
  onSeekToEvent?: (event: NormalizedEvent) => void;
  /** Buttons of the active botonera, used to paint each row with its button colour */
  buttons?: BotoneraButton[];
  players?: Player[];
  /** When true, editing, deleting, and clearing buttons are hidden (read-only mode for Visor) */
  readOnly?: boolean;
  /** Optional custom CSS max height class for the scrollable table container */
  maxHeightClass?: string;
  /** Match object with period video start offsets */
  match?: Match | null;
  /** Period video offsets recorded or edited in live session */
  periodVideoOffsets?: Record<number, number>;
}

export const BotoneraEventLog: React.FC<BotoneraEventLogProps> = ({
  events,
  onDeleteEvent,
  onUpdateEvent,
  onClearAllEvents,
  onRestoreDeletedEvents,
  onExportXml,
  onExportJson,
  onSeekToEvent,
  buttons = [],
  players = [],
  readOnly = false,
  maxHeightClass,
  match = null,
  periodVideoOffsets,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  // Fila desplegada: categoría, coordenadas y demás detalles solo al hacer clic
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // High-Friction Deletion Security Inputs & Trash State
  const [deletingEventTarget, setDeletingEventTarget] = useState<NormalizedEvent | null>(null);
  const [singleDeleteInput, setSingleDeleteInput] = useState<string>('');

  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);
  const [clearAllInput, setClearAllInput] = useState<string>('');

  const [trashCount, setTrashCount] = useState<number>(0);

  const updateTrashCount = () => {
    if (typeof window !== 'undefined') {
      const trash = dbStore.getTrashEvents();
      setTrashCount(trash.length);
    }
  };

  React.useEffect(() => {
    updateTrashCount();
  }, [events]);

  const handleRestoreFromTrash = () => {
    if (onRestoreDeletedEvents) {
      onRestoreDeletedEvents();
    } else {
      dbStore.restoreTrashEvents();
    }
    setTimeout(updateTrashCount, 100);
  };

  // Edit Event State
  const [editingEvent, setEditingEvent] = useState<NormalizedEvent | null>(null);

  // Filter events
  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase();
    const metaDescs = Array.isArray(e.metadata?.descriptors) ? e.metadata.descriptors.join(' ').toLowerCase() : '';
    const matchesSearch =
      e.category.toLowerCase().includes(q) ||
      (e.event_type || '').toLowerCase().includes(q) ||
      e.player_name.toLowerCase().includes(q) ||
      (e.subcategory || '').toLowerCase().includes(q) ||
      metaDescs.includes(q) ||
      (e.outcome && e.outcome.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort events: default "desc" (más reciente a más lejano por período y tiempo)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const periodA = a.period || 1;
    const periodB = b.period || 1;
    if (periodA !== periodB) {
      return sortOrder === 'desc' ? periodB - periodA : periodA - periodB;
    }

    const timeA = a.timestamp ?? 0;
    const timeB = b.timestamp ?? 0;
    if (timeA !== timeB) {
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }

    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();
    return sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
  });

  /** Descriptores marcados en el evento (los nuevos van en metadata, los viejos en subcategory) */
  const getDescriptors = (evt: NormalizedEvent): string[] => {
    const fromMeta = evt.metadata?.descriptors;
    if (Array.isArray(fromMeta) && fromMeta.length > 0) {
      return fromMeta
        .flatMap((d) => (typeof d === 'string' ? d.split(',') : [d]))
        .map((d) => String(d).trim())
        .filter(Boolean);
    }
    if (evt.subcategory) return evt.subcategory.split(',').map((d) => d.trim()).filter(Boolean);
    return [];
  };

  /** Extrae solo el valor/resultado del descriptor omitiendo el título (ej: "Resultado: Parada" -> "Parada") */
  const formatDescriptorDisplay = (desc: string): string => {
    if (!desc) return '';
    const colonIdx = desc.indexOf(':');
    if (colonIdx !== -1) {
      return desc.slice(colonIdx + 1).trim();
    }
    return desc.trim();
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
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 flex-1 flex flex-col min-h-0 h-full">
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
          {onExportXml && (
            <button
              onClick={onExportXml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>XML LongoMatch</span>
            </button>
          )}

          {onExportJson && (
            <button
              onClick={onExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          )}

          {!readOnly && onClearAllEvents && events.length > 0 && (
            <button
              onClick={() => setIsConfirmingClearAll(true)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition text-xs cursor-pointer"
              title="Borrar Todos los Eventos"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── RESTAURAR REGISTROS DE LA PAPELERA ── */}
      {trashCount > 0 && !readOnly && (
        <div className="flex items-center justify-between p-2.5 px-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs shadow-sm">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Papelera de Recuperación: Tienes <strong className="text-white font-black">{trashCount} registros</strong> respaldados en la papelera de seguridad.
            </span>
          </div>
          <button
            type="button"
            onClick={handleRestoreFromTrash}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restaurar Registros</span>
          </button>
        </div>
      )}

      {/* Search, Category Filters & Sort Control */}
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

        {/* Sort order toggle button */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="bg-slate-900 text-xs text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 transition flex items-center gap-1.5 shrink-0"
          title="Cambiar ordenación: De más reciente a más lejano o viceversa"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
          <span>{sortOrder === 'desc' ? 'Más Reciente (⬇)' : 'Más Antiguo (⬆)'}</span>
        </button>
      </div>

      {/* Events Table Stream */}
      <div className={`overflow-x-auto overflow-y-auto rounded-xl border border-slate-800 flex-1 min-h-[450px] ${maxHeightClass || 'max-h-none lg:max-h-[2200px]'}`}>
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-2.5 cursor-pointer hover:text-amber-300 transition select-none flex items-center gap-1"
                title="Ordenar por Tiempo"
              >
                <span>Tiempo</span>
                <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
              </th>
              <th
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-2.5 cursor-pointer hover:text-amber-300 transition select-none"
                title="Ordenar por Periodo"
              >
                <span>Periodo</span>
              </th>
              <th className="p-2.5">Evento</th>
              <th className="p-2.5">Jugador</th>
              <th className="p-2.5">Analista</th>
              <th className="p-2.5">Descriptores</th>
              <th className="p-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium">
            {sortedEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500 text-xs italic">
                  No hay eventos registrados aún. Usa la botonera o atajos de teclado para marcar acciones del partido.
                </td>
              </tr>
            ) : (
              sortedEvents.map((evt) => {
                const color = getEventColor(evt);
                const descriptors = getDescriptors(evt);
                const isExpanded = expandedEventId === evt.event_id;
                const vidSec = calculateEventVideoTime(evt, match, periodVideoOffsets, 0);
                const vidTimeStr = formatVideoTime(vidSec);
                const hasVideoTiming = Boolean(
                  (periodVideoOffsets && Object.keys(periodVideoOffsets).length > 0) ||
                  (match && (match.p1_video_start_time != null || match.p2_video_start_time != null)) ||
                  vidSec > 0
                );

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
                        <div className="flex flex-col">
                          <span className="text-white text-xs font-bold leading-tight">{formatMinSec(evt.timestamp)}</span>
                          {hasVideoTiming && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 font-mono tracking-tight mt-0.5"
                              title={`Minuto exacto en el archivo de vídeo: ${vidTimeStr}`}
                            >
                              <span className="text-slate-500 font-medium text-[9px]">Vid:</span>
                              <span>{vidTimeStr}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950/60 text-slate-300 font-bold">
                          {evt.period === 1 ? '1ª Parte' : evt.period === 2 ? '2ª Parte' : `ET ${evt.period}`}
                        </span>
                      </td>

                      {/* Nombre del botón pulsado */}
                      <td className="p-2.5">
                        <span className="flex items-center gap-1.5 flex-wrap font-black text-slate-50">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span>{evt.event_type || evt.category}</span>
                          {evt.team_name && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 text-[10px] font-bold border border-cyan-800/40">
                              <TeamLogo teamName={evt.team_name} size={13} />
                              <span>{evt.team_name}</span>
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </td>

                      <td className="p-2.5 font-semibold text-slate-200">
                        {evt.player_name || 'Sin asignar'}
                      </td>

                      {/* Atribución de Analista */}
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/70 text-sky-300 text-[10px] font-mono font-semibold border border-sky-800/40">
                          <User className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{evt.created_by_name || 'Analista SAO'}</span>
                        </span>
                      </td>

                      {/* Descriptores marcados */}
                      <td className="p-2.5">
                        {descriptors.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {descriptors.map((d, i) => {
                              const displayVal = formatDescriptorDisplay(d);
                              return (
                                <span
                                  key={`${evt.event_id}_d${i}`}
                                  title={d}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold border inline-block"
                                  style={{
                                    backgroundColor: `${color}26`,
                                    borderColor: `${color}80`,
                                    color: '#e2e8f0',
                                  }}
                                >
                                  {displayVal}
                                </span>
                              );
                            })}
                          </span>
                        ) : evt.outcome ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {formatDescriptorDisplay(evt.outcome)}
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
                              className="p-1 rounded bg-slate-950/50 hover:bg-emerald-600/50 text-emerald-400 hover:text-emerald-200 border border-emerald-700/40 hover:border-emerald-500/60 transition cursor-pointer"
                              title={`▶ Reproducir corte en ventana emergente (Vídeo: ${vidTimeStr} | Partido: ${formatMinSec(evt.timestamp)})`}
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!readOnly && (
                            <>
                              <button
                                onClick={() => handleStartEdit(evt)}
                                className="p-1 rounded bg-slate-950/50 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
                                title="Editar este evento"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteEvent && (
                                <button
                                  onClick={() => setDeletingEventTarget(evt)}
                                  className="p-1 rounded bg-slate-950/50 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-700 transition cursor-pointer"
                                  title="Eliminar este evento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>

                    {/* Detalle desplegable: categoría, coordenadas y metadatos */}
                    {isExpanded && (
                      <tr style={{ backgroundColor: `${color}0f` }}>
                        <td colSpan={7} className="px-3 pb-3 pt-1">
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

                            {Boolean(
                              (evt.goal_x !== null && evt.goal_x !== undefined) ||
                              (evt.metadata?.goal_x !== null && evt.metadata?.goal_x !== undefined) ||
                              evt.goal_zone ||
                              evt.metadata?.goal_zone
                            ) && (
                              <span className="flex items-center gap-1.5">
                                <span className="text-amber-400 font-bold">🥅 Portería:</span>
                                <span className="text-amber-200 font-mono font-bold">
                                  {(evt.goal_zone || evt.metadata?.goal_zone) ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/40">
                                      {evt.goal_zone || evt.metadata?.goal_zone}
                                      {(evt.goal_x ?? evt.metadata?.goal_x) !== null && (evt.goal_x ?? evt.metadata?.goal_x) !== undefined &&
                                        ` (${evt.goal_x ?? evt.metadata?.goal_x}%, ${evt.goal_y ?? evt.metadata?.goal_y}%)`}
                                    </span>
                                  ) : (
                                    `(${evt.goal_x ?? evt.metadata?.goal_x}%, ${evt.goal_y ?? evt.metadata?.goal_y}%)`
                                  )}
                                </span>
                              </span>
                            )}

                            <span className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide">Equipo:</span>
                              <span className="text-slate-200 inline-flex items-center gap-1">
                                <TeamLogo teamName={evt.team_name} size={14} />
                                <span>{evt.team_name || '-'}</span>
                              </span>
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500 font-bold uppercase tracking-wide">Ventana Corte:</span>
                              <span className="text-amber-300 font-mono font-bold">
                                {(() => {
                                  const lead = evt.metadata?.leadTime ?? 0;
                                  const lag = evt.metadata?.lagTime ?? 0;
                                  const leadStr = lead >= 0 ? `-${lead}s` : `+${Math.abs(lead)}s (post-clic)`;
                                  const lagStr = lag >= 0 ? `+${lag}s` : `-${Math.abs(lag)}s (pre-clic)`;
                                  return `${leadStr} / ${lagStr}`;
                                })()}
                              </span>
                            </span>

                            {hasVideoTiming && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                <span className="text-slate-500 font-bold uppercase tracking-wide">Minutaje Vídeo:</span>
                                <span className="text-emerald-400 font-mono font-bold">{vidTimeStr}</span>
                              </span>
                            )}

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

      {/* ── MODAL DE EDICIÓN: MISMA VENTANA (BOTONERA EVENT MODAL) ── */}
      {editingEvent && (() => {
        const matchedButton: BotoneraButton = buttons.find(
          (b) =>
            b.name.toLowerCase().trim() === (editingEvent.event_type || '').toLowerCase().trim() ||
            b.name.toLowerCase().trim() === (editingEvent.category || '').toLowerCase().trim() ||
            b.category.toLowerCase().trim() === (editingEvent.category || '').toLowerCase().trim()
        ) || {
          id: `btn_edit_${editingEvent.event_id}`,
          name: editingEvent.event_type || editingEvent.category || 'Acción Registrada',
          category: editingEvent.category || 'General',
          type: 'category',
          color: (editingEvent.metadata?.buttonColor as any) || 'emerald',
          leadTime: (editingEvent.metadata?.leadTime as number) ?? 5,
          lagTime: (editingEvent.metadata?.lagTime as number) ?? 5,
          pitchRequired: editingEvent.end_x !== null ? 'vector_arrow' : (editingEvent.metadata?.zone || editingEvent.metadata?.zone_name) ? 'zone_remate' : editingEvent.x !== null ? 'point_full' : undefined,
          playerRequiredMode: 'optional',
          teamRequiredMode: 'optional',
          descriptors: [],
          descriptorGroups: [],
        };

        const existingDescriptors: string[] = (() => {
          const list: string[] = [];
          if (Array.isArray(editingEvent.metadata?.descriptors)) {
            list.push(...editingEvent.metadata.descriptors);
          }
          if (editingEvent.subcategory) {
            editingEvent.subcategory.split(',').map((s) => s.trim()).filter(Boolean).forEach((d) => list.push(d));
          }
          if (editingEvent.outcome) {
            list.push(editingEvent.outcome);
            if (!editingEvent.outcome.includes(':')) {
              list.push(`Resultado: ${editingEvent.outcome}`);
            }
          }
          return Array.from(new Set(list));
        })();

        const existingPlayerId =
          editingEvent.player_id ||
          players.find((p) => p.name.toLowerCase().trim() === (editingEvent.player_name || '').toLowerCase().trim())?.id ||
          null;

        const initialPitchData = {
          startX: editingEvent.x ?? null,
          startY: editingEvent.y ?? null,
          endX: editingEvent.end_x ?? null,
          endY: editingEvent.end_y ?? null,
          selectedZone: (editingEvent.metadata?.zone as string) ?? (editingEvent.metadata?.zone_name as string) ?? null,
          goalX: editingEvent.goal_x ?? (editingEvent.metadata?.goal_x as number) ?? null,
          goalY: editingEvent.goal_y ?? (editingEvent.metadata?.goal_y as number) ?? null,
          goalZone: editingEvent.goal_zone ?? (editingEvent.metadata?.goal_zone as string) ?? null,
        };

        return (
          <BotoneraEventModal
            key={editingEvent.event_id}
            button={matchedButton}
            initialGlobalDescriptors={existingDescriptors}
            players={players}
            selectedPlayerId={existingPlayerId}
            currentMatch={match}
            clickTimestamp={editingEvent.timestamp ?? undefined}
            clickPeriod={editingEvent.period ?? undefined}
            matchEvents={events}
            initialPitchData={initialPitchData}
            initialTeamName={editingEvent.team_name}
            isEditing={true}
            onSave={(finalDescriptors, pitchData, modalPlayerId, modalTeamName, modalPlayerObj) => {
              if (!onUpdateEvent) {
                setEditingEvent(null);
                return;
              }

              const activePlayer =
                modalPlayerObj ||
                players.find((p) => p.id === modalPlayerId) ||
                (modalPlayerId ? dbStore.getPlayers().find((p) => p.id === modalPlayerId) : null);

              let outcomeVal =
                finalDescriptors.find((d) => ['Éxito', 'Fallido', 'Gol', 'A puerta', 'Fuera'].includes(d)) ||
                editingEvent.outcome ||
                null;

              const chosenTeamName =
                modalTeamName ||
                (activePlayer ? activePlayer.team_name : editingEvent.team_name) ||
                'Shabab Al Ordon';

              const updated: NormalizedEvent = {
                ...editingEvent,
                team_id: activePlayer?.team_id || editingEvent.team_id || 'team_shabab_al_ordon',
                team_name: chosenTeamName,
                player_id: activePlayer ? activePlayer.id : modalPlayerId !== undefined ? modalPlayerId : editingEvent.player_id,
                player_name: activePlayer ? activePlayer.name : modalPlayerId === null ? 'Jugador Sin Asignar' : editingEvent.player_name || 'Jugador Sin Asignar',
                subcategory: finalDescriptors.join(', ') || null,
                x: pitchData ? pitchData.startX ?? null : editingEvent.x,
                y: pitchData ? pitchData.startY ?? null : editingEvent.y,
                end_x: pitchData ? pitchData.endX ?? null : editingEvent.end_x,
                end_y: pitchData ? pitchData.endY ?? null : editingEvent.end_y,
                goal_x: pitchData ? pitchData.goalX ?? null : editingEvent.goal_x,
                goal_y: pitchData ? pitchData.goalY ?? null : editingEvent.goal_y,
                goal_zone: pitchData ? pitchData.goalZone ?? null : editingEvent.goal_zone,
                outcome: outcomeVal,
                metadata: {
                  ...(editingEvent.metadata || {}),
                  descriptors: finalDescriptors,
                  zone: pitchData ? pitchData.selectedZone ?? null : (editingEvent.metadata?.zone ?? null),
                  goal_x: pitchData ? pitchData.goalX ?? null : (editingEvent.metadata?.goal_x ?? null),
                  goal_y: pitchData ? pitchData.goalY ?? null : (editingEvent.metadata?.goal_y ?? null),
                  goal_zone: pitchData ? pitchData.goalZone ?? null : (editingEvent.metadata?.goal_zone ?? null),
                  buttonId: matchedButton.id,
                  buttonName: matchedButton.name,
                  buttonColor: matchedButton.color,
                },
                updated_at: new Date().toISOString(),
              };

              onUpdateEvent(updated);
              setEditingEvent(null);
            }}
            onCancel={() => setEditingEvent(null)}
          />
        );
      })()}

      {/* ── MODAL CONFIRMACIÓN ALTA SEGURIDAD: BORRAR UN EVENTO SELECCIONADO ── */}
      {deletingEventTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">¿Confirmar eliminación del registro?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ¿Estás seguro de que deseas borrar la acción{' '}
                <strong className="text-amber-400">
                  {deletingEventTarget.event_type || deletingEventTarget.category}
                </strong>{' '}
                de <strong className="text-emerald-400">{deletingEventTarget.player_name}</strong>{' '}
                ({formatMinSec(deletingEventTarget.timestamp)})?
              </p>
            </div>

            <div className="space-y-1.5 text-left bg-slate-950 p-3 rounded-xl border border-slate-800">
              <label className="block text-[10px] font-extrabold uppercase text-amber-400">
                🔒 Medida de Protección (Escribe para Desbloquear):
              </label>
              <p className="text-[11px] text-slate-400">
                Escribe exactamente <strong className="text-red-400 font-mono">BORRAR</strong> para habilitar la eliminación:
              </p>
              <input
                type="text"
                value={singleDeleteInput}
                onChange={(e) => setSingleDeleteInput(e.target.value)}
                placeholder='Escribe "BORRAR"'
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-black text-center focus:outline-none focus:border-red-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setDeletingEventTarget(null);
                  setSingleDeleteInput('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={singleDeleteInput.trim().toUpperCase() !== 'BORRAR'}
                onClick={() => {
                  if (onDeleteEvent && deletingEventTarget) {
                    onDeleteEvent(deletingEventTarget.event_id);
                    updateTrashCount();
                  }
                  setDeletingEventTarget(null);
                  setSingleDeleteInput('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-white font-black text-xs transition flex items-center justify-center gap-1.5 ${
                  singleDeleteInput.trim().toUpperCase() === 'BORRAR'
                    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMACIÓN ALTA SEGURIDAD: BORRAR TODOS LOS EVENTOS DE LA SESIÓN ── */}
      {isConfirmingClearAll && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">¿Borrar TODOS los eventos del análisis?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ¿Estás seguro de que deseas eliminar TODOS los{' '}
                <strong className="text-amber-400 font-extrabold">{events.length} eventos</strong> registrados en este partido?
              </p>
            </div>

            <div className="space-y-1.5 text-left bg-slate-950 p-3 rounded-xl border border-red-900/40">
              <label className="block text-[10px] font-extrabold uppercase text-amber-400">
                ⚠️ Protección Anti-Borrado de Seguridad (Costoso):
              </label>
              <p className="text-[11px] text-slate-300">
                Para evitar pérdidas accidentales de análisis, escribe exactamente <strong className="text-red-400 font-mono">BORRAR TODO</strong>:
              </p>
              <input
                type="text"
                value={clearAllInput}
                onChange={(e) => setClearAllInput(e.target.value)}
                placeholder='Escribe "BORRAR TODO"'
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-red-700/60 text-amber-300 font-mono font-black text-center focus:outline-none focus:border-red-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setIsConfirmingClearAll(false);
                  setClearAllInput('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={clearAllInput.trim().toUpperCase() !== 'BORRAR TODO'}
                onClick={() => {
                  if (onClearAllEvents) {
                    onClearAllEvents();
                    updateTrashCount();
                  }
                  setIsConfirmingClearAll(false);
                  setClearAllInput('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-white font-black text-xs transition flex items-center justify-center gap-1.5 ${
                  clearAllInput.trim().toUpperCase() === 'BORRAR TODO'
                    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/40 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Borrar Todo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
