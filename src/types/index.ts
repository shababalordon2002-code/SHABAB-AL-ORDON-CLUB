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
  source: 'longomatch' | 'manual' | string;
  created_by?: string | null;      // auth.users id del analista que registró el evento
  created_by_name?: string | null; // nombre visible del analista, para atribución en vivo
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
  video_type?: BotoneraProjectVideoType | null;
  video_url?: string | null;
  video_source_name?: string | null;
  p1_video_start_time?: number | null; // seconds in video when 1st half starts
  p2_video_start_time?: number | null; // seconds in video when 2nd half starts
  botonera_template_id?: string | null;
  home_lineup?: TeamLineupConfig | null;
  away_lineup?: TeamLineupConfig | null;
}

export interface MatchAnalysis {
  id: string;
  match_id: string;
  title: string;
  analyst_name?: string;
  status: 'completed' | 'in_progress';
  video_type?: BotoneraProjectVideoType | null;
  video_url?: string | null;
  video_source_name?: string | null;
  p1_video_start_time?: number | null;
  p2_video_start_time?: number | null;
  botonera_template_id?: string | null;
  home_lineup?: TeamLineupConfig | null;
  away_lineup?: TeamLineupConfig | null;
  events: NormalizedEvent[];
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  team_id: string;
  team_name: string;
  photo_url?: string;
  age?: number;
  nationality?: string;
  flag_url?: string;
  market_value?: string;
  is_demo?: boolean;
}

export interface TeamCircleStyle {
  primaryColor: string;
  secondaryColor?: string;
  pattern: 'solid' | 'striped' | 'split' | 'ring';
}

export interface LineupPlayerItem {
  id: string;
  number: number | string;
  name: string;
  position?: string;
  isStarter?: boolean;
  x?: number;
  y?: number;
}

