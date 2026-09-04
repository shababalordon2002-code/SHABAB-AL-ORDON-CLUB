/**
 * Shabab Al Ordon Club - Football Analytics Domain Types (Phase 2)
 */

export interface NormalizedEvent {
  event_id: string;
  source_event_id: string | null;
  match_id: string;
  team_id: string | null;
  team_name: string | null;
  player_id: string | null;
  player_name: string; // resolved player name or "Jugador pendiente de asociar"
  event_type: string;  // nombre del evento
  category: string;    // categoría LongoMatch
  subcategory: string | null;
  timestamp: number | null; // start time in seconds
  minute: number | null;    // Math.floor(timestamp / 60)
  second: number | null;    // Math.floor(timestamp % 60)
  duration: number | null;  // duration in seconds (stop - start)
  period: number | null;    // 1, 2, 3, 4
  x: number | null;         // pitch x (0-100)
  y: number | null;         // pitch y (0-100)
  end_x: number | null;     // pitch end x (0-100)
  end_y: number | null;     // pitch end y (0-100)
  outcome: string | null;   // "éxito", "fallido", etc.
  metadata: Record<string, any>; // información adicional
  source: 'longomatch';
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  date: string;
  competition: string;
  season: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: 'Finalizado' | 'En curso' | 'Programado';
  duration?: string;
  event_count: number;
  import_status: 'XML Importado' | 'Pendiente' | 'Sin XML';
  xml_imported_at?: string;
  file_hash?: string;
  is_demo?: boolean;
  home_team_logo?: string;
  away_team_logo?: string;
  time?: string;
  round?: string;
  flashscore_url?: string;
  flashscore_mid?: string;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  team_id: string;
  team_name: string;
  is_demo?: boolean;
}

export interface PlayerMapping {
  id: string;
  longomatch_name: string;
  player_id: string;
  team_id: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  country: string;
  logo_url?: string;
}

export interface Competition {
  id: string;
  name: string;
  season: string;
  type: string;
  country: string;
}

export interface ImportLog {
  id: string;
  file_name: string;
  file_hash: string;
  imported_at: string;
  user_name: string;
  match_id: string;
  match_title: string;
  event_count: number;
  status: 'Procesando' | 'Completado' | 'Completado con avisos' | 'Error';
  errors: string[];
  warnings: string[];
}

export interface RawLongoMatchEvent {
  sourceId: string;
  name: string;
  category: string;
  subcategory?: string;
  team?: string;
  player?: string;
  start?: number; // seconds
  stop?: number;  // seconds
  period?: number;
  x?: number;
  y?: number;
  end_x?: number;
  end_y?: number;
  outcome?: string;
  attributes: Record<string, any>;
}

export interface ParsedXMLAnalysis {
  fileName: string;
  fileHash: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  durationFormatted: string;
  competition: string;
  season: string;
  rawEventsCount: number;
  categoriesCount: number;
  categories: string[];
  detectedPlayers: string[];
  unmappedPlayers: string[];
  unassignedPlayerEventsCount: number;
  warnings: string[];
  errors: string[];
  isDuplicate: boolean;
  existingMatchId?: string;
  events: RawLongoMatchEvent[];
}

/**
 * LongoMatch / Nacsport Style Botonera Dashboard Types
 */
export type PitchRequiredType = 'none' | 'point' | 'vector' | 'zone';

export interface BotoneraButton {
  id: string;
  name: string;
  category: string;
  type: 'category' | 'descriptor';
  color: string; // Tailwind color class or hex (e.g. "emerald", "blue", "amber", "red", "purple", "cyan")
  keyShortcut?: string; // e.g. "P", "T", "R", "F", "1", "2"
  leadTime: number; // seconds before click (default: 5)
  lagTime: number;  // seconds after click (default: 5)
  outcome?: string; // e.g. "Éxito", "Fallido" for descriptor buttons
  subTag?: string;
  colSpan?: number; // 1, 2, 3, 4 (width on whiteboard grid)
  rowSpan?: number; // 1, 2, 3 (height on whiteboard grid)
  x?: number; // Freeform Canvas X position in % (0 to 100)
  y?: number; // Freeform Canvas Y position in % (0 to 100)
  w?: number; // Freeform Canvas Width in % (e.g. 20%)
  h?: number; // Freeform Canvas Height in % (e.g. 15%)
  fontSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  pitchRequired?: PitchRequiredType; // 'none' | 'point' | 'vector' | 'zone'
  descriptors?: string[]; // Predefined descriptors (labels) for this button
}

export interface BotoneraTemplate {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  gridCols: number;
  buttons: BotoneraButton[];
  created_at?: string;
  updated_at?: string;
}

export interface PitchZone {
  id: string;
  code: string; // e.g., "Z1", "Z18", "DEF_IZQ", etc.
  name: string;
  longitudinal: 'defensiva' | 'creacion' | 'ataque';
  lateral: 'izquierda' | 'centro' | 'derecha';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type BotoneraProjectVideoType = 'local' | 'link' | 'none';

export interface ActiveBotoneraSession {
  selectedMatchId: string;
  period: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  startTimestamp: number | null; // Date.now() when timer was started
  lastUpdatedTimestamp: number;
  events: NormalizedEvent[];
  isConfigured?: boolean; // true once the setup wizard (video/partido/botonera) has been completed
  videoType?: BotoneraProjectVideoType | null;
  videoSourceName?: string | null; // local file name, when videoType === 'local'
  videoUrl?: string | null;        // youtube/link URL, when videoType === 'link'
  botoneraTemplateId?: string | null;
}


