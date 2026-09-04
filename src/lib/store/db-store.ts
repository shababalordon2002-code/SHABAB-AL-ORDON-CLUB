import { Match, Player, PlayerMapping, Team, Competition, ImportLog, NormalizedEvent, BotoneraTemplate, ActiveBotoneraSession } from '@/types';

const STORAGE_KEYS = {
  MATCHES: 'sao_analytics_matches_v1',
  EVENTS: 'sao_analytics_events_v1',
  PLAYERS: 'sao_analytics_players_v1',
  MAPPINGS: 'sao_analytics_mappings_v1',
  IMPORT_LOGS: 'sao_analytics_logs_v1',
  TEAMS: 'sao_analytics_teams_v1',
  COMPETITIONS: 'sao_analytics_competitions_v1',
  BOTONERA_TEMPLATES: 'sao_analytics_botonera_templates_v1',
  BOTONERA_ACTIVE_SESSION: 'sao_analytics_active_session_v1',
};

// Initial Seed DEMO Botonera Templates (LongoMatch / Nacsport Style)
export const SEED_BOTONERA_TEMPLATES: BotoneraTemplate[] = [
  {
    id: 'tmpl_standard_longomatch',
    name: 'Botonera Estándar LongoMatch',
    description: 'Plantilla completa para análisis táctico en directo (Pases, Tiros, Recuperaciones, Faltas y Descriptores).',
    isDefault: true,
    gridCols: 4,
    created_at: '2026-09-03T16:00:00Z',
    buttons: [
      { id: 'btn_1', name: 'Pase Clave', category: 'Pase Clave', type: 'category', color: 'emerald', keyShortcut: 'P', leadTime: 5, lagTime: 5 },
      { id: 'btn_2', name: 'Tiro a Puerta', category: 'Tiro a Puerta', type: 'category', color: 'amber', keyShortcut: 'T', leadTime: 8, lagTime: 4 },
      { id: 'btn_3', name: 'Gol', category: 'Gol', type: 'category', color: 'emerald', keyShortcut: 'G', leadTime: 10, lagTime: 5 },
      { id: 'btn_4', name: 'Recuperación', category: 'Recuperación', type: 'category', color: 'blue', keyShortcut: 'R', leadTime: 5, lagTime: 5 },
      { id: 'btn_5', name: 'Pérdida Balón', category: 'Pérdida', type: 'category', color: 'red', keyShortcut: 'L', leadTime: 5, lagTime: 5 },
      { id: 'btn_6', name: 'Falta Cometida', category: 'Falta Cometida', type: 'category', color: 'orange', keyShortcut: 'F', leadTime: 5, lagTime: 5 },
      { id: 'btn_7', name: 'Falta Recibida', category: 'Falta Recibida', type: 'category', color: 'cyan', keyShortcut: 'W', leadTime: 5, lagTime: 5 },
      { id: 'btn_8', name: 'Córner', category: 'Córner', type: 'category', color: 'purple', keyShortcut: 'C', leadTime: 6, lagTime: 6 },
      { id: 'btn_9', name: 'Duelo Ganado', category: 'Duelo Ganado', type: 'category', color: 'indigo', keyShortcut: 'D', leadTime: 5, lagTime: 5 },
      { id: 'btn_10', name: 'Presión Alta', category: 'Presión Alta', type: 'category', color: 'pink', keyShortcut: 'H', leadTime: 6, lagTime: 6 },
      { id: 'btn_11', name: 'Intercepción', category: 'Intercepción', type: 'category', color: 'sky', keyShortcut: 'I', leadTime: 5, lagTime: 5 },
      { id: 'btn_12', name: 'Regate Éxito', category: 'Regate', type: 'category', color: 'violet', keyShortcut: 'K', leadTime: 5, lagTime: 5 },
      
      // Descriptores / Tags
      { id: 'btn_desc_1', name: 'Éxito', category: 'Descriptor', type: 'descriptor', color: 'emerald', keyShortcut: '1', outcome: 'Éxito', leadTime: 0, lagTime: 0 },
      { id: 'btn_desc_2', name: 'Fallido', category: 'Descriptor', type: 'descriptor', color: 'rose', keyShortcut: '2', outcome: 'Fallido', leadTime: 0, lagTime: 0 },
      { id: 'btn_desc_3', name: 'Pie Derecho', category: 'Descriptor', type: 'descriptor', color: 'slate', keyShortcut: '3', subTag: 'Pie Der', leadTime: 0, lagTime: 0 },
      { id: 'btn_desc_4', name: 'Pie Izquierdo', category: 'Descriptor', type: 'descriptor', color: 'slate', keyShortcut: '4', subTag: 'Pie Izq', leadTime: 0, lagTime: 0 },
      { id: 'btn_desc_5', name: 'Cabeza', category: 'Descriptor', type: 'descriptor', color: 'slate', keyShortcut: '5', subTag: 'Cabeza', leadTime: 0, lagTime: 0 },
      { id: 'btn_desc_6', name: 'Balón Parado', category: 'Descriptor', type: 'descriptor', color: 'zinc', keyShortcut: '6', subTag: 'ABP', leadTime: 0, lagTime: 0 },
    ]
  }
];

