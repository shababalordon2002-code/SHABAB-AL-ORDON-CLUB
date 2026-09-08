'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  Clock,
  Save,
  CheckCircle2,
  FolderPlus,
  Grid,
  Maximize2,
  Move,
  Palette,
  Pencil,
  Type,
  Layout,
  MousePointer,
  RotateCcw,
  Users,
  UserCheck,
  AlertCircle,
  Copy,
  Clipboard,
  Files,
  Shield,
  Check,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { BotoneraButton, BotoneraTemplate } from '@/types';
import { dbStore } from '@/lib/store/db-store';

interface BotoneraPanelEditorProps {
  template: BotoneraTemplate;
  onUpdateTemplate: (tmpl: BotoneraTemplate) => void;
  onTriggerEvent: (button: BotoneraButton, selectedDescriptors: string[]) => void;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; hover: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-600/30', border: 'border-emerald-400/80', text: 'text-emerald-200', hover: 'hover:bg-emerald-600/45', ring: 'ring-emerald-400' },
  amber: { bg: 'bg-amber-600/30', border: 'border-amber-400/80', text: 'text-amber-200', hover: 'hover:bg-amber-600/45', ring: 'ring-amber-400' },
  red: { bg: 'bg-red-600/30', border: 'border-red-400/80', text: 'text-red-200', hover: 'hover:bg-red-600/45', ring: 'ring-red-400' },
  rose: { bg: 'bg-rose-600/30', border: 'border-rose-400/80', text: 'text-rose-200', hover: 'hover:bg-rose-600/45', ring: 'ring-rose-400' },
  blue: { bg: 'bg-blue-600/30', border: 'border-blue-400/80', text: 'text-blue-200', hover: 'hover:bg-blue-600/45', ring: 'ring-blue-400' },
  cyan: { bg: 'bg-cyan-600/30', border: 'border-cyan-400/80', text: 'text-cyan-200', hover: 'hover:bg-cyan-600/45', ring: 'ring-cyan-400' },
  orange: { bg: 'bg-orange-600/30', border: 'border-orange-400/80', text: 'text-orange-200', hover: 'hover:bg-orange-600/45', ring: 'ring-orange-400' },
  purple: { bg: 'bg-purple-600/30', border: 'border-purple-400/80', text: 'text-purple-200', hover: 'hover:bg-purple-600/45', ring: 'ring-purple-400' },
  indigo: { bg: 'bg-indigo-600/30', border: 'border-indigo-400/80', text: 'text-indigo-200', hover: 'hover:bg-indigo-600/45', ring: 'ring-indigo-400' },
  pink: { bg: 'bg-pink-600/30', border: 'border-pink-400/80', text: 'text-pink-200', hover: 'hover:bg-pink-600/45', ring: 'ring-pink-400' },
  sky: { bg: 'bg-sky-600/30', border: 'border-sky-400/80', text: 'text-sky-200', hover: 'hover:bg-sky-600/45', ring: 'ring-sky-400' },
  violet: { bg: 'bg-violet-600/30', border: 'border-violet-400/80', text: 'text-violet-200', hover: 'hover:bg-violet-600/45', ring: 'ring-violet-400' },
  slate: { bg: 'bg-slate-800/80', border: 'border-slate-600', text: 'text-slate-200', hover: 'hover:bg-slate-800', ring: 'ring-slate-400' },
  zinc: { bg: 'bg-zinc-800/80', border: 'border-zinc-600', text: 'text-zinc-200', hover: 'hover:bg-zinc-800', ring: 'ring-zinc-400' },
};

export const EXPANDED_COLOR_OPTIONS = [
  // Greens & Cyans
  { key: 'emerald', name: 'Verde Esmeralda', hex: '#10b981' },
  { key: 'mint', name: 'Menta Neón', hex: '#00e676' },
  { key: 'lime', name: 'Lima Táctica', hex: '#84cc16' },
  { key: 'green', name: 'Verde Campo', hex: '#22c55e' },
  { key: 'teal', name: 'Teal Táctico', hex: '#14b8a6' },
  { key: 'cyan', name: 'Cian Neón', hex: '#06b6d4' },
  { key: 'sky', name: 'Cielo Claro', hex: '#0ea5e9' },

  // Blues, Violets & Pinks
  { key: 'blue', name: 'Azul Táctico', hex: '#3b82f6' },
  { key: 'indigo', name: 'Índigo Profundo', hex: '#6366f1' },
  { key: 'violet', name: 'Violeta Eléctrico', hex: '#8b5cf6' },
  { key: 'purple', name: 'Púrpura Táctico', hex: '#a855f7' },
  { key: 'fuchsia', name: 'Fucsia Neón', hex: '#d946ef' },
  { key: 'pink', name: 'Rosa Neón', hex: '#ec4899' },
  { key: 'rose', name: 'Rosa Fallo', hex: '#f43f5e' },

  // Reds, Oranges, Ambers & Golds
  { key: 'red', name: 'Rojo Alerta', hex: '#ef4444' },
  { key: 'coral', name: 'Coral Intenso', hex: '#ff5722' },
  { key: 'orange', name: 'Naranja Fuego', hex: '#f97316' },
  { key: 'amber', name: 'Ámbar / Amarillo', hex: '#f59e0b' },
  { key: 'yellow', name: 'Amarillo Neón', hex: '#eab308' },
  { key: 'gold', name: 'Oro Táctico', hex: '#d97706' },
  { key: 'bronze', name: 'Bronce Oscuro', hex: '#b45309' },

  // Neutrals & Dark Shades
  { key: 'slate', name: 'Gris Neutro', hex: '#64748b' },
  { key: 'zinc', name: 'Cinc Oscuro', hex: '#71717a' },
  { key: 'neutral', name: 'Gris Medio', hex: '#737373' },
  { key: 'stone', name: 'Piedra Táctica', hex: '#78716c' },
  { key: 'dark_slate', name: 'Pizarra Oscura', hex: '#334155' },
  { key: 'charcoal', name: 'Carbón', hex: '#1f2937' },
  { key: 'midnight', name: 'Medianoche', hex: '#0f172a' },
];

export const PITCH_MODE_OPTIONS = [
  { key: 'none', title: 'Sin Campograma', desc: 'Sin registro espacial', icon: '⚡' },
  { key: 'point_full', title: 'Punto (Campo)', desc: 'Punto (X, Y) campo entero', icon: '📍' },
  { key: 'point_half', title: 'Punto (Medio)', desc: 'Punto (X, Y) medio campo', icon: '📌' },
  { key: 'vector_arrow', title: 'Vector / Flechas', desc: 'Origen ➔ Destino (Pase, tiro)', icon: '🏹' },
  { key: 'zone_bandas_centro', title: 'Bandas y Centro', desc: '3 pasillos (Izq, Centro, Der)', icon: '↔️' },
  { key: 'zone_3_hitos', title: '3 Zonas', desc: 'Inicio - Creación - Finalización', icon: '📶' },
  { key: 'zone_4_zonas', title: '4 Cuadrantes', desc: 'Cuadrícula 2x2', icon: '📊' },
  { key: 'zone_remate', title: 'Zonas Remate', desc: 'Área pequeña, área grande, borde', icon: '🎯' },
  { key: 'zone_counter', title: 'Conteo por Zona', desc: 'Zonas con contador numérico', icon: '🔢' },
];

