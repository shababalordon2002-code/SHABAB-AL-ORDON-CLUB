/**
 * Geometría de las zonas del campograma de la botonera.
 *
 * Los eventos guardan el NOMBRE de la zona en `metadata.zone`; aquí recuperamos
 * su rectángulo (coordenadas normalizadas 0-100) para poder pintar el acumulado
 * sobre el campo real en los dashboards.
 */
export interface PitchZoneGeometry {
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  set: 'tactical9' | 'bandas' | 'hitos3' | 'zonas4' | 'remate';
}

export const PITCH_ZONE_GEOMETRY: PitchZoneGeometry[] = [
  // 9 zonas tácticas
  { name: 'Ataque Banda Izq', minX: 66, maxX: 100, minY: 0, maxY: 33, set: 'tactical9' },
  { name: 'Área Rival / Z14', minX: 66, maxX: 100, minY: 33, maxY: 66, set: 'tactical9' },
  { name: 'Ataque Banda Der', minX: 66, maxX: 100, minY: 66, maxY: 100, set: 'tactical9' },
  { name: 'Medio Banda Izq', minX: 33, maxX: 66, minY: 0, maxY: 33, set: 'tactical9' },
  { name: 'Medio Campo Central', minX: 33, maxX: 66, minY: 33, maxY: 66, set: 'tactical9' },
  { name: 'Medio Banda Der', minX: 33, maxX: 66, minY: 66, maxY: 100, set: 'tactical9' },
  { name: 'Def. Banda Izq', minX: 0, maxX: 33, minY: 0, maxY: 33, set: 'tactical9' },
  { name: 'Def. Área Propia', minX: 0, maxX: 33, minY: 33, maxY: 66, set: 'tactical9' },
  { name: 'Def. Banda Der', minX: 0, maxX: 33, minY: 66, maxY: 100, set: 'tactical9' },

  // Bandas / centro
  { name: 'Banda Izquierda', minX: 0, maxX: 100, minY: 0, maxY: 30, set: 'bandas' },
  { name: 'Centro / Pasillo Central', minX: 0, maxX: 100, minY: 30, maxY: 70, set: 'bandas' },
  { name: 'Banda Derecha', minX: 0, maxX: 100, minY: 70, maxY: 100, set: 'bandas' },

  // 3 hitos
  { name: 'Finalización (Zona Alta)', minX: 66, maxX: 100, minY: 0, maxY: 100, set: 'hitos3' },
  { name: 'Canalización (Zona Media)', minX: 33, maxX: 66, minY: 0, maxY: 100, set: 'hitos3' },
  { name: 'Inicio (Zona Baja)', minX: 0, maxX: 33, minY: 0, maxY: 100, set: 'hitos3' },

  // 4 zonas horizontales
  { name: 'Zona 4 (Ataque Profundo)', minX: 75, maxX: 100, minY: 0, maxY: 100, set: 'zonas4' },
  { name: 'Zona 3 (Creación Alta)', minX: 50, maxX: 75, minY: 0, maxY: 100, set: 'zonas4' },
  { name: 'Zona 2 (Creación Baja)', minX: 25, maxX: 50, minY: 0, maxY: 100, set: 'zonas4' },
  { name: 'Zona 1 (Salida / Defensa)', minX: 0, maxX: 25, minY: 0, maxY: 100, set: 'zonas4' },

  // Zonas de remate
  { name: 'Área Pequeña', minX: 92, maxX: 100, minY: 37, maxY: 63, set: 'remate' },
  { name: 'Área Grande', minX: 78, maxX: 92, minY: 25, maxY: 75, set: 'remate' },
  { name: 'Borde Área', minX: 62, maxX: 78, minY: 25, maxY: 75, set: 'remate' },
  { name: 'Lateral Izquierdo', minX: 62, maxX: 100, minY: 0, maxY: 25, set: 'remate' },
  { name: 'Lateral Derecho', minX: 62, maxX: 100, minY: 75, maxY: 100, set: 'remate' },
];

const BY_NAME: Record<string, PitchZoneGeometry> = PITCH_ZONE_GEOMETRY.reduce((acc, z) => {
  acc[z.name] = z;
  return acc;
}, {} as Record<string, PitchZoneGeometry>);

export function getZoneGeometry(name: string): PitchZoneGeometry | undefined {
  return BY_NAME[name];
}

/** Conjunto de zonas dominante entre unos nombres registrados (para dibujar el campo correcto). */
export function dominantZoneSet(names: string[]): PitchZoneGeometry['set'] | null {
  const counts: Record<string, number> = {};
  names.forEach((n) => {
    const geo = BY_NAME[n];
    if (geo) counts[geo.set] = (counts[geo.set] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? (entries[0][0] as PitchZoneGeometry['set']) : null;
}