// Initial Seed DEMO Teams
const SEED_TEAMS: Team[] = [
  { id: 'team_shabab_al_ordon', name: 'Shabab Al Ordon Club', short_name: 'SAO', country: 'Jordania' },
  { id: 'team_al_faisaly', name: 'Al-Faisaly SC', short_name: 'FAI', country: 'Jordania' },
  { id: 'team_al_wehdat', name: 'Al-Wehdat SC', short_name: 'WEH', country: 'Jordania' },
  { id: 'team_ramtha', name: 'Al-Ramtha SC', short_name: 'RAM', country: 'Jordania' },
  { id: 'team_al_hussein', name: 'Al-Hussein Irbid', short_name: 'HUS', country: 'Jordania' },
];

// Initial Seed DEMO Competitions
const SEED_COMPETITIONS: Competition[] = [
  { id: 'comp_jpl_2026', name: 'Jordan Pro League', season: '2026/2027', type: 'Liga Nacional', country: 'Jordania' },
  { id: 'comp_jordan_cup', name: 'Jordan FA Cup', season: '2026/2027', type: 'Copa Nacional', country: 'Jordania' },
  { id: 'comp_afc_cup', name: 'AFC Champions League Two', season: '2026/2027', type: 'Continental', country: 'Asia' },
];