export function MiniPitchDiagram({ mode }: { mode: string }) {
  return (
    <svg viewBox="0 0 100 60" className="w-full h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
      {/* Outer Pitch Line */}
      <rect x="4" y="4" width="92" height="52" rx="3" fill="#0d2419" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Center Line */}
      <line x1="50" y1="4" x2="50" y2="56" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Center Circle */}
      <circle cx="50" cy="30" r="8" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Penalty Boxes */}
      <rect x="4" y="16" width="14" height="28" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.5" />
      <rect x="82" y="16" width="14" height="28" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.5" />

      {/* Mode Specific Vector Diagrams */}
      {mode === 'none' && (
        <g>
          <line x1="25" y1="15" x2="75" y2="45" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />
          <circle cx="50" cy="30" r="14" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
        </g>
      )}

      {mode === 'point_full' && (
        <g>
          <circle cx="68" cy="22" r="5" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="1" />
          <circle cx="68" cy="22" r="2.5" fill="#ef4444" />
        </g>
      )}

      {mode === 'point_half' && (
        <g>
          <rect x="50" y="4" width="46" height="52" fill="#10b981" fillOpacity="0.15" />
          <circle cx="82" cy="30" r="4.5" fill="#06b6d4" fillOpacity="0.3" stroke="#06b6d4" strokeWidth="1" />
          <circle cx="82" cy="30" r="2" fill="#06b6d4" />
        </g>
      )}

      {mode === 'vector_arrow' && (
        <g>
          <circle cx="26" cy="42" r="2.5" fill="#3b82f6" />
          <path d="M 26 42 Q 50 16 74 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="2.5 1.5" />
          <polygon points="74,24 68,20 70,26" fill="#f59e0b" />
          <circle cx="74" cy="24" r="2.5" fill="#f59e0b" />
        </g>
      )}

      {mode === 'zone_bandas_centro' && (
        <g>
          <rect x="4" y="4" width="92" height="15" fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <rect x="4" y="19" width="92" height="22" fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2 2" />
          <rect x="4" y="41" width="92" height="15" fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="50" y="14" fill="#93c5fd" fontSize="5" fontWeight="bold" textAnchor="middle">Izq</text>
          <text x="50" y="32" fill="#6ee7b7" fontSize="5" fontWeight="bold" textAnchor="middle">Centro</text>
          <text x="50" y="51" fill="#93c5fd" fontSize="5" fontWeight="bold" textAnchor="middle">Der</text>
        </g>
      )}

      {mode === 'zone_3_hitos' && (
        <g>
          <rect x="4" y="4" width="29" height="52" fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <rect x="33" y="4" width="34" height="52" fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2 2" />
          <rect x="67" y="4" width="29" height="52" fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="18" y="32" fill="#93c5fd" fontSize="5" fontWeight="bold" textAnchor="middle">Inicio</text>
          <text x="50" y="32" fill="#6ee7b7" fontSize="5" fontWeight="bold" textAnchor="middle">Creación</text>
          <text x="81" y="32" fill="#f87171" fontSize="5" fontWeight="bold" textAnchor="middle">Finaliz.</text>
        </g>
      )}

      {mode === 'zone_4_zonas' && (
        <g>
          <rect x="4" y="4" width="46" height="26" fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="0.5" />
          <rect x="50" y="4" width="46" height="26" fill="#8b5cf6" fillOpacity="0.25" stroke="#8b5cf6" strokeWidth="0.5" />
          <rect x="4" y="30" width="46" height="26" fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="0.5" />
          <rect x="50" y="30" width="46" height="26" fill="#f59e0b" fillOpacity="0.25" stroke="#f59e0b" strokeWidth="0.5" />
          <text x="27" y="19" fill="#93c5fd" fontSize="5" fontWeight="bold" textAnchor="middle">Z1</text>
          <text x="73" y="19" fill="#c4b5fd" fontSize="5" fontWeight="bold" textAnchor="middle">Z2</text>
          <text x="27" y="45" fill="#6ee7b7" fontSize="5" fontWeight="bold" textAnchor="middle">Z3</text>
          <text x="73" y="45" fill="#fcd34d" fontSize="5" fontWeight="bold" textAnchor="middle">Z4</text>
        </g>
      )}

      {mode === 'zone_remate' && (
        <g>
          <rect x="70" y="17" width="26" height="26" fill="#ef4444" fillOpacity="0.35" stroke="#ef4444" strokeWidth="0.8" />
          <rect x="84" y="21" width="12" height="18" fill="#f59e0b" fillOpacity="0.45" stroke="#f59e0b" strokeWidth="0.8" />
          <text x="90" y="32" fill="#fbbf24" fontSize="4.5" fontWeight="bold" textAnchor="middle">AP</text>
          <text x="77" y="32" fill="#f87171" fontSize="4.5" fontWeight="bold" textAnchor="middle">AG</text>
        </g>
      )}

      {mode === 'zone_counter' && (
        <g>
          <rect x="4" y="4" width="30" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
          <rect x="34" y="4" width="32" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
          <rect x="66" y="4" width="30" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
          <rect x="4" y="30" width="30" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
          <rect x="34" y="30" width="32" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
          <rect x="66" y="30" width="30" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.5" />
          <circle cx="19" cy="17" r="4" fill="#10b981" />
          <text x="19" y="19.5" fill="#000" fontSize="5" fontWeight="bold" textAnchor="middle">1</text>
          <circle cx="50" cy="17" r="4" fill="#10b981" />
          <text x="50" y="19.5" fill="#000" fontSize="5" fontWeight="bold" textAnchor="middle">2</text>
          <circle cx="81" cy="17" r="4" fill="#10b981" />
          <text x="81" y="19.5" fill="#000" fontSize="5" fontWeight="bold" textAnchor="middle">3</text>
        </g>
      )}
    </svg>
  );
}

export function getButtonColorHex(colorStr: string): string {
  if (!colorStr) return '#10b981';
  if (colorStr.startsWith('#')) return colorStr;
  const matched = EXPANDED_COLOR_OPTIONS.find(c => c.key === colorStr);
  return matched ? matched.hex : '#10b981';
}

export function getTextColorStyle(colorStr: string): { color: string } {
  if (!colorStr) return { color: '#60a5fa' };
  if (colorStr.startsWith('#')) return { color: colorStr };
  const hex = getButtonColorHex(colorStr);
  return { color: hex || '#60a5fa' };
}

export function getButtonStyles(colorStr: string) {
  if (!colorStr) colorStr = 'emerald';
  
  if (COLOR_MAP[colorStr]) {
    const c = COLOR_MAP[colorStr];
    return {
      className: `${c.bg} ${c.border} ${c.text} ${c.hover}`,
      style: {}
    };
  }

  const hex = getButtonColorHex(colorStr);
  return {
    className: 'hover:brightness-125 transition-all text-white border shadow-md',
    style: {
      backgroundColor: `${hex}35`,
      borderColor: `${hex}bb`,
      color: '#ffffff',
      boxShadow: `0 0 10px ${hex}25`
    }
  };
}

