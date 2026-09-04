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
  RotateCcw
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
  const [editingButton, setEditingButton] = useState<BotoneraButton | null>(null);
  const [descriptorInputText, setDescriptorInputText] = useState('');
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateDesc, setNewTemplateDesc] = useState<string>('');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

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

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
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
  }, [template.buttons, activeDescriptors, isTimerRunning]);

  const handleButtonClick = (btn: BotoneraButton) => {
    if (isEditMode) {
      setSelectedBtnId(btn.id);
      return;
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
  const handleStartDrag = (e: React.MouseEvent, btn: BotoneraButton) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setSelectedBtnId(btn.id);
    setDraggingBtnId(btn.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialBtnState({
      x: btn.x ?? 5,
      y: btn.y ?? 5,
      w: btn.w ?? 22,
      h: btn.h ?? 15,
    });
  };

  // --- RESIZE HANDLE ENGINE (POWERPOINT STYLE) ---
  const handleStartResize = (e: React.MouseEvent, btn: BotoneraButton) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setSelectedBtnId(btn.id);
    setResizingBtnId(btn.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialBtnState({
      x: btn.x ?? 5,
      y: btn.y ?? 5,
      w: btn.w ?? 22,
      h: btn.h ?? 15,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    if (draggingBtnId) {
      const deltaXPixels = e.clientX - dragStartPos.x;
      const deltaYPixels = e.clientY - dragStartPos.y;

      const deltaXPct = (deltaXPixels / canvasRect.width) * 100;
      const deltaYPct = (deltaYPixels / canvasRect.height) * 100;

      let newX = Math.round(initialBtnState.x + deltaXPct);
      let newY = Math.round(initialBtnState.y + deltaYPct);

      // Snap to 1% grid and clamp within canvas boundary
      newX = Math.min(100 - initialBtnState.w, Math.max(0, newX));
      newY = Math.min(100 - initialBtnState.h, Math.max(0, newY));

      const updatedButtons = template.buttons.map((b) =>
        b.id === draggingBtnId ? { ...b, x: newX, y: newY } : b
      );

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
    if (draggingBtnId || resizingBtnId) {
      setDraggingBtnId(null);
      setResizingBtnId(null);
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

    if (confirm(`¿Estás seguro de eliminar la botonera "${template.name}"?`)) {
      dbStore.deleteBotoneraTemplate(template.id);
      const remaining = dbStore.getBotoneraTemplates();
      setTemplatesList(remaining);
      if (remaining.length > 0) {
        onUpdateTemplate(remaining[0]);
      }
    }
  };

  const handleAddButtonToCanvas = (type: 'category' | 'descriptor') => {
    const isCat = type === 'category';
    const count = template.buttons.length;

    // Position new button cleanly in rows across canvas
    const itemsPerRow = 4;
    const col = count % itemsPerRow;
    const row = Math.floor(count / itemsPerRow);

    const newBtn: BotoneraButton = {
      id: `btn_${Date.now()}`,
      name: isCat ? 'Nueva Acción' : 'Nueva Etiqueta',
      category: isCat ? 'Ataque' : 'General',
      type: type,
      color: isCat ? 'emerald' : 'amber',
      keyShortcut: '',
      leadTime: 5,
      lagTime: 5,
      x: Math.min(78, 3 + col * 24),
      y: Math.min(80, 4 + row * 18),
      w: isCat ? 22 : 18,
      h: isCat ? 15 : 12,
      fontSize: 'md',
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

      {/* EDIT MODE TOOLBAR INSTRUCTIONS */}
      {isEditMode && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <MousePointer className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>
              <strong>PIZARRA INTERACTIVA TIPO POWERPOINT:</strong> Haz clic y <strong>arrastra los botones libremente</strong> por la pantalla. Estira el <strong>tirador inferior derecho (↘)</strong> para cambiar el tamaño del botón en grande.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddButtonToCanvas('category')}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Botón Acción</span>
            </button>

            <button
              onClick={() => handleAddButtonToCanvas('descriptor')}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Etiqueta</span>
            </button>
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
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full min-h-[550px] aspect-[16/9] bg-slate-950 rounded-2xl border-2 overflow-hidden shadow-2xl transition-colors ${
          isEditMode
            ? 'border-amber-500/50 bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:24px_24px]'
            : 'border-slate-800'
        }`}
      >
        {template.buttons.length === 0 ? (
          /* EMPTY WHITEBOARD STATE */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layout className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-extrabold text-white">Pizarra Limpia Vaciada (0 Objetos)</h3>
              <p className="text-xs text-slate-400">
                Esta pizarra está vacía. Añade tus propios botones y colócalos/estíralos libremente como en PowerPoint.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleAddButtonToCanvas('category')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Añadir Primer Botón de Acción</span>
              </button>

              <button
                onClick={() => handleAddButtonToCanvas('descriptor')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Añadir Etiqueta Descriptor</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {template.buttons.map((btn) => {
            const colors = COLOR_MAP[btn.color] || COLOR_MAP.emerald;
            const isClicking = lastClickedButtonId === btn.id;
            const isSelected = selectedBtnId === btn.id;
            const isDescriptor = btn.type === 'descriptor';
            const tagVal = btn.outcome || btn.subTag || btn.name;
            const isTagActive = isDescriptor && activeDescriptors.includes(tagVal);

            // Freeform canvas relative positioning (% of canvas)
            const posX = btn.x ?? 5;
            const posY = btn.y ?? 5;
            const widthPct = btn.w ?? (isDescriptor ? 18 : 22);
            const heightPct = btn.h ?? (isDescriptor ? 12 : 15);

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
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditMode) {
                    handleButtonClick(btn);
                  } else {
                    setSelectedBtnId(btn.id);
                  }
                }}
                className={`absolute p-3 rounded-2xl border flex flex-col justify-between transition-shadow duration-75 select-none shadow-xl ${
                  isTagActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-950/50 ring-4 ring-amber-400 z-30'
                    : `${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`
                } ${isClicking ? 'scale-95 ring-4 ring-emerald-400' : ''} ${
                  isEditMode ? 'cursor-grab active:cursor-grabbing hover:border-amber-400' : 'cursor-pointer'
                } ${isSelected && isEditMode ? 'ring-2 ring-amber-400 z-40 shadow-2xl' : 'z-10'}`}
              >
                {/* Object Header: Name & Key Shortcut */}
                <div className="flex items-start justify-between gap-1 w-full pointer-events-none">
                  <div className="space-y-0.5 min-w-0 pr-1">
                    <span className="font-extrabold text-sm leading-tight tracking-tight block break-words">
                      {btn.name}
                    </span>
                    <span className="text-[10px] opacity-75 font-semibold block break-words">
                      {btn.category}
                    </span>
                  </div>

                  {btn.keyShortcut && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/90 text-slate-200 border border-slate-700/80 shrink-0">
                      [{btn.keyShortcut}]
                    </span>
                  )}
                </div>

                {/* Object Footer Info */}
                <div className="flex items-center justify-between mt-1 text-[10px] opacity-85 border-t border-white/10 pt-1 pointer-events-none">
                  <span className="font-mono text-[9px] flex items-center gap-0.5">
                    {btn.type === 'category' ? (
                      <>
                        <Clock className="w-2.5 h-2.5" /> -{btn.leadTime}s / +{btn.lagTime}s
                      </>
                    ) : (
                      'Etiqueta'
                    )}
                  </span>
                </div>

                {/* POWERPOINT SELECTION & RESIZE HANDLES IN EDIT MODE */}
                {isEditMode && (
                  <>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" /> Configurar Objeto de Botonera
              </h3>
              <button onClick={() => { setEditingButton(null); setDescriptorInputText(''); }} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedButton} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Botón:</label>
                <input
                  type="text"
                  required
                  value={editingButton.name}
                  onChange={(e) => setEditingButton({ ...editingButton, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Botón:</label>
                  <select
                    value={editingButton.type}
                    onChange={(e) => setEditingButton({ ...editingButton, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="category">Categoría (Acción)</option>
                    <option value="descriptor">Descriptor (Etiqueta)</option>
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
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Color del Botón:</label>
                  <select
                    value={editingButton.color}
                    onChange={(e) => setEditingButton({ ...editingButton, color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="emerald">Verde Esmeralda</option>
                    <option value="amber">Ámbar / Amarillo</option>
                    <option value="red">Rojo Alerta</option>
                    <option value="rose">Rosa / Fallo</option>
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría Nombre:</label>
                  <input
                    type="text"
                    value={editingButton.category}
                    onChange={(e) => setEditingButton({ ...editingButton, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">Ubicación en Campograma:</label>
                <select
                  value={editingButton.pitchRequired || 'none'}
                  onChange={(e) => setEditingButton({ ...editingButton, pitchRequired: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 font-semibold text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="none">⚡ Sin Campograma (Registrar evento inmediatamente)</option>
                  <option value="point">📍 Punto Único (X, Y)</option>
                  <option value="vector">🏹 Vector / Flecha (Punto Origen ➔ Destino)</option>
                  <option value="zone">🔷 Zona Táctica (Área Rival, Zona 14, etc.)</option>
                </select>
              </div>

              {editingButton.type === 'category' && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Descriptores asociados al botón (Opcional):</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Escribe un descriptor (ej: Pérdida, Presión...)"
                      value={descriptorInputText}
                      onChange={(e) => setDescriptorInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = descriptorInputText.trim();
                          if (val && !editingButton.descriptors?.includes(val)) {
                            setEditingButton({
                              ...editingButton,
                              descriptors: [...(editingButton.descriptors || []), val]
                            });
                            setDescriptorInputText('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = descriptorInputText.trim();
                        if (val && !editingButton.descriptors?.includes(val)) {
                          setEditingButton({
                            ...editingButton,
                            descriptors: [...(editingButton.descriptors || []), val]
                          });
                          setDescriptorInputText('');
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-slate-950 shadow"
                    >
                      Añadir
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                    {editingButton.descriptors?.map(desc => (
                      <span key={desc} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                        {desc}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingButton({
                              ...editingButton,
                              descriptors: editingButton.descriptors?.filter(d => d !== desc)
                            });
                          }}
                          className="hover:text-amber-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(!editingButton.descriptors || editingButton.descriptors.length === 0) && (
                      <span className="text-[10px] text-slate-500 italic">No hay descriptores. Al pulsar este botón no se preguntará nada adicional.</span>
                    )}
                  </div>
                </div>
              )}

              {editingButton.type === 'category' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400">Lead Time (Previo sec):</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={editingButton.leadTime}
                      onChange={(e) => setEditingButton({ ...editingButton, leadTime: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400">Lag Time (Posterior sec):</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={editingButton.lagTime}
                      onChange={(e) => setEditingButton({ ...editingButton, lagTime: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
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
    </div>
  );
};