// Initial Seed DEMO Players for Shabab Al Ordon
const SEED_PLAYERS: Player[] = [
  { id: 'ply_1', name: 'Ahmad Ali', number: 10, position: 'Centrocampista', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_2', name: 'Musa Al-Taamari', number: 7, position: 'Extremo Derecho', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_3', name: 'Baha Abdel-Rahman', number: 8, position: 'Pivot Defensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_4', name: 'Yazan Al-Naimat', number: 9, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_5', name: 'Saeed Al-Murjan', number: 14, position: 'Volante Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_6', name: 'Anas Bani Yaseen', number: 4, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_7', name: 'Zaid Jaber', number: 5, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_8', name: 'Mohannad Khairullah', number: 3, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
  { id: 'ply_9', name: 'Mustafa Kaza', number: 1, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', is_demo: true },
];

// Initial Seed DEMO Player Mappings (e.g. "Ahmed Ali" -> "Ahmad Ali")
const SEED_MAPPINGS: PlayerMapping[] = [
  { id: 'map_1', longomatch_name: 'Ahmed Ali', player_id: 'ply_1', team_id: 'team_shabab_al_ordon', created_at: '2026-08-25T10:00:00Z' },
  { id: 'map_2', longomatch_name: 'M. Al Taamari', player_id: 'ply_2', team_id: 'team_shabab_al_ordon', created_at: '2026-08-25T10:00:00Z' },
];

// Initial Seed DEMO Matches with Flashscore Metadata
const SEED_MATCHES: Match[] = [
  {
    id: 'match_fs_EXAUVBT8',
    flashscore_mid: 'EXAUVBT8',
    flashscore_url: 'https://www.flashscore.es/partido/futbol/al-ramtha-f5YjWWjO/shabab-al-ordon-ld5M1lKt/?mid=EXAUVBT8',
    date: '04.09.2026',
    time: '17:00',
    competition: 'Premier League',
    round: 'Jornada 1',
    season: '2026/2027',
    home_team: 'Shabab Al Ordon',
    home_team_logo: 'https://static.flashscore.com/res/image/data/b5mbVfDa-dvq5wjeM.png',
    away_team: 'Al Ramtha',
    away_team_logo: 'https://static.flashscore.com/res/image/data/AcAGnYwS-riw7cLfq.png',
    home_score: 0,
    away_score: 0,
    status: 'Programado',
    event_count: 0,
    import_status: 'Pendiente'
  },
  {
    id: 'match_fs_ITiecmAk',
    flashscore_mid: 'ITiecmAk',
    flashscore_url: 'https://www.flashscore.es/partido/futbol/al-jazeera-amman-88xeVj6U/shabab-al-ordon-ld5M1lKt/?mid=ITiecmAk',
    date: '10.09.2026',
    time: '18:00',
    competition: 'Premier League',
    round: 'Jornada 2',
    season: '2026/2027',
    home_team: 'Al Jazeera Amman',
    home_team_logo: 'https://static.flashscore.com/res/image/data/YZJS9hAr-WdX72eig.png',
    away_team: 'Shabab Al Ordon',
    away_team_logo: 'https://static.flashscore.com/res/image/data/b5mbVfDa-dvq5wjeM.png',
    home_score: 0,
    away_score: 0,
    status: 'Programado',
    event_count: 0,
    import_status: 'Pendiente'
  },
  {
    id: 'match_fs_GpPxUooR',
    flashscore_mid: 'GpPxUooR',
    flashscore_url: 'https://www.flashscore.es/partido/futbol/al-hussein-j9mK0B3Q/shabab-al-ordon-ld5M1lKt/?mid=GpPxUooR',
    date: '19.09.2026',
    time: '18:00',
    competition: 'Premier League',
    round: 'Jornada 3',
    season: '2026/2027',
    home_team: 'Shabab Al Ordon',
    home_team_logo: 'https://static.flashscore.com/res/image/data/b5mbVfDa-dvq5wjeM.png',
    away_team: 'Al Hussein',
    away_team_logo: 'https://static.flashscore.com/res/image/data/Ey5MadGG-WnrX0gmJ.png',
    home_score: 0,
    away_score: 0,
    status: 'Programado',
    event_count: 0,
    import_status: 'Pendiente'
  },
  {
    id: 'match_demo_1',
    date: '01.09.2026',
    time: '19:30',
    competition: 'Jordan Pro League 2026',
    round: 'Jornada Previa',
    season: '2026/2027',
    home_team: 'Shabab Al Ordon',
    home_team_logo: 'https://static.flashscore.com/res/image/data/b5mbVfDa-dvq5wjeM.png',
    away_team: 'Al-Faisaly SC',
    away_team_logo: 'https://static.flashscore.com/res/image/data/AcAGnYwS-riw7cLfq.png',
    home_score: 2,
    away_score: 1,
    status: 'Finalizado',
    event_count: 347,
    import_status: 'XML Importado',
    xml_imported_at: '2026-09-01T20:45:00Z',
    file_hash: 'hash_demo_sample_347',
    is_demo: true
  }
];

// Initial Seed DEMO Import Audit Logs
const SEED_IMPORT_LOGS: ImportLog[] = [
  {
    id: 'log_demo_1',
    file_name: 'match_2026_09_01_faisaly.xml',
    file_hash: 'hash_demo_sample_347',
    imported_at: '2026-09-01T20:45:00Z',
    user_name: 'Analista Principal (SAO)',
    match_id: 'match_demo_1',
    match_title: 'Shabab Al Ordon vs Al-Faisaly SC',
    event_count: 347,
    status: 'Completado con avisos',
    errors: [],
    warnings: ['4 eventos no contenían jugador especificado.']
  },
  {
    id: 'log_demo_2',
    file_name: 'match_2026_08_24_wehdat.xml',
    file_hash: 'hash_demo_wehdat_312',
    imported_at: '2026-08-25T09:15:00Z',
    user_name: 'Analista Principal (SAO)',
    match_id: 'match_demo_2',
    match_title: 'Al-Wehdat SC vs Shabab Al Ordon',
    event_count: 312,
    status: 'Completado',
    errors: [],
    warnings: []
  }
];

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

export const dbStore = {
  // Matches
  getMatches(): Match[] {
    return getFromStorage(STORAGE_KEYS.MATCHES, SEED_MATCHES);
  },

  getMatchById(id: string): Match | undefined {
    const matches = this.getMatches();
    return matches.find(m => m.id === id);
  },

  saveMatch(match: Match): void {
    const matches = this.getMatches();
    const existingIdx = matches.findIndex(m => m.id === match.id);
    if (existingIdx >= 0) {
      matches[existingIdx] = match;
    } else {
      matches.unshift(match);
    }
    setToStorage(STORAGE_KEYS.MATCHES, matches);
  },

  // Normalized Events
  getNormalizedEvents(matchId?: string): NormalizedEvent[] {
    const allEvents: NormalizedEvent[] = getFromStorage(STORAGE_KEYS.EVENTS, []);
    if (!matchId) return allEvents;
    return allEvents.filter(e => e.match_id === matchId);
  },

  saveNormalizedEvents(newEvents: NormalizedEvent[], replaceMatchEvents = true): void {
    let allEvents = this.getNormalizedEvents();
    if (newEvents.length > 0 && replaceMatchEvents) {
      const targetMatchId = newEvents[0].match_id;
      allEvents = allEvents.filter(e => e.match_id !== targetMatchId);
    }
    allEvents = [...newEvents, ...allEvents];
    setToStorage(STORAGE_KEYS.EVENTS, allEvents);
  },

  deleteMatchEvents(matchId: string): void {
    const allEvents = this.getNormalizedEvents();
    const filtered = allEvents.filter(e => e.match_id !== matchId);
    setToStorage(STORAGE_KEYS.EVENTS, filtered);
  },

  // Players
  getPlayers(): Player[] {
    return getFromStorage(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
  },

  savePlayer(player: Player): void {
    const players = this.getPlayers();
    const idx = players.findIndex(p => p.id === player.id);
    if (idx >= 0) {
      players[idx] = player;
    } else {
      players.push(player);
    }
    setToStorage(STORAGE_KEYS.PLAYERS, players);
  },

  // Player Mappings
  getPlayerMappings(): PlayerMapping[] {
    return getFromStorage(STORAGE_KEYS.MAPPINGS, SEED_MAPPINGS);
  },

  savePlayerMapping(mapping: PlayerMapping): void {
    const mappings = this.getPlayerMappings();
    const existingIdx = mappings.findIndex(
      m => m.longomatch_name.toLowerCase() === mapping.longomatch_name.toLowerCase()
    );
    if (existingIdx >= 0) {
      mappings[existingIdx] = mapping;
    } else {
      mappings.unshift(mapping);
    }
    setToStorage(STORAGE_KEYS.MAPPINGS, mappings);
  },

  // Import Audit Logs
  getImportLogs(): ImportLog[] {
    return getFromStorage(STORAGE_KEYS.IMPORT_LOGS, SEED_IMPORT_LOGS);
  },

  saveImportLog(log: ImportLog): void {
    const logs = this.getImportLogs();
    const existingIdx = logs.findIndex(l => l.id === log.id);
    if (existingIdx >= 0) {
      logs[existingIdx] = log;
    } else {
      logs.unshift(log);
    }
    setToStorage(STORAGE_KEYS.IMPORT_LOGS, logs);
  },

  // Helper checks
  getExistingHashes(): string[] {
    const logs = this.getImportLogs();
    return logs.map(l => l.file_hash).filter(Boolean);
  },

  // Teams & Competitions
  getTeams(): Team[] {
    return getFromStorage(STORAGE_KEYS.TEAMS, SEED_TEAMS);
  },

  getCompetitions(): Competition[] {
    return getFromStorage(STORAGE_KEYS.COMPETITIONS, SEED_COMPETITIONS);
  },

  // Botonera Templates
  getBotoneraTemplates(): BotoneraTemplate[] {
    return getFromStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, SEED_BOTONERA_TEMPLATES);
  },

  saveBotoneraTemplate(template: BotoneraTemplate): void {
    const templates = this.getBotoneraTemplates();
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      templates[idx] = { ...template, updated_at: new Date().toISOString() };
    } else {
      templates.unshift({ ...template, created_at: new Date().toISOString() });
    }
    setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, templates);
  },

  deleteBotoneraTemplate(id: string): void {
    const templates = this.getBotoneraTemplates();
    const filtered = templates.filter(t => t.id !== id);
    setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, filtered);
  },

  resetBotoneraTemplates(): BotoneraTemplate[] {
    setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, SEED_BOTONERA_TEMPLATES);
    return SEED_BOTONERA_TEMPLATES;
  },

  // Active Session Persistence across Route Navigations & Tab Focus
  getActiveBotoneraSession(): ActiveBotoneraSession | null {
    return getFromStorage<ActiveBotoneraSession | null>(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, null);
  },

  saveActiveBotoneraSession(session: ActiveBotoneraSession): void {
    setToStorage(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, session);
  },

  clearActiveBotoneraSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION);
    }
  }
};