export const BotoneraPanelEditor: React.FC<BotoneraPanelEditorProps> = ({
  template,
  onUpdateTemplate,
  onTriggerEvent,
  isTimerRunning,
  onToggleTimer,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [templatesList, setTemplatesList] = useState<BotoneraTemplate[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeDescriptors, setActiveDescriptors] = useState<string[]>([]);
  const [lastClickedButtonId, setLastClickedButtonId] = useState<string | null>(null);

  // Drag & Resize Canvas Interaction State
  const [draggingBtnId, setDraggingBtnId] = useState<string | null>(null);
  const [resizingBtnId, setResizingBtnId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBtnState, setInitialBtnState] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 20,
    h: 15,
  });

  // Selected Button for Editing Modals State
  const [selectedBtnId, setSelectedBtnId] = useState<string | null>(null);
  const [selectedBtnIds, setSelectedBtnIds] = useState<string[]>([]);
  const [clipboardButtons, setClipboardButtons] = useState<BotoneraButton[]>([]);
  const [isSelectingBox, setIsSelectingBox] = useState<boolean>(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  const [editingButton, setEditingButton] = useState<BotoneraButton | null>(null);
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [descriptorInputText, setDescriptorInputText] = useState('');
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateDesc, setNewTemplateDesc] = useState<string>('');
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<BotoneraTemplate | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Drag & Drop Descriptor Group Reordering State
  const [draggedGrpIdx, setDraggedGrpIdx] = useState<number | null>(null);
  const [dragOverGrpIdx, setDragOverGrpIdx] = useState<number | null>(null);

  // Drag & Drop Descriptor Option Reordering State
  const [draggedOptIdx, setDraggedOptIdx] = useState<{ grpIdx: number; optIdx: number } | null>(null);
  const [dragOverOptIdx, setDragOverOptIdx] = useState<{ grpIdx: number; optIdx: number } | null>(null);

  const moveDescriptorGroup = (fromIdx: number, toIdx: number) => {
    if (!editingButton || !editingButton.descriptorGroups) return;
    if (toIdx < 0 || toIdx >= editingButton.descriptorGroups.length) return;
    const updated = [...editingButton.descriptorGroups];
    const [removed] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, removed);
    setEditingButton({ ...editingButton, descriptorGroups: updated });
  };

  const moveDescriptorOption = (grpIdx: number, fromIdx: number, toIdx: number) => {
    if (!editingButton || !editingButton.descriptorGroups) return;
    const grp = editingButton.descriptorGroups[grpIdx];
    if (!grp || !grp.options) return;
    if (toIdx < 0 || toIdx >= grp.options.length) return;
    const updatedGrps = [...editingButton.descriptorGroups];
    const updatedOpts = [...updatedGrps[grpIdx].options];
    const [removed] = updatedOpts.splice(fromIdx, 1);
    updatedOpts.splice(toIdx, 0, removed);
    updatedGrps[grpIdx] = { ...updatedGrps[grpIdx], options: updatedOpts };
    setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
  };

  // Duplication, Copy, Paste & Delete Handlers
  const handleDuplicateSelected = (idsToDuplicate?: string[]) => {
    const activeIds = idsToDuplicate || (selectedBtnIds.length > 0 ? selectedBtnIds : selectedBtnId ? [selectedBtnId] : []);
    if (activeIds.length === 0) return;

    const targets = template.buttons.filter((b) => activeIds.includes(b.id));
    if (targets.length === 0) return;

    const now = Date.now();
    const duplicated: BotoneraButton[] = targets.map((btn, index) => ({
      ...JSON.parse(JSON.stringify(btn)),
      id: `btn_dup_${now}_${index}_${Math.floor(Math.random() * 1000)}`,
      name: btn.type === 'header' ? btn.name : `${btn.name} (Copia)`,
      x: Math.min(82, (btn.x ?? 5) + 3),
      y: Math.min(82, (btn.y ?? 5) + 3),
    }));

    const updatedTmpl = {
      ...template,
      buttons: [...template.buttons, ...duplicated],
    };

    onUpdateTemplate(updatedTmpl);
    dbStore.saveBotoneraTemplate(updatedTmpl);

    const newIds = duplicated.map((d) => d.id);
    setSelectedBtnIds(newIds);
    if (newIds.length === 1) setSelectedBtnId(newIds[0]);

    setSaveSuccessToast(`👯 ${duplicated.length} elemento(s) duplicado(s)`);
    setTimeout(() => setSaveSuccessToast(null), 2500);
  };

  const handleCopySelected = () => {
    const activeIds = selectedBtnIds.length > 0 ? selectedBtnIds : selectedBtnId ? [selectedBtnId] : [];
    if (activeIds.length === 0) return;

    const targets = template.buttons.filter((b) => activeIds.includes(b.id));
    if (targets.length === 0) return;

    setClipboardButtons(JSON.parse(JSON.stringify(targets)));
    setSaveSuccessToast(`📋 ${targets.length} elemento(s) copiado(s) al portapapeles`);
    setTimeout(() => setSaveSuccessToast(null), 2500);
  };

  const handlePasteSelected = () => {
    if (clipboardButtons.length === 0) return;

    const now = Date.now();
    const pasted: BotoneraButton[] = clipboardButtons.map((btn, index) => ({
      ...JSON.parse(JSON.stringify(btn)),
      id: `btn_paste_${now}_${index}_${Math.floor(Math.random() * 1000)}`,
      x: Math.min(82, (btn.x ?? 5) + 4),
      y: Math.min(82, (btn.y ?? 5) + 4),
    }));

    const updatedTmpl = {
      ...template,
      buttons: [...template.buttons, ...pasted],
    };

    onUpdateTemplate(updatedTmpl);
    dbStore.saveBotoneraTemplate(updatedTmpl);

    const newIds = pasted.map((p) => p.id);
    setSelectedBtnIds(newIds);
    if (newIds.length === 1) setSelectedBtnId(newIds[0]);

    setSaveSuccessToast(`📑 ${pasted.length} elemento(s) pegado(s)`);
    setTimeout(() => setSaveSuccessToast(null), 2500);
  };

  const handleDeleteSelected = () => {
    const activeIds = selectedBtnIds.length > 0 ? selectedBtnIds : selectedBtnId ? [selectedBtnId] : [];
    if (activeIds.length === 0) return;

    const filtered = template.buttons.filter((b) => !activeIds.includes(b.id));
    const updatedTmpl = { ...template, buttons: filtered };
    onUpdateTemplate(updatedTmpl);
    dbStore.saveBotoneraTemplate(updatedTmpl);

    setSelectedBtnIds([]);
    setSelectedBtnId(null);
    setEditingButton(null);
  };

  useEffect(() => {
    const loaded = dbStore.getBotoneraTemplates();
    setTemplatesList(loaded);
  }, [template]);

  // Ensure all buttons have default percentage X, Y, W, H coordinates for the canvas
  useEffect(() => {
    let needsUpdate = false;
    const buttonsWithCoords = template.buttons.map((btn, index) => {
      if (btn.x === undefined || btn.y === undefined || btn.w === undefined || btn.h === undefined) {
        needsUpdate = true;
        // Arrange missing coordinates in a neat grid across the slide canvas
        const itemsPerRow = 4;
        const col = index % itemsPerRow;
        const row = Math.floor(index / itemsPerRow);

        return {
          ...btn,
          x: btn.x ?? 3 + col * 24,
          y: btn.y ?? 4 + row * 18,
          w: btn.w ?? (btn.type === 'descriptor' ? 18 : 22),
          h: btn.h ?? (btn.type === 'descriptor' ? 12 : 15),
        };
      }
      return btn;
    });

    if (needsUpdate) {
      onUpdateTemplate({ ...template, buttons: buttonsWithCoords });
    }
  }, [template.buttons]);

  // Keyboard Shortcuts Listener (Timer, Triggers & Copy/Paste/Duplicate/Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (isEditMode) {
        const isCmdOrCtrl = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        if (isCmdOrCtrl && key === 'c') {
          e.preventDefault();
          handleCopySelected();
          return;
        }

        if (isCmdOrCtrl && key === 'v') {
          e.preventDefault();
          handlePasteSelected();
          return;
        }

        if (isCmdOrCtrl && key === 'd') {
          e.preventDefault();
          handleDuplicateSelected();
          return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteSelected();
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onToggleTimer();
        return;
      }

      const pressedKey = e.key.toUpperCase();
      const matchedBtn = template.buttons.find(
        (b) => b.keyShortcut && b.keyShortcut.toUpperCase() === pressedKey
      );

      if (matchedBtn) {
        e.preventDefault();
        handleButtonClick(matchedBtn);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [template.buttons, activeDescriptors, isTimerRunning, isEditMode, selectedBtnIds, selectedBtnId, clipboardButtons]);

  const handleButtonClick = (btn: BotoneraButton) => {
    if (isEditMode) {
      setSelectedBtnId(btn.id);
      return;
    }

    if (btn.type === 'header' || btn.type === 'text') {
      return; // Visual grouping titles do not trigger events
    }

    if (btn.type === 'descriptor') {
      const tagVal = btn.outcome || btn.subTag || btn.name;
      if (activeDescriptors.includes(tagVal)) {
        setActiveDescriptors(activeDescriptors.filter((t) => t !== tagVal));
      } else {
        setActiveDescriptors([...activeDescriptors, tagVal]);
      }
    } else {
      setLastClickedButtonId(btn.id);
      setTimeout(() => setLastClickedButtonId(null), 400);
      onTriggerEvent(btn, activeDescriptors);
    }
  };

  // --- FREEFORM DRAG & DROP ENGINE (POWERPOINT STYLE) ---
  const [initialStatesMap, setInitialStatesMap] = useState<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

  const handleStartDrag = (e: React.MouseEvent, btn: BotoneraButton) => {
    if (!isEditMode) return;
    e.stopPropagation();

    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
    let currentSelected = selectedBtnIds;
    if (!isMulti && !selectedBtnIds.includes(btn.id)) {
      currentSelected = [btn.id];
      setSelectedBtnIds([btn.id]);
    } else if (isMulti && !selectedBtnIds.includes(btn.id)) {
      currentSelected = [...selectedBtnIds, btn.id];
      setSelectedBtnIds(currentSelected);
    }
    setSelectedBtnId(btn.id);

    setDraggingBtnId(btn.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const map = new Map<string, { x: number; y: number; w: number; h: number }>();
    template.buttons.forEach((b) => {
      if (currentSelected.includes(b.id) || b.id === btn.id) {
        map.set(b.id, { x: b.x ?? 5, y: b.y ?? 5, w: b.w ?? 20, h: b.h ?? 15 });
      }
    });
    setInitialStatesMap(map);
  };

  // --- RESIZE HANDLE ENGINE (POWERPOINT STYLE) ---
  const handleStartResize = (e: React.MouseEvent, btn: BotoneraButton) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setSelectedBtnId(btn.id);
    setSelectedBtnIds([btn.id]);
    setResizingBtnId(btn.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialBtnState({
      x: btn.x ?? 5,
      y: btn.y ?? 5,
      w: btn.w ?? 22,
      h: btn.h ?? 15,
    });
  };

  // --- MARQUEE BOX SELECTION ON CANVAS BACKGROUND ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    if (e.target !== canvasRef.current) return;

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedBtnIds([]);
      setSelectedBtnId(null);
    }

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const startXPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const startYPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      setIsSelectingBox(true);
      setSelectionBox({
        startX: startXPct,
        startY: startYPct,
        currentX: startXPct,
        currentY: startYPct,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const currentXPct = Math.max(0, Math.min(100, ((e.clientX - canvasRect.left) / canvasRect.width) * 100));
    const currentYPct = Math.max(0, Math.min(100, ((e.clientY - canvasRect.top) / canvasRect.height) * 100));

    // Handle Rubberband Selection Marquee Box
    if (isSelectingBox && selectionBox) {
      setSelectionBox({
        ...selectionBox,
        currentX: currentXPct,
        currentY: currentYPct,
      });

      const boxL = Math.min(selectionBox.startX, currentXPct);
      const boxR = Math.max(selectionBox.startX, currentXPct);
      const boxT = Math.min(selectionBox.startY, currentYPct);
      const boxB = Math.max(selectionBox.startY, currentYPct);

      const intersectingIds = template.buttons
        .filter((btn) => {
          const btnL = btn.x ?? 5;
          const btnR = (btn.x ?? 5) + (btn.w ?? 20);
          const btnT = btn.y ?? 5;
          const btnB = (btn.y ?? 5) + (btn.h ?? 15);

          return btnL < boxR && btnR > boxL && btnT < boxB && btnB > boxT;
        })
        .map((b) => b.id);

      setSelectedBtnIds(intersectingIds);
      if (intersectingIds.length === 1) setSelectedBtnId(intersectingIds[0]);
      return;
    }

    if (draggingBtnId) {
      const deltaXPixels = e.clientX - dragStartPos.x;
      const deltaYPixels = e.clientY - dragStartPos.y;

      const deltaXPct = (deltaXPixels / canvasRect.width) * 100;
      const deltaYPct = (deltaYPixels / canvasRect.height) * 100;

      const activeIds = selectedBtnIds.includes(draggingBtnId) ? selectedBtnIds : [draggingBtnId];

      const updatedButtons = template.buttons.map((b) => {
        if (activeIds.includes(b.id)) {
          const init = initialStatesMap.get(b.id) || { x: b.x ?? 5, y: b.y ?? 5, w: b.w ?? 22, h: b.h ?? 15 };
          let newX = Math.round(init.x + deltaXPct);
          let newY = Math.round(init.y + deltaYPct);

          newX = Math.min(100 - init.w, Math.max(0, newX));
          newY = Math.min(100 - init.h, Math.max(0, newY));
          return { ...b, x: newX, y: newY };
        }
        return b;
      });

      onUpdateTemplate({ ...template, buttons: updatedButtons });
    } else if (resizingBtnId) {
      const deltaXPixels = e.clientX - dragStartPos.x;
      const deltaYPixels = e.clientY - dragStartPos.y;

      const deltaXPct = (deltaXPixels / canvasRect.width) * 100;
      const deltaYPct = (deltaYPixels / canvasRect.height) * 100;

      let newW = Math.round(initialBtnState.w + deltaXPct);
      let newH = Math.round(initialBtnState.h + deltaYPct);

      // Minimum box size limit
      newW = Math.min(100 - initialBtnState.x, Math.max(6, newW));
      newH = Math.min(100 - initialBtnState.y, Math.max(6, newH));

      const updatedButtons = template.buttons.map((b) =>
        b.id === resizingBtnId ? { ...b, w: newW, h: newH } : b
      );

      onUpdateTemplate({ ...template, buttons: updatedButtons });
    }
  };

  const handleMouseUp = () => {
    if (draggingBtnId || resizingBtnId || isSelectingBox) {
      setDraggingBtnId(null);
      setResizingBtnId(null);
      setIsSelectingBox(false);
      setSelectionBox(null);
      dbStore.saveBotoneraTemplate(template);
    }
  };

  const handleSelectTemplateFromDropdown = (tmplId: string) => {
    const found = templatesList.find((t) => t.id === tmplId);
    if (found) {
      onUpdateTemplate(found);
    }
  };

  const handleSaveCurrentTemplate = () => {
    dbStore.saveBotoneraTemplate(template);
    setTemplatesList(dbStore.getBotoneraTemplates());
    setSaveSuccessToast(`¡Pizarra "${template.name}" guardada!`);
    setTimeout(() => setSaveSuccessToast(null), 3500);
  };

  // CREATE NEW BOTONERA FROM 0 (EMPTY BUTTONS ARRAY)
  const handleCreateNewTemplateFromZero = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTmpl: BotoneraTemplate = {
      id: `tmpl_${Date.now()}`,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || 'Pizarra táctica personalizada desde 0',
      isDefault: false,
      gridCols: 12,
      buttons: [], // ZERO BUTTONS - EMPTY POWERPOINT CANVAS!
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dbStore.saveBotoneraTemplate(newTmpl);
    setTemplatesList(dbStore.getBotoneraTemplates());
    onUpdateTemplate(newTmpl);
    setIsNewTemplateModalOpen(false);
    setIsEditMode(true);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setSaveSuccessToast(`¡Pizarra creada desde 0! Arrastra y diseña tus botones.`);
    setTimeout(() => setSaveSuccessToast(null), 4000);
  };

  const handleRenameTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const updated: BotoneraTemplate = {
      ...template,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || template.description,
      updated_at: new Date().toISOString(),
    };

    dbStore.saveBotoneraTemplate(updated);
    setTemplatesList(dbStore.getBotoneraTemplates());
    onUpdateTemplate(updated);
    setIsRenameModalOpen(false);
    setSaveSuccessToast(`¡Nombre actualizado a "${updated.name}"!`);
    setTimeout(() => setSaveSuccessToast(null), 3500);
  };

  const handleDeleteTemplate = () => {
    if (template.isDefault) {
      alert('La plantilla predeterminada no se puede eliminar.');
      return;
    }
    setDeleteConfirmTemplate(template);
  };

  const confirmDeleteTemplate = () => {
    if (!deleteConfirmTemplate) return;
    dbStore.deleteBotoneraTemplate(deleteConfirmTemplate.id);
    const remaining = dbStore.getBotoneraTemplates();
    setTemplatesList(remaining);
    if (remaining.length > 0) {
      onUpdateTemplate(remaining[0]);
    }
    const deletedName = deleteConfirmTemplate.name;
    setDeleteConfirmTemplate(null);
    setSaveSuccessToast(`🗑️ Pizarra "${deletedName}" eliminada correctamente.`);
    setTimeout(() => setSaveSuccessToast(null), 3000);
  };

  const handleAddButtonToCanvas = (type: 'category' | 'descriptor' | 'header') => {
    const isHeader = type === 'header';
    const isCat = type === 'category';
    const count = template.buttons.length;

    // Position new button cleanly in rows across canvas
    const itemsPerRow = 4;
    const col = count % itemsPerRow;
    const row = Math.floor(count / itemsPerRow);

    const newBtn: BotoneraButton = {
      id: `btn_${Date.now()}`,
      name: isHeader ? 'FASE DE ATAQUE' : isCat ? 'NUEVA ACCIÓN' : 'NUEVA ETIQUETA',
      category: isHeader ? 'Título' : isCat ? 'Ataque' : 'General',
      type: type,
      color: isHeader ? 'blue' : isCat ? 'emerald' : 'amber',
      keyShortcut: '',
      leadTime: 5,
      lagTime: 5,
      x: Math.min(75, 3 + col * 24),
      y: Math.min(80, 4 + row * 18),
      w: isHeader ? 35 : isCat ? 22 : 18,
      h: isHeader ? 9 : isCat ? 15 : 12,
      fontSize: isHeader ? 'xl' : 'md',
    };

    const updatedTmpl = { ...template, buttons: [...template.buttons, newBtn] };
    onUpdateTemplate(updatedTmpl);
    dbStore.saveBotoneraTemplate(updatedTmpl);
    setSelectedBtnId(newBtn.id);
    setEditingButton(newBtn);
  };

  const handleDeleteButton = (buttonId: string) => {
    const filtered = template.buttons.filter((b) => b.id !== buttonId);
    const updatedTmpl = { ...template, buttons: filtered };
    onUpdateTemplate(updatedTmpl);
    dbStore.saveBotoneraTemplate(updatedTmpl);
    setSelectedBtnId(null);
    setEditingButton(null);
  };

  const handleSaveEditedButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingButton) return;

    const updatedButtons = template.buttons.map((b) =>
      b.id === editingButton.id ? editingButton : b
    );

    const updatedTmpl = { ...template, buttons: updatedButtons };
    onUpdateTemplate(updatedTmpl);
    dbStore.saveBotoneraTemplate(updatedTmpl);
    setEditingButton(null);
  };

  const selectedButton = template.buttons.find((b) => b.id === selectedBtnId);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 select-none">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 text-slate-950 font-bold shadow-md">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Pizarra de Botonera:</span>
              <select
                value={template.id}
                onChange={(e) => handleSelectTemplateFromDropdown(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-xs font-extrabold text-emerald-400 focus:outline-none cursor-pointer max-w-xs truncate"
              >
                {templatesList.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                    🎨 {t.name} ({t.buttons.length} objetos) {t.isDefault ? '[Default]' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-0.5" suppressHydrationWarning>{template.description}</p>
          </div>
        </div>

        {/* Template Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewTemplateName('');
              setNewTemplateDesc('');
              setIsNewTemplateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
            title="Crear una nueva botonera completamente desde 0"
          >
            <FolderPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Crear Pizarra desde 0</span>
          </button>

          <button
            onClick={() => {
              setNewTemplateName(template.name);
              setNewTemplateDesc(template.description);
              setIsRenameModalOpen(true);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
            title="Renombrar Pizarra"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSaveCurrentTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            title="Guardar diseño de esta pizarra"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guardar Pizarra</span>
          </button>

          {!template.isDefault && (
            <button
              onClick={handleDeleteTemplate}
              className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs transition"
              title="Eliminar esta pizarra"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition shadow border ${
              isEditMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-950/30'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>{isEditMode ? '✔ Finalizar Edición Pizarra' : '🎨 Mover & Editar en Pizarra (Estilo PowerPoint)'}</span>
          </button>
        </div>
      </div>

      {saveSuccessToast && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* EDIT MODE TOOLBAR INSTRUCTIONS & CLIPBOARD CONTROLS */}
      {isEditMode && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <MousePointer className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
            <span>
              <strong>PIZARRA TIPO POWERPOINT:</strong> Arrastra objetos, selecciona con ratón o <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">Shift</kbd>, y usa <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">Ctrl+C</kbd> / <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">Ctrl+V</kbd> para copiar/pegar, o <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">Ctrl+D</kbd> para duplicar.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Objects Creation */}
            <button
              onClick={() => handleAddButtonToCanvas('category')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Acción</span>
            </button>

            <button
              onClick={() => handleAddButtonToCanvas('descriptor')}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Etiqueta</span>
            </button>

            <button
              onClick={() => handleAddButtonToCanvas('header')}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow border border-indigo-400/40"
            >
              <Type className="w-3.5 h-3.5" />
              <span>+ Título</span>
            </button>

            {/* Separator Divider */}
            <div className="h-4 w-px bg-slate-700/80 mx-1" />

            {/* Copy / Paste / Duplicate / Delete Actions */}
            <button
              onClick={handleCopySelected}
              disabled={selectedBtnIds.length === 0 && !selectedBtnId}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Copiar selección al portapapeles (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>Copiar</span>
            </button>

            <button
              onClick={handlePasteSelected}
              disabled={clipboardButtons.length === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Pegar elementos copiados (Ctrl+V)"
            >
              <Clipboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Pegar {clipboardButtons.length > 0 ? `(${clipboardButtons.length})` : ''}</span>
            </button>

            <button
              onClick={() => handleDuplicateSelected()}
              disabled={selectedBtnIds.length === 0 && !selectedBtnId}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Duplicar selección al instante (Ctrl+D)"
            >
              <Files className="w-3.5 h-3.5 text-amber-400" />
              <span>Duplicar</span>
            </button>

            {(selectedBtnIds.length > 0 || selectedBtnId) && (
              <button
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 text-xs font-bold flex items-center gap-1 border border-red-500/40 transition"
                title="Eliminar elementos seleccionados (Supr / Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar ({selectedBtnIds.length || 1})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Descriptors Modifier Pills */}
      {activeDescriptors.length > 0 && (
        <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Etiquetas Activas:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {activeDescriptors.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
              >
                {tag}
                <button
                  onClick={() => setActiveDescriptors(activeDescriptors.filter((t) => t !== tag))}
                  className="hover:text-amber-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => setActiveDescriptors([])}
            className="ml-auto text-[10px] text-slate-400 hover:text-slate-200 underline"
          >
            Limpiar todas
          </button>
        </div>
      )}

      {/* MAIN POWERPOINT FREEFORM CANVAS BOARD */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full min-h-[550px] aspect-[16/9] bg-slate-950 rounded-2xl border-2 overflow-hidden shadow-2xl transition-colors ${
          isEditMode
            ? 'border-amber-500/50 bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:24px_24px]'
            : 'border-slate-800'
        }`}
      >
        {/* Rubberband Box Selection Visual Overlay */}
        {isSelectingBox && selectionBox && (
          <div
            style={{
              left: `${Math.min(selectionBox.startX, selectionBox.currentX)}%`,
              top: `${Math.min(selectionBox.startY, selectionBox.currentY)}%`,
              width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}%`,
              height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}%`,
            }}
            className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none rounded-xl z-50"
          />
        )}

        {template.buttons.length === 0 ? (
          /* EMPTY WHITEBOARD STATE */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layout className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-extrabold text-white">Pizarra Limpia Vaciada (0 Objetos)</h3>
              <p className="text-xs text-slate-400">
                Esta pizarra está vacía. Añade tus propios botones y colócalos/estíralos libremente como en PowerPoint.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pointer-events-auto">
              <button
                onClick={() => handleAddButtonToCanvas('category')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Botón Acción</span>
              </button>

              <button
                onClick={() => handleAddButtonToCanvas('descriptor')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Etiqueta</span>
              </button>

              <button
                onClick={() => handleAddButtonToCanvas('header')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-indigo-400/40"
              >
                <Type className="w-4 h-4" />
                <span>+ Título / Agrupador</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {template.buttons.map((btn) => {
            const styles = getButtonStyles(btn.color);
            const isClicking = lastClickedButtonId === btn.id;
            const isSelected = selectedBtnId === btn.id || selectedBtnIds.includes(btn.id);
            const isHeader = btn.type === 'header' || btn.type === 'text';
            const isDescriptor = btn.type === 'descriptor';
            const tagVal = btn.outcome || btn.subTag || btn.name;
            const isTagActive = isDescriptor && activeDescriptors.includes(tagVal);

            // Freeform canvas relative positioning (% of canvas)
            const posX = btn.x ?? 5;
            const posY = btn.y ?? 5;
            const widthPct = btn.w ?? (isHeader ? 32 : isDescriptor ? 18 : 22);
            const heightPct = btn.h ?? (isHeader ? 9 : isDescriptor ? 12 : 15);

            const fontSizeClass =
              btn.fontSize === '2xl'
                ? 'text-2xl'
                : btn.fontSize === 'xl'
                ? 'text-xl'
                : btn.fontSize === 'lg'
                ? 'text-lg'
                : btn.fontSize === 'sm'
                ? 'text-xs'
                : 'text-sm';

            if (isHeader) {
              const isEditingThisHeader = editingHeaderId === btn.id;
              const textColorStyle = getTextColorStyle(btn.color);

              return (
                <div
                  key={btn.id}
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                  onMouseDown={(e) => {
                    if (isEditMode) handleStartDrag(e, btn);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isEditMode) setEditingHeaderId(btn.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditMode) setSelectedBtnId(btn.id);
                  }}
                  className={`absolute flex items-center justify-center select-none transition-all ${
                    isEditMode
                      ? 'cursor-grab active:cursor-grabbing border border-dashed border-amber-400/50 hover:border-amber-400 rounded-xl p-1 bg-slate-950/20'
                      : 'pointer-events-none'
                  } ${isSelected && isEditMode ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 rounded-xl z-20' : ''}`}
                >
                  {isEditingThisHeader ? (
                    <input
                      type="text"
                      value={btn.name}
                      autoFocus
                      onBlur={() => setEditingHeaderId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingHeaderId(null);
                      }}
                      onChange={(e) => {
                        const updated = template.buttons.map((b) =>
                          b.id === btn.id ? { ...b, name: e.target.value } : b
                        );
                        const updatedTmpl = { ...template, buttons: updated };
                        onUpdateTemplate(updatedTmpl);
                        dbStore.saveBotoneraTemplate(updatedTmpl);
                      }}
                      className="w-full bg-slate-950/95 border-2 border-amber-400 text-amber-300 font-black uppercase text-center focus:outline-none rounded-xl px-2 py-1 shadow-2xl z-50"
                      style={{ fontSize: btn.fontSize === '2xl' ? '1.5rem' : btn.fontSize === 'xl' ? '1.25rem' : '1rem' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center px-1 pointer-events-none">
                      <span
                        style={textColorStyle}
                        className={`font-black uppercase tracking-widest block break-words drop-shadow text-center ${fontSizeClass}`}
                      >
                        {btn.name}
                      </span>
                    </div>
                  )}

                  {/* POWERPOINT SELECTION & RESIZE HANDLES IN EDIT MODE */}
                  {isEditMode && (
                    <>
                      {/* Top Left Quick Duplicate Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSelected([btn.id]);
                        }}
                        className="absolute -top-2 -left-2 p-1 rounded-full bg-slate-800 text-amber-300 font-bold border border-amber-400/50 shadow-lg hover:bg-amber-500 hover:text-slate-950 hover:scale-110 transition z-50 cursor-pointer"
                        title="Duplicar este título al instante"
                      >
                        <Files className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingButton(btn);
                        }}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-500 text-slate-950 font-bold shadow-lg hover:scale-110 transition z-50 cursor-pointer"
                        title="Editar Formato y Color de Texto"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <div
                        onMouseDown={(e) => handleStartResize(e, btn)}
                        className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-950 cursor-se-resize flex items-center justify-center text-[10px] text-slate-950 font-bold shadow-lg hover:scale-125 transition z-50"
                        title="Estirar Área de Texto"
                      >
                        ↘
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return (
              <div
                key={btn.id}
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  ...styles.style
                }}
                onMouseDown={(e) => {
                  if (isEditMode) handleStartDrag(e, btn);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditMode) {
                    handleButtonClick(btn);
                  } else {
                    setSelectedBtnId(btn.id);
                  }
                }}
                className={`absolute p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-shadow duration-75 select-none shadow-xl ${
                  isTagActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-950/50 ring-4 ring-amber-400 z-30'
                    : styles.className
                } ${isClicking ? 'scale-95 ring-4 ring-emerald-400' : ''} ${
                  isEditMode ? 'cursor-grab active:cursor-grabbing hover:border-amber-400' : 'cursor-pointer'
                } ${isSelected && isEditMode ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-amber-400 z-20' : ''}`}
              >
                {/* Optional Key Shortcut Pill (Top Right) */}
                {btn.keyShortcut && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-950/80 text-slate-200 border border-slate-700/60 pointer-events-none z-10">
                    [{btn.keyShortcut}]
                  </span>
                )}

                {/* Centered Uppercase Button Title */}
                <div className="flex flex-col items-center justify-center text-center w-full h-full pointer-events-none px-1">
                  <span className={`font-extrabold leading-snug tracking-wider block break-words uppercase ${fontSizeClass}`}>
                    {btn.name}
                  </span>
                </div>

                {/* POWERPOINT SELECTION & RESIZE HANDLES IN EDIT MODE */}
                {isEditMode && (
                  <>
                    {/* Top Left Quick Duplicate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSelected([btn.id]);
                      }}
                      className="absolute -top-2 -left-2 p-1 rounded-full bg-slate-800 text-amber-300 font-bold border border-amber-400/50 shadow-lg hover:bg-amber-500 hover:text-slate-950 hover:scale-110 transition z-50 cursor-pointer"
                      title="Duplicar este elemento al instante"
                    >
                      <Files className="w-3 h-3" />
                    </button>

                    {/* Top Right Quick Edit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingButton(btn);
                      }}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-500 text-slate-950 font-bold shadow-lg hover:scale-110 transition z-50 cursor-pointer"
                      title="Editar Propiedades"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Bottom Right PowerPoint Resize Handle (Estirar objeto en grande) */}
                    <div
                      onMouseDown={(e) => handleStartResize(e, btn)}
                      className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-950 cursor-se-resize flex items-center justify-center text-[10px] text-slate-950 font-bold shadow-lg hover:scale-125 transition z-50"
                      title="Haz clic y arrastra para redimensionar el objeto"
                    >
                      ↘
                    </div>
                  </>
                )}
              </div>
            );
          })}
          </>
        )}
      </div>

      {/* PROPERTY INSPECTOR BAR FOR SELECTED OBJECT IN EDIT MODE */}
      {isEditMode && selectedButton && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs text-slate-100">
                Inspeccionar Objeto Seleccionado: <strong className="text-amber-400">{selectedButton.name}</strong>
              </span>
            </div>

            <button
              onClick={() => setEditingButton(selectedButton)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
            >
              <Pencil className="w-3 h-3" />
              <span>Editar Todas las Características</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-1">Color del Botón:</span>
              <select
                value={selectedButton.color}
                onChange={(e) => {
                  const updated = template.buttons.map((b) =>
                    b.id === selectedButton.id ? { ...b, color: e.target.value } : b
                  );
                  onUpdateTemplate({ ...template, buttons: updated });
                  dbStore.saveBotoneraTemplate({ ...template, buttons: updated });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="emerald">Verde Esmeralda</option>
                <option value="amber">Ámbar / Amarillo</option>
                <option value="red">Rojo Alerta</option>
                <option value="rose">Rosa Fallo</option>
                <option value="blue">Azul</option>
                <option value="cyan">Cian</option>
                <option value="orange">Naranja</option>
                <option value="purple">Púrpura</option>
                <option value="indigo">Índigo</option>
                <option value="pink">Rosa Neón</option>
                <option value="sky">Cielo</option>
                <option value="violet">Violeta</option>
                <option value="slate">Gris Neutro</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-1">Posición X (%):</span>
              <input
                type="number"
                min={0}
                max={100}
                value={selectedButton.x ?? 5}
                onChange={(e) => {
                  const updated = template.buttons.map((b) =>
                    b.id === selectedButton.id ? { ...b, x: parseInt(e.target.value) || 0 } : b
                  );
                  onUpdateTemplate({ ...template, buttons: updated });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-1">Posición Y (%):</span>
              <input
                type="number"
                min={0}
                max={100}
                value={selectedButton.y ?? 5}
                onChange={(e) => {
                  const updated = template.buttons.map((b) =>
                    b.id === selectedButton.id ? { ...b, y: parseInt(e.target.value) || 0 } : b
                  );
                  onUpdateTemplate({ ...template, buttons: updated });
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-1">Ancho / Alto (%):</span>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={selectedButton.w ?? 22}
                  onChange={(e) => {
                    const updated = template.buttons.map((b) =>
                      b.id === selectedButton.id ? { ...b, w: parseInt(e.target.value) || 22 } : b
                    );
                    onUpdateTemplate({ ...template, buttons: updated });
                  }}
                  className="w-1/2 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
                  placeholder="W"
                />
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={selectedButton.h ?? 15}
                  onChange={(e) => {
                    const updated = template.buttons.map((b) =>
                      b.id === selectedButton.id ? { ...b, h: parseInt(e.target.value) || 15 } : b
                    );
                    onUpdateTemplate({ ...template, buttons: updated });
                  }}
                  className="w-1/2 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
                  placeholder="H"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TEMPLATE FROM ZERO MODAL */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-400" /> Crear Nueva Pizarra (Desde 0)
              </h3>
              <button onClick={() => setIsNewTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplateFromZero} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la Pizarra / Botonera:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pizarra Táctica Presión Alta"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción táctica:</label>
                <input
                  type="text"
                  placeholder="Ej: Pizarra estilo PowerPoint para arrastrar botones libremente"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Grid className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Se creará una <strong>Pizarra limpia vacía (0 botones)</strong> lista para diseñar tipo PowerPoint.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow"
                >
                  Crear Pizarra desde 0
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME TEMPLATE MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" /> Renombrar Pizarra
              </h3>
              <button onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameTemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la Pizarra:</label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción:</label>
                <input
                  type="text"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow"
                >
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUTTON CHARACTERISTICS EDITOR MODAL */}
      {editingButton && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" /> Configurar Objeto de Botonera
              </h3>
              <button onClick={() => { setEditingButton(null); setDescriptorInputText(''); }} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedButton} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Botón / Evento:</label>
                <input
                  type="text"
                  required
                  value={editingButton.name}
                  onChange={(e) => setEditingButton({ ...editingButton, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Objeto:</label>
                  <select
                    value={editingButton.type}
                    onChange={(e) => setEditingButton({ ...editingButton, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="category">Categoría (Evento)</option>
                    <option value="descriptor">Descriptor Directo</option>
                    <option value="header">🔤 Título / Agrupador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tamaño Texto:</label>
                  <select
                    value={editingButton.fontSize || 'md'}
                    onChange={(e) => setEditingButton({ ...editingButton, fontSize: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sm">Pequeño (S)</option>
                    <option value="md">Mediano (M)</option>
                    <option value="lg">Grande (L)</option>
                    <option value="xl">Extra Grande (XL)</option>
                    <option value="2xl">Gigante (2XL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Atajo Teclado:</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={editingButton.keyShortcut || ''}
                    onChange={(e) => setEditingButton({ ...editingButton, keyShortcut: e.target.value.toUpperCase() })}
                    placeholder="P, T, 1..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Categoría Táctica del Botón:</span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Categoría actual: <strong>{editingButton.category || 'Sin categoría'}</strong>
                    </span>
                  </label>
                  
                  {/* Quick Tactical Category Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                    {[
                      { key: 'Ataque', label: '⚽ Ataque', color: 'border-emerald-500/60 text-emerald-300 bg-emerald-500/20' },
                      { key: 'Defensa', label: '🛡️ Defensa', color: 'border-blue-500/60 text-blue-300 bg-blue-500/20' },
                      { key: 'Transición', label: '⚡ Transición', color: 'border-amber-500/60 text-amber-300 bg-amber-500/20' },
                      { key: 'ABP', label: '🎯 ABP', color: 'border-purple-500/60 text-purple-300 bg-purple-500/20' },
                    ].map((cat) => {
                      const isSelected = editingButton.category === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setEditingButton({ ...editingButton, category: cat.key })}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? `${cat.color} ring-1 ring-white/60 shadow-lg shadow-black/40 scale-[1.02]`
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          <span>{cat.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="O escribe una categoría personalizada..."
                    value={editingButton.category}
                    onChange={(e) => setEditingButton({ ...editingButton, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* TABLA Y PALETA DE COLORES CON RUEDA DE COLOR NATIVA E INPUT DE COLOR PERSONALIZADO */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-400" /> Tabla de Colores Tácticos (28 Opciones + Selector Libre):
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1">
                    <span
                      className="w-3 h-3 rounded-full border border-white/60 inline-block"
                      style={{ backgroundColor: getButtonColorHex(editingButton.color) }}
                    />
                    <span>{getButtonColorHex(editingButton.color).toUpperCase()}</span>
                  </span>
                </div>

                {/* Grid Visual of 28 Color Swatches (4 Rows x 7 Cols) */}
                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {EXPANDED_COLOR_OPTIONS.map((c) => {
                    const currentHex = getButtonColorHex(editingButton.color);
                    const isSelected = editingButton.color === c.key || currentHex.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setEditingButton({ ...editingButton, color: c.key })}
                        title={c.name}
                        className={`h-8 rounded-xl transition-all transform flex items-center justify-center relative cursor-pointer shadow-md ${
                          isSelected
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950 z-10'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 stroke-[3] filter drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Native Color Picker Wheel & Custom HEX Input */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-[11px] font-bold text-slate-400 shrink-0">Selector de Color Personalizado:</label>
                    <div className="relative flex items-center gap-2">
                      <input
                        type="color"
                        value={getButtonColorHex(editingButton.color)}
                        onChange={(e) => setEditingButton({ ...editingButton, color: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0 overflow-hidden"
                        title="Abrir paleta cromática completa / Rueda de color"
                      />
                      <input
                        type="text"
                        placeholder="#FF5722"
                        value={editingButton.color}
                        onChange={(e) => setEditingButton({ ...editingButton, color: e.target.value })}
                        className="w-24 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Visual Live Object Preview */}
                <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">Previsualización:</span>
                  {editingButton.type === 'header' ? (
                    <div className="px-4 py-2 flex items-center justify-center">
                      <span
                        style={getTextColorStyle(editingButton.color)}
                        className="font-black uppercase tracking-widest text-lg drop-shadow"
                      >
                        {editingButton.name || 'TÍTULO DE EJEMPLO'}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="px-4 py-2 rounded-xl font-bold text-xs border shadow-lg transition-all flex items-center gap-2"
                      style={{
                        backgroundColor: `${getButtonColorHex(editingButton.color)}35`,
                        borderColor: getButtonColorHex(editingButton.color),
                        color: '#ffffff',
                        boxShadow: `0 0 12px ${getButtonColorHex(editingButton.color)}30`
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-inner border border-white/60"
                        style={{ backgroundColor: getButtonColorHex(editingButton.color) }}
                      />
                      <span className="uppercase tracking-wider">{ (editingButton.name || 'Botón de Ejemplo').toUpperCase() }</span>
                      {editingButton.keyShortcut && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono border border-slate-700">
                          [{editingButton.keyShortcut}]
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 1. SELECCIÓN DE REGISTRO ESPACIAL / CAMPOGRAMA (CON DIBUJOS EN PEQUEÑO) */}
              {editingButton.type !== 'header' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                      <span>📍 Modo de Registro de Datos en Campograma</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Seleccionado: <strong className="text-emerald-300">{(PITCH_MODE_OPTIONS.find(o => o.key === (editingButton.pitchRequired || 'none'))?.title)}</strong>
                    </span>
                  </div>

                  {/* Grid de tarjetas visuales con dibujos en pequeño de cada tipo de campograma */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {PITCH_MODE_OPTIONS.map((opt) => {
                      const isSelected = (editingButton.pitchRequired || 'none') === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setEditingButton({ ...editingButton, pitchRequired: opt.key as any })}
                          className={`p-2 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/20 border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/40 text-emerald-200'
                              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850 hover:text-slate-200'
                          }`}
                        >
                          {/* Dibujo en pequeño SVG del tipo de campograma */}
                          <MiniPitchDiagram mode={opt.key} />

                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-100 truncate flex items-center gap-1">
                                <span>{opt.icon}</span>
                                <span>{opt.title}</span>
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                            <p className="text-[9.5px] text-slate-400 leading-tight mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    Selecciona el dibujo del campograma que aparecerá al pulsar este botón durante el análisis en directo.
                  </p>
                </div>
              )}

              {/* 2. DESCRIPTORES ESTRUCTURADOS (TIPO Y POSIBILIDADES 100% EDITABLES) */}
              {editingButton.type === 'category' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-amber-400 block">
                        🏷️ Descriptores del Evento (Tipos y Posibilidades):
                      </label>
                      <span className="text-[10px] text-slate-400">100% Personalizable: añade tus propios tipos y opciones sin textos predeterminados.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newGrp = {
                          id: `grp_${Date.now()}`,
                          type: '',
                          options: []
                        };
                        const current = editingButton.descriptorGroups || [];
                        setEditingButton({
                          ...editingButton,
                          descriptorGroups: [...current, newGrp]
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" /> + Añadir Tipo Descriptor
                    </button>
                  </div>

                  {/* List of Descriptor Groups */}
                  {editingButton.descriptorGroups && editingButton.descriptorGroups.length > 0 ? (
                    <div className="space-y-3">
                      {editingButton.descriptorGroups.map((grp, grpIdx) => (
                        <div
                          key={grp.id}
                          draggable
                          onDragStart={(e) => {
                            if (draggedOptIdx !== null) return;
                            e.stopPropagation();
                            e.dataTransfer.setData('text/plain', grpIdx.toString());
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedGrpIdx(grpIdx);
                          }}
                          onDragOver={(e) => {
                            if (draggedOptIdx !== null) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (draggedGrpIdx !== null && draggedGrpIdx !== grpIdx) {
                              setDragOverGrpIdx(grpIdx);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverGrpIdx === grpIdx) setDragOverGrpIdx(null);
                          }}
                          onDrop={(e) => {
                            if (draggedOptIdx !== null) return;
                            e.preventDefault();
                            if (draggedGrpIdx !== null && draggedGrpIdx !== grpIdx) {
                              moveDescriptorGroup(draggedGrpIdx, grpIdx);
                            }
                            setDraggedGrpIdx(null);
                            setDragOverGrpIdx(null);
                          }}
                          onDragEnd={() => {
                            setDraggedGrpIdx(null);
                            setDragOverGrpIdx(null);
                          }}
                          className={`p-2.5 rounded-xl bg-slate-900 border space-y-2 transition-all ${
                            dragOverGrpIdx === grpIdx
                              ? 'border-amber-400 bg-amber-500/10 scale-[1.01] shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50'
                              : draggedGrpIdx === grpIdx
                              ? 'opacity-40 border-dashed border-amber-500/50'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Drag Handle & Up/Down reorder controls */}
                            <div className="flex items-center gap-0.5 text-slate-500 shrink-0">
                              <div
                                className="p-1 cursor-grab active:cursor-grabbing hover:text-amber-300 transition rounded hover:bg-slate-800"
                                title="Arrastra para cambiar el orden de este tipo descriptor"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <button
                                type="button"
                                disabled={grpIdx === 0}
                                onClick={() => moveDescriptorGroup(grpIdx, grpIdx - 1)}
                                className="p-0.5 hover:text-amber-300 disabled:opacity-20 disabled:hover:text-slate-500 transition rounded hover:bg-slate-800"
                                title="Subir orden"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={grpIdx === editingButton.descriptorGroups!.length - 1}
                                onClick={() => moveDescriptorGroup(grpIdx, grpIdx + 1)}
                                className="p-0.5 hover:text-amber-300 disabled:opacity-20 disabled:hover:text-slate-500 transition rounded hover:bg-slate-800"
                                title="Bajar orden"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <input
                              type="text"
                              draggable={false}
                              placeholder="Escribe el nombre del tipo de descriptor..."
                              value={grp.type}
                              autoFocus={!grp.type}
                              onChange={(e) => {
                                const updatedGrps = [...editingButton.descriptorGroups!];
                                updatedGrps[grpIdx].type = e.target.value;
                                setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 placeholder:font-normal placeholder:text-slate-600"
                            />
                            
                            {/* Obligatorio vs Opcional Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedGrps = [...editingButton.descriptorGroups!];
                                updatedGrps[grpIdx].required = !updatedGrps[grpIdx].required;
                                setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 shrink-0 ${
                                grp.required
                                  ? 'bg-red-500/20 text-red-300 border-red-500/50 ring-1 ring-red-500/30'
                                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                              title={grp.required ? "Este descriptor es OBLIGATORIO de responder" : "Este descriptor es OPCIONAL"}
                            >
                              {grp.required ? '⚠️ Obligatorio' : '⚪ Opcional'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const updatedGrps = editingButton.descriptorGroups!.filter((_, i) => i !== grpIdx);
                                setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Eliminar este grupo descriptor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Options / Posibilidades pills */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <span>Posibilidades / Opciones para &quot;{grp.type || 'Este tipo'}&quot;:</span>
                                <span className="text-[9px] text-amber-400/80 font-normal">⋮⋮ Arrastra opciones o grupos para reordenar</span>
                              </label>
                              {grp.options.length > 0 && (
                                <span className="text-[10px] text-slate-500">{grp.options.length} opciones creadas (haz clic para editar texto)</span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {grp.options.map((opt, optIdx) => {
                                const isOptDragged = draggedOptIdx?.grpIdx === grpIdx && draggedOptIdx?.optIdx === optIdx;
                                const isOptOver = dragOverOptIdx?.grpIdx === grpIdx && dragOverOptIdx?.optIdx === optIdx;

                                return (
                                  <span
                                    key={optIdx}
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      setDraggedOptIdx({ grpIdx, optIdx });
                                      e.dataTransfer.setData('text/plain', `${grpIdx}:${optIdx}`);
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (draggedOptIdx && (draggedOptIdx.grpIdx !== grpIdx || draggedOptIdx.optIdx !== optIdx)) {
                                        setDragOverOptIdx({ grpIdx, optIdx });
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      e.stopPropagation();
                                      if (dragOverOptIdx?.grpIdx === grpIdx && dragOverOptIdx?.optIdx === optIdx) {
                                        setDragOverOptIdx(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (draggedOptIdx && draggedOptIdx.grpIdx === grpIdx && draggedOptIdx.optIdx !== optIdx) {
                                        moveDescriptorOption(grpIdx, draggedOptIdx.optIdx, optIdx);
                                      }
                                      setDraggedOptIdx(null);
                                      setDragOverOptIdx(null);
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      setDraggedOptIdx(null);
                                      setDragOverOptIdx(null);
                                    }}
                                    className={`flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md bg-slate-800 text-slate-200 border text-[11px] transition-all ${
                                      isOptOver
                                        ? 'border-amber-400 bg-amber-500/20 scale-105 ring-1 ring-amber-400'
                                        : isOptDragged
                                        ? 'opacity-40 border-dashed border-amber-500/50'
                                        : 'border-slate-700 hover:border-slate-500'
                                    }`}
                                  >
                                    <div
                                      className="cursor-grab active:cursor-grabbing hover:text-amber-300 transition"
                                      title="Arrastra para reordenar esta opción"
                                    >
                                      <GripVertical className="w-3 h-3 text-slate-500 hover:text-amber-300 shrink-0" />
                                    </div>
                                    <input
                                      type="text"
                                      draggable={false}
                                      value={opt}
                                      onChange={(e) => {
                                        const updatedGrps = [...editingButton.descriptorGroups!];
                                        updatedGrps[grpIdx].options[optIdx] = e.target.value;
                                        setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                                      }}
                                      className="bg-transparent border-none text-slate-200 text-[11px] focus:outline-none min-w-[50px] max-w-[150px]"
                                      style={{ width: `${Math.max(opt.length, 5)}ch` }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedGrps = [...editingButton.descriptorGroups!];
                                        updatedGrps[grpIdx].options = updatedGrps[grpIdx].options.filter((_, i) => i !== optIdx);
                                        setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                                      }}
                                      className="p-0.5 hover:text-red-400 transition rounded"
                                      title="Eliminar esta opción"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>

                            {/* Add Option Input */}
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                draggable={false}
                                id={`input_opt_${grp.id}`}
                                placeholder="Escribe nueva posibilidad y pulsa Enter..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      const updatedGrps = [...editingButton.descriptorGroups!];
                                      updatedGrps[grpIdx].options.push(val);
                                      setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                                className="flex-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(`input_opt_${grp.id}`) as HTMLInputElement;
                                  if (el && el.value.trim()) {
                                    const updatedGrps = [...editingButton.descriptorGroups!];
                                    updatedGrps[grpIdx].options.push(el.value.trim());
                                    setEditingButton({ ...editingButton, descriptorGroups: updatedGrps });
                                    el.value = '';
                                  }
                                }}
                                className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3 h-3" /> + Añadir Opción
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <p className="text-[11px] text-slate-400 mb-2">
                        No hay grupos de descriptores configurados para este botón.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const newGrp = {
                            id: `grp_${Date.now()}`,
                            type: '',
                            options: []
                          };
                          setEditingButton({
                            ...editingButton,
                            descriptorGroups: [newGrp]
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Crear primer descriptor en blanco
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. REQUISITO DE SELECCIÓN DE JUGADOR */}
              {editingButton.type === 'category' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Requisito de Selección de Jugador:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditingButton({ ...editingButton, playerRequiredMode: 'none' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        (!editingButton.playerRequiredMode || editingButton.playerRequiredMode === 'none')
                          ? 'bg-slate-800 border-slate-700 text-slate-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <span>🚫 Ninguno</span>
                      <span className="text-[9px] font-normal text-slate-500">Sin selector</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingButton({ ...editingButton, playerRequiredMode: 'optional' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        editingButton.playerRequiredMode === 'optional'
                          ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <span>👤 Opcional</span>
                      <span className="text-[9px] font-normal text-slate-500">Se puede omitir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingButton({ ...editingButton, playerRequiredMode: 'required' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        editingButton.playerRequiredMode === 'required'
                          ? 'bg-red-500/20 border-red-500/80 text-red-300 font-black ring-1 ring-red-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <span>⚠️ Obligatorio</span>
                      <span className="text-[9px] font-normal text-slate-400">Requerido</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. REQUISITO DE SELECCIÓN DE EQUIPO */}
              {editingButton.type === 'category' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> Requisito de Selección de Equipo:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditingButton({ ...editingButton, teamRequiredMode: 'none' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        (!editingButton.teamRequiredMode || editingButton.teamRequiredMode === 'none')
                          ? 'bg-slate-800 border-slate-700 text-slate-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <span>🚫 Ninguno</span>
                      <span className="text-[9px] font-normal text-slate-500">Sin equipo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingButton({ ...editingButton, teamRequiredMode: 'optional' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        editingButton.teamRequiredMode === 'optional'
                          ? 'bg-cyan-500/20 border-cyan-500/80 text-cyan-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <span>🛡️ Opcional</span>
                      <span className="text-[9px] font-normal text-slate-500">Se puede omitir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingButton({ ...editingButton, teamRequiredMode: 'required' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        editingButton.teamRequiredMode === 'required'
                          ? 'bg-red-500/20 border-red-500/80 text-red-300 font-black ring-1 ring-red-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <span>⚠️ Obligatorio</span>
                      <span className="text-[9px] font-normal text-slate-400">Requerido</span>
                    </button>
                  </div>
                </div>
              )}

              {editingButton.type === 'category' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Ventana y Punto de Corte del Vídeo:
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Duración estimada: <strong className="text-amber-300">{(editingButton.leadTime || 0) + (editingButton.lagTime || 0)}s</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">Lead Time (Previo sec):</label>
                        <span className="text-[9px] text-amber-400/80 font-bold">
                          {editingButton.leadTime > 0
                            ? `✂️ ${editingButton.leadTime}s antes`
                            : editingButton.leadTime < 0
                            ? `⏩ ${Math.abs(editingButton.leadTime)}s después`
                            : '📍 En el clic'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={-120}
                        max={300}
                        value={editingButton.leadTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingButton({ ...editingButton, leadTime: val === '' ? ('' as any) : parseInt(val, 10) || 0 });
                        }}
                        onBlur={() => {
                          if (typeof editingButton.leadTime !== 'number' || isNaN(editingButton.leadTime)) {
                            setEditingButton({ ...editingButton, leadTime: 0 });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">
                        Admite números negativos (ej: -3 hace que el corte comience 3s después del clic).
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">Lag Time (Posterior sec):</label>
                        <span className="text-[9px] text-amber-400/80 font-bold">
                          {editingButton.lagTime > 0
                            ? `🏁 ${editingButton.lagTime}s después`
                            : editingButton.lagTime < 0
                            ? `⏪ ${Math.abs(editingButton.lagTime)}s antes`
                            : '📍 En el clic'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={-120}
                        max={300}
                        value={editingButton.lagTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingButton({ ...editingButton, lagTime: val === '' ? ('' as any) : parseInt(val, 10) || 0 });
                        }}
                        onBlur={() => {
                          if (typeof editingButton.lagTime !== 'number' || isNaN(editingButton.lagTime)) {
                            setEditingButton({ ...editingButton, lagTime: 0 });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">
                        Segundos a añadir tras el momento del evento (ej: 8s para capturar la resolución).
                      </p>
                    </div>
                  </div>

                  {/* Preajustes rápidos de corte */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold mb-1.5 block">Plantillas rápidas de corte:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingButton({ ...editingButton, leadTime: 5, lagTime: 5 })}
                        className={`px-2 py-1 rounded-lg text-[10px] border font-semibold transition ${
                          editingButton.leadTime === 5 && editingButton.lagTime === 5
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Estándar (-5s/+5s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingButton({ ...editingButton, leadTime: -3, lagTime: 10 })}
                        className={`px-2 py-1 rounded-lg text-[10px] border font-semibold transition ${
                          editingButton.leadTime === -3 && editingButton.lagTime === 10
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Retardado (+3s/+10s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingButton({ ...editingButton, leadTime: 10, lagTime: 15 })}
                        className={`px-2 py-1 rounded-lg text-[10px] border font-semibold transition ${
                          editingButton.leadTime === 10 && editingButton.lagTime === 15
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Jugada Larga (-10s/+15s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingButton({ ...editingButton, leadTime: 2, lagTime: 3 })}
                        className={`px-2 py-1 rounded-lg text-[10px] border font-semibold transition ${
                          editingButton.leadTime === 2 && editingButton.lagTime === 3
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Acción Corta (-2s/+3s)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteButton(editingButton.id)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Objeto
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingButton(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow"
                  >
                    Guardar Propiedades
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Template/Pizarra */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm">
                  ¿Eliminar Pizarra "{deleteConfirmTemplate.name}"?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Esta acción requiere confirmación previa.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
              La botonera y su diseño de botones se eliminarán permanentemente. Los eventos etiquetados previamente en partidos se mantendrán intactos.
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
                onClick={confirmDeleteTemplate}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Pizarra</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
