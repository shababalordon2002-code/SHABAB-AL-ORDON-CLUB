'use client';

import React, { useMemo, useState } from 'react';
import { Filter, Plus, Trash2, X } from 'lucide-react';
import { DashboardFieldDef, DashboardFilter, DashboardMeasure, DashboardWidget, NormalizedEvent } from '@/types';
import { EngineContext, MEASURE_LABELS, getDistinctValues } from '@/lib/analytics/dashboard-engine';
import { WIDGET_GROUPS, WIDGET_TYPES, getWidgetTypeDef } from './widget-catalog';
import { WidgetContent } from './WidgetContent';
import { SERIES_COLORS } from './viz/theme';

interface WidgetEditorModalProps {
  widget: DashboardWidget;
  events: NormalizedEvent[];
  ctx: EngineContext;
  fields: DashboardFieldDef[];
  onSave: (widget: DashboardWidget) => void;
  onClose: () => void;
}

const MEASURES: DashboardMeasure[] = [
  'count',
  'pct_of_total',
  'success_rate',
  'sum_duration',
  'avg_duration',
  'distinct_players',
];

export const WidgetEditorModal: React.FC<WidgetEditorModalProps> = ({
  widget,
  events,
  ctx,
  fields,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<DashboardWidget>({ ...widget });
  const def = getWidgetTypeDef(draft.type);

  const set = (patch: Partial<DashboardWidget>) => setDraft((prev) => ({ ...prev, ...patch }));

  const dimensionFields = fields;
  const isPitch = draft.type.startsWith('pitch_');
  const isTimeSeries = draft.type === 'line' || draft.type === 'area';

  const addFilter = () => {
    const filter: DashboardFilter = {
      id: `flt_${Date.now()}`,
      field: 'category',
      operator: 'in',
      values: [],
    };
    set({ filters: [...(draft.filters || []), filter] });
  };

  const updateFilter = (id: string, patch: Partial<DashboardFilter>) => {
    set({ filters: (draft.filters || []).map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };

  const removeFilter = (id: string) => set({ filters: (draft.filters || []).filter((f) => f.id !== id) });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-extrabold text-white text-sm tracking-tight">Editar visualización</h3>
            <p className="text-[11px] text-slate-500">
              Elige el tipo de gráfico, el campo de la botonera y la medida. La vista previa se actualiza al instante.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* Configuración */}
          <div className="overflow-y-auto border-r border-slate-800 p-4 space-y-5">
            <Section title="Tipo de visualización">
              {WIDGET_GROUPS.map((group) => (
                <div key={group} className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {WIDGET_TYPES.filter((t) => t.group === group).map((t) => (
                      <button
                        key={t.type}
                        onClick={() => {
                          const nextDef = getWidgetTypeDef(t.type);
                          set({
                            type: t.type,
                            title: draft.title === def.label ? nextDef.label : draft.title,
                            dimension:
                              nextDef.needsDimension && !draft.dimension
                                ? t.type === 'line' || t.type === 'area'
                                  ? 'time_bin'
                                  : 'category'
                                : draft.dimension,
                          });
                        }}
                        className={`text-left px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition ${
                          draft.type === t.type
                            ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                        title={t.hint}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Contenido">
              <Field label="Título">
                <input
                  value={draft.title}
                  onChange={(e) => set({ title: e.target.value })}
                  className="input-dark"
                />
              </Field>

              {draft.type === 'text' ? (
                <Field label="Texto de la nota">
                  <textarea
                    value={draft.text || ''}
                    onChange={(e) => set({ text: e.target.value })}
                    rows={5}
                    className="input-dark resize-y"
                    placeholder="Conclusiones del análisis, contexto del partido…"
                  />
                </Field>
              ) : (
                <>
                  <Field label="Medida">
                    <select
                      value={draft.measure}
                      onChange={(e) => set({ measure: e.target.value as DashboardMeasure })}
                      className="input-dark"
                    >
                      {MEASURES.map((m) => (
                        <option key={m} value={m}>
                          {MEASURE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {(def.needsDimension || draft.type === 'timeline') && (
                    <Field label={draft.type === 'timeline' ? 'Carriles (agrupar por)' : 'Dimensión (eje principal)'}>
                      <FieldSelect
                        fields={dimensionFields}
                        value={draft.dimension || ''}
                        onChange={(v) => set({ dimension: v || undefined })}
                        allowEmpty={draft.type === 'timeline'}
                      />
                    </Field>
                  )}

                  {def.supportsBreakdown && (
                    <Field label="Desglose por series (opcional)">
                      <FieldSelect
                        fields={dimensionFields}
                        value={draft.breakdown || ''}
                        onChange={(v) => set({ breakdown: v || undefined })}
                        allowEmpty
                      />
                    </Field>
                  )}
                </>
              )}
            </Section>

            {draft.type !== 'text' && (
              <Section title="Opciones">
                {def.needsDimension && !isTimeSeries && (
                  <Field label="Orden">
                    <select
                      value={draft.sort || 'value_desc'}
                      onChange={(e) => set({ sort: e.target.value as DashboardWidget['sort'] })}
                      className="input-dark"
                    >
                      <option value="value_desc">Mayor a menor</option>
                      <option value="value_asc">Menor a mayor</option>
                      <option value="label_asc">Alfabético</option>
                      <option value="natural">Natural (temporal / numérico)</option>
                    </select>
                  </Field>
                )}

                {def.needsDimension && (
                  <Field label="Top N (0 = todas las categorías)">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={draft.limit ?? 0}
                      onChange={(e) => set({ limit: Number(e.target.value) })}
                      className="input-dark"
                    />
                  </Field>
                )}

                {(isTimeSeries || draft.dimension === 'time_bin' || draft.type === 'kpi') && (
                  <Field label="Tamaño de la franja temporal (min)">
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={draft.timeBinMinutes || 5}
                      onChange={(e) => set({ timeBinMinutes: Math.max(1, Number(e.target.value)) })}
                      className="input-dark"
                    />
                  </Field>
                )}

                {isPitch && (
                  <>
                    <Field label="Orientación del campo">
                      <select
                        value={draft.pitchOrientation || 'horizontal'}
                        onChange={(e) => set({ pitchOrientation: e.target.value as 'horizontal' | 'vertical' })}
                        className="input-dark"
                      >
                        <option value="horizontal">Horizontal (ataque a la derecha)</option>
                        <option value="vertical">Vertical (ataque hacia arriba)</option>
                      </select>
                    </Field>
                    {draft.type === 'pitch_heatmap' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Celdas (largo)">
                          <input
                            type="number"
                            min={2}
                            max={12}
                            value={draft.pitchBinsX || 6}
                            onChange={(e) => set({ pitchBinsX: Number(e.target.value) })}
                            className="input-dark"
                          />
                        </Field>
                        <Field label="Celdas (ancho)">
                          <input
                            type="number"
                            min={2}
                            max={10}
                            value={draft.pitchBinsY || 4}
                            onChange={(e) => set({ pitchBinsY: Number(e.target.value) })}
                            className="input-dark"
                          />
                        </Field>
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-wrap gap-3 pt-1">
                  <Toggle
                    label="Mostrar valores"
                    checked={draft.showValues !== false}
                    onChange={(v) => set({ showValues: v })}
                  />
                  <Toggle
                    label="Mostrar leyenda"
                    checked={draft.showLegend !== false}
                    onChange={(v) => set({ showLegend: v })}
                  />
                  {(isTimeSeries || draft.dimension === 'time_bin' || draft.dimension === 'minute') && (
                    <Toggle
                      label="Acumulativo"
                      checked={!!draft.cumulative}
                      onChange={(v) => set({ cumulative: v })}
                    />
                  )}
                </div>

                {!draft.breakdown && (
                  <Field label="Color de la serie">
                    <div className="flex items-center gap-1.5">
                      {SERIES_COLORS.map((color, i) => (
                        <button
                          key={color}
                          onClick={() => set({ colorSlot: i })}
                          className={`w-6 h-6 rounded-md border transition ${
                            (draft.colorSlot || 0) === i ? 'border-white scale-110' : 'border-slate-700'
                          }`}
                          style={{ background: color }}
                          title={`Color ${i + 1}`}
                        />
                      ))}
                    </div>
                  </Field>
                )}
              </Section>
            )}

            {draft.type !== 'text' && (
              <Section title="Filtros de este widget">
                <div className="space-y-2">
                  {(draft.filters || []).map((filter) => (
                    <FilterEditor
                      key={filter.id}
                      filter={filter}
                      fields={fields}
                      events={events}
                      ctx={ctx}
                      onChange={(patch) => updateFilter(filter.id, patch)}
                      onRemove={() => removeFilter(filter.id)}
                    />
                  ))}
                  <button
                    onClick={addFilter}
                    className="w-full py-2 rounded-lg bg-slate-950 border border-dashed border-slate-700 text-[11px] font-bold text-slate-400 hover:text-emerald-300 hover:border-emerald-600/50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir filtro</span>
                  </button>
                </div>
              </Section>
            )}
          </div>

          {/* Vista previa */}
          <div className="p-4 bg-slate-950/40 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa</p>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3" style={{ height: 420 }}>
              <div className="mb-2">
                <h4 className="text-xs font-extrabold text-slate-100">{draft.title}</h4>
                <p className="text-[10px] text-slate-500">{MEASURE_LABELS[draft.measure]}</p>
              </div>
              <div style={{ height: 360 }}>
                <WidgetContent widget={draft} events={events} ctx={ctx} fields={fields} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Los campos disponibles salen de la botonera elegida: categorías, botones, jugadores, zonas del campograma y
              cada grupo de descriptores configurado.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold"
          >
            Guardar widget
          </button>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2.5">
    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-1.5">
      {title}
    </h4>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    {children}
  </label>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-3.5 h-3.5 accent-emerald-500"
    />
    <span className="text-[11px] text-slate-300 font-medium">{label}</span>
  </label>
);

const FieldSelect: React.FC<{
  fields: DashboardFieldDef[];
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}> = ({ fields, value, onChange, allowEmpty }) => {
  const builtin = fields.filter((f) => f.source === 'builtin');
  const descriptors = fields.filter((f) => f.source === 'descriptor');

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-dark">
      {allowEmpty && <option value="">— Ninguno —</option>}
      <optgroup label="Campos del evento">
        {builtin.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </optgroup>
      {descriptors.length > 0 && (
        <optgroup label="Descriptores de la botonera">
          {descriptors.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
};

export const FilterEditor: React.FC<{
  filter: DashboardFilter;
  fields: DashboardFieldDef[];
  events: NormalizedEvent[];
  ctx: EngineContext;
  onChange: (patch: Partial<DashboardFilter>) => void;
  onRemove: () => void;
}> = ({ filter, fields, events, ctx, onChange, onRemove }) => {
  const values = useMemo(() => getDistinctValues(events, filter.field, ctx), [events, filter.field, ctx]);

  const toggleValue = (value: string) => {
    const next = filter.values.includes(value)
      ? filter.values.filter((v) => v !== value)
      : [...filter.values, value];
    onChange({ values: next });
  };

  return (
    <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <select
          value={filter.field}
          onChange={(e) => onChange({ field: e.target.value, values: [] })}
          className="input-dark flex-1"
        >
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={filter.operator}
          onChange={(e) => onChange({ operator: e.target.value as 'in' | 'not_in' })}
          className="input-dark w-24"
        >
          <option value="in">incluye</option>
          <option value="not_in">excluye</option>
        </select>
        <button onClick={onRemove} className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
        {values.length === 0 && <span className="text-[10px] text-slate-600">Sin valores en el dataset</span>}
        {values.map((value) => (
          <button
            key={value}
            onClick={() => toggleValue(value)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
              filter.values.includes(value)
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
};