export interface TeamLineupConfig {
  formation: string;
  circleStyle: TeamCircleStyle;
  starters: LineupPlayerItem[];
  substitutes: LineupPlayerItem[];
  customPositions?: Record<string, { x: number; y: number }>;
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
export type PitchRequiredType =
  | 'none'
  | 'point'
  | 'point_full'
  | 'point_half'
  | 'vector'
  | 'vector_arrow'
  | 'zone'
  | 'zone_bandas_centro'
  | 'zone_3_hitos'
  | 'zone_4_zonas'
  | 'zone_remate'
  | 'zone_counter';

export interface DescriptorGroup {
  id: string;
  type: string; // Nombre del tipo de descriptor (e.g. "Resultado", "Superficie de contacto", "Presión")
  options: string[]; // Posibilidades u opciones (e.g. ["Fuera", "Poste", "Parada", "Gol"])
  allowMultiple?: boolean;
  required?: boolean; // Si la selección de al menos 1 opción en este grupo es OBLIGATORIA
}

export interface BotoneraButton {
  id: string;
  name: string;
  category: string;
  type: 'category' | 'descriptor' | 'header' | 'text';
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
  pitchRequired?: PitchRequiredType;
  pitchViewMode?: 'full' | 'half'; // Campo entero vs Medio campo
  playerRequiredMode?: 'none' | 'optional' | 'required'; // 'none' (Desactivado), 'optional' (Opcional), 'required' (Obligatorio)
  teamRequiredMode?: 'none' | 'optional' | 'required'; // 'none' (Desactivado), 'optional' (Opcional), 'required' (Obligatorio)
  descriptors?: string[]; // Predefined flat descriptors (legacy)
  descriptorGroups?: DescriptorGroup[]; // Dynamic Descriptor Groups (Tipo -> Posibilidades)
  dashboardConfig?: BotoneraButtonDashboardConfig;
}

export interface BotoneraButtonDashboardConfig {
  pitchViewType?: PitchRequiredType | 'none';
  chart1Type?: 'descriptors' | 'outcomes' | 'outcome' | 'players' | 'player' | 'periods' | 'time_half' | 'zones';
  chart2Type?: 'descriptors' | 'outcomes' | 'outcome' | 'players' | 'player' | 'periods' | 'time_half' | 'zones';
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
  p1VideoStartSeconds?: number | null; // video timestamp in seconds for 1st half start
  p2VideoStartSeconds?: number | null; // video timestamp in seconds for 2nd half start
  botoneraTemplateId?: string | null;
}



/**
 * Dashboards (Editor tipo Tableau / Power BI sobre los datos de la botonera)
 */
export type DashboardWidgetType =
  | 'kpi'
  | 'bar'          // barras horizontales
  | 'column'       // barras verticales
  | 'line'         // evolución temporal
  | 'area'         // evolución temporal con relleno (soporta acumulado)
  | 'pie'
  | 'donut'
  | 'table'
  | 'matrix'       // tabla cruzada dimensión x desglose
  | 'timeline'     // eventos sobre el eje de tiempo del partido
  | 'pitch_points' // campograma: puntos
  | 'pitch_arrows' // campograma: vectores/flechas
  | 'pitch_heatmap'// campograma: mapa de calor por celdas
  | 'pitch_zones'  // campograma: acumulado por zona registrada
  | 'text';        // nota / título dentro de la pizarra

export type DashboardMeasure =
  | 'count'
  | 'pct_of_total'
  | 'success_rate'
  | 'sum_duration'
  | 'avg_duration'
  | 'distinct_players';

export type DashboardFieldKind = 'dimension' | 'time' | 'spatial';

export interface DashboardFieldDef {
  key: string;   // 'category' | 'event_type' | ... | 'desc:Resultado'
  label: string;
  kind: DashboardFieldKind;
  source: 'builtin' | 'descriptor';
  /** Un evento puede tener varios valores a la vez (descriptores) */
  multiValue?: boolean;
}

export interface DashboardFilter {
  id: string;
  field: string;                 // DashboardFieldDef.key
  operator: 'in' | 'not_in';
  values: string[];
}

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  subtitle?: string;
  // Posición en la rejilla de la pizarra (unidades de rejilla)
  x: number;
  y: number;
  w: number;
  h: number;
  dimension?: string;   // campo del eje principal
  breakdown?: string;   // campo de series (apilado / agrupado / matriz)
  measure: DashboardMeasure;
  filters: DashboardFilter[];
  limit?: number;                 // Top N categorías
  sort?: 'value_desc' | 'value_asc' | 'label_asc' | 'natural';
  showValues?: boolean;
  showLegend?: boolean;
  cumulative?: boolean;           // acumulativo en series temporales
  timeBinMinutes?: number;        // tamaño del bin temporal (por defecto 5')
  pitchOrientation?: 'horizontal' | 'vertical';
  pitchBinsX?: number;
  pitchBinsY?: number;
  colorSlot?: number;             // índice fijo de la paleta categórica
  text?: string;                  // contenido del widget de tipo 'text'
}

export interface MatchDashboard {
  id: string;
  match_id: string;
  analysis_id?: string | null;   // null => todos los eventos del partido
  name: string;
  description?: string;
  botonera_template_id?: string | null;
  cols: number;                  // columnas de la rejilla (por defecto 12)
  row_height: number;            // altura de fila en px (por defecto 40)
  widgets: DashboardWidget[];
  global_filters: DashboardFilter[];
  created_at: string;
  updated_at: string;
}

export interface ButtonDashboardConfig {
  visible: boolean;
  displayAs: 'bar' | 'kpi' | 'pitch' | 'matrix';
  customColor?: string;
}

export interface DashboardGlobalConfig {
  showVideoPreview: boolean;
  showStatsBar: boolean;
  showLineups: boolean;
  showLiveBadge: boolean;
  showH2HComparison: boolean;
  defaultVisorTab: 'editor_view' | 'pitch';
  // H2H Bar Charts Config
  selectedH2HCategories?: string[];
  h2hDisplayMode?: 'count' | 'percentage' | 'both';
  // Lineup Visual Config
  lineupsViewMode?: 'field' | 'list' | 'both';
  lineupFormation?: '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2';
  // Fine-grained Button-by-Button Config
  buttonConfigs?: Record<string, ButtonDashboardConfig>;
}
