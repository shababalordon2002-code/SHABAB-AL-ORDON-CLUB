/**
 * Tokens de visualización de datos.
 *
 * La paleta categórica es la paleta validada para superficies oscuras
 * (surface #0f172a = slate-900): banda de luminosidad, suelo de croma,
 * separación CVD adyacente ΔE 8.4 y contraste ≥ 3:1 verificados.
 * El orden de los slots es el mecanismo de seguridad CVD: se asigna por
 * identidad (entidad) y nunca se cicla ni se genera un color nuevo.
 */
export const SERIES_COLORS = [
  '#3987e5', // 1 azul
  '#d95926', // 2 naranja
  '#199e70', // 3 aqua
  '#c98500', // 4 amarillo
  '#d55181', // 5 magenta
  '#008300', // 6 verde
  '#9085e9', // 7 violeta
  '#e66767', // 8 rojo
] as const;

/** Más de 8 series: el resto se pliega en "Otros" con este gris, nunca un color nuevo. */
export const OTHER_COLOR = '#64748b';

export const VIZ = {
  surface: '#0f172a',
  surfaceSoft: '#111c30',
  grid: '#1e293b',
  axis: '#243449',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

/** Rampa secuencial de un solo tono (azul), ordenada de "casi nada" a "mucho" sobre fondo oscuro. */
export const SEQUENTIAL_RAMP = [
  '#12294a',
  '#184f95',
  '#256abf',
  '#3987e5',
  '#6da7ec',
  '#9ec5f4',
  '#cde2fb',
];

export function seriesColor(index: number, label?: string): string {
  if (label === 'Otros' || label === '(Sin dato)') return OTHER_COLOR;
  if (index >= SERIES_COLORS.length) return OTHER_COLOR;
  return SERIES_COLORS[index];
}

/** Color secuencial para una magnitud normalizada 0..1 */
export function sequentialColor(t: number): string {
  if (!isFinite(t)) return SEQUENTIAL_RAMP[0];
  const clamped = Math.max(0, Math.min(1, t));
  const idx = Math.round(clamped * (SEQUENTIAL_RAMP.length - 1));
  return SEQUENTIAL_RAMP[idx];
}

/** Blanco o tinta oscura según la luminancia del relleno (etiquetas dentro de una marca). */
export function inkOn(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? '#0b0f17' : '#ffffff';
}

/** Ticks redondos para un eje 0..max */
export function niceTicks(max: number, count = 4): number[] {
  if (!isFinite(max) || max <= 0) return [0];
  const rawStep = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}
