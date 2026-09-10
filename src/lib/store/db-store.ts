import { Match, Player, PlayerMapping, Team, Competition, ImportLog, NormalizedEvent, BotoneraTemplate, ActiveBotoneraSession, MatchAnalysis, MatchDashboard, DashboardGlobalConfig } from '@/types';
import {
  saveBotoneraTemplateToSupabase,
  deleteBotoneraTemplateFromSupabase,
  getBotoneraTemplatesFromSupabase,
  saveAnalysisSessionToSupabase,
  getAnalysisSessionFromSupabase,
  getAllActiveSessionsFromSupabase,
  deleteAnalysisSessionFromSupabase,
  clearAnalysisEventsFromSupabase,
  getAnalysisEventsFromSupabase
} from '@/lib/services/botonera-service';
import { saveMatchesToSupabase, getMatchesFromSupabase } from '@/lib/services/matches-service';
import { getPlayersFromSupabase, savePlayersToSupabase } from '@/lib/services/players-service';
import { getAnalysesFromSupabase, saveAnalysisToSupabase, deleteAnalysisFromSupabase } from '@/lib/services/analysis-service';
import { getDashboardsFromSupabase, saveDashboardToSupabase, deleteDashboardFromSupabase } from '@/lib/services/dashboard-service';

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
  MATCH_ANALYSES: 'sao_analytics_match_analyses_v1',
  MATCH_DASHBOARDS: 'sao_analytics_match_dashboards_v1',
  TRASH_EVENTS: 'sao_analytics_trash_events_v1',
  DASHBOARD_CONFIG: 'sao_analytics_dashboard_config_v1',
};

export const DEFAULT_DASHBOARD_CONFIG: DashboardGlobalConfig = {
  showVideoPreview: true,
  showStatsBar: true,
  showLineups: true,
  showLiveBadge: true,
  showH2HComparison: true,
  defaultVisorTab: 'editor_view',
  selectedH2HCategories: ['Tiro', 'Remate', 'Pase', 'Falta', 'Córner', 'Presión', 'Recuperación', 'Entrada'],
  h2hDisplayMode: 'both',
  lineupsViewMode: 'both',
  lineupFormation: '4-3-3',
  buttonConfigs: {},
};

export const SEED_MATCH_ANALYSES: MatchAnalysis[] = [
  {
    id: 'analysis_demo_1',
    match_id: 'match_demo_1',
    title: 'Análisis Táctico Completo vs Al-Faisaly',
    analyst_name: 'Analista Principal (SAO)',
    status: 'completed',
    video_type: 'link',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    created_at: '2026-09-01T20:45:00Z',
    updated_at: '2026-09-01T20:45:00Z',
    events: []
  },
  {
    id: 'analysis_fs_EXAUVBT8_1',
    match_id: 'match_fs_EXAUVBT8',
    title: 'Análisis Vídeo 1ª Parte vs Al Ramtha',
    analyst_name: 'Cuerpo Técnico SAO',
    status: 'completed',
    video_type: 'link',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    created_at: '2026-09-04T18:30:00Z',
    updated_at: '2026-09-04T18:30:00Z',
    events: []
  }
];

// Initial Seed DEMO Botonera Templates (LongoMatch / Nacsport Style)
export const SEED_BOTONERA_TEMPLATES: BotoneraTemplate[] = [
  {
    id: 'tmpl_standard_longomatch',
    name: 'Botonera Estándar LongoMatch',
    description: 'Plantilla completa para análisis táctico en directo con registro espacial en campograma (Zonas de remate, Bandas-Centro, Flechas) y descriptores avanzados.',
    isDefault: true,
    gridCols: 4,
    created_at: '2026-09-03T16:00:00Z',
    buttons: [
      {
        id: 'btn_1',
        name: 'Pase Clave',
        category: 'Ataque',
        type: 'category',
        color: 'emerald',
        keyShortcut: 'P',
        leadTime: 5,
        lagTime: 5,
        pitchRequired: 'vector_arrow',
        descriptorGroups: [
          { id: 'grp_p1', type: 'Tipo de Pase', options: ['Raso', 'Elevado', 'Al Hueco', 'Centro'] },
          { id: 'grp_p2', type: 'Resultado', options: ['Éxito', 'Interceptado', 'Fuera'] }
        ]
      },
      {
        id: 'btn_2',
        name: 'Tiro a Puerta',
        category: 'Ataque',
        type: 'category',
        color: 'amber',
        keyShortcut: 'T',
        leadTime: 8,
        lagTime: 4,
        pitchRequired: 'zone_remate',
        descriptorGroups: [
          { id: 'grp_t0', type: 'Claridad de Ocasión', options: ['Ocasiones muy claras', 'Ocasiones claras', 'Ocasiones sin importancia'] },
          { id: 'grp_t1', type: 'Resultado', options: ['Fuera', 'Poste', 'Parada', 'Gol'] },
          { id: 'grp_t2', type: 'Superficie de contacto', options: ['Pie derecho', 'Pie izquierdo', 'Cabeza', 'Volea'] },
          { id: 'grp_t3', type: 'Presión Rival', options: ['Sin marca', 'Presión media', 'Presión alta'] }
        ]
      },
      {
        id: 'btn_3',
        name: 'Gol',
        category: 'Ataque',
        type: 'category',
        color: 'emerald',
        keyShortcut: 'G',
        leadTime: 10,
        lagTime: 5,
        pitchRequired: 'zone_remate',
        descriptorGroups: [
          { id: 'grp_g1', type: 'Superficie de contacto', options: ['Pie derecho', 'Pie izquierdo', 'Cabeza', 'Penalti'] }
        ]
      },
      {
        id: 'btn_4',
        name: 'Recuperación',
        category: 'Transición',
        type: 'category',
        color: 'blue',
        keyShortcut: 'R',
        leadTime: 5,
        lagTime: 5,
        pitchRequired: 'zone_3_hitos',
        descriptorGroups: [
          { id: 'grp_r1', type: 'Acción de Robo', options: ['Intercepción', 'Entrada', 'Duelo Aéreo', 'Fallo Rival'] }
        ]
      },
      {
        id: 'btn_5',
        name: 'Pérdida Balón',
        category: 'Transición',
        type: 'category',
        color: 'red',
        keyShortcut: 'L',
        leadTime: 5,
        lagTime: 5,
        pitchRequired: 'zone_bandas_centro',
        descriptorGroups: [
          { id: 'grp_l1', type: 'Causa de Pérdida', options: ['Mal Pase', 'Regate Fallido', 'Falta', 'Presión'] }
        ]
      },
      { id: 'btn_6', name: 'Falta Cometida', category: 'Defensa', type: 'category', color: 'orange', keyShortcut: 'F', leadTime: 5, lagTime: 5, pitchRequired: 'point_full' },
      { id: 'btn_7', name: 'Falta Recibida', category: 'ABP', type: 'category', color: 'cyan', keyShortcut: 'W', leadTime: 5, lagTime: 5, pitchRequired: 'point_full' },
      { id: 'btn_8', name: 'Córner', category: 'ABP', type: 'category', color: 'purple', keyShortcut: 'C', leadTime: 6, lagTime: 6, pitchRequired: 'zone_remate' },
      { id: 'btn_9', name: 'Duelo Ganado', category: 'Transición', type: 'category', color: 'indigo', keyShortcut: 'D', leadTime: 5, lagTime: 5, pitchRequired: 'zone_bandas_centro' },
      { id: 'btn_10', name: 'Presión Alta', category: 'Transición', type: 'category', color: 'pink', keyShortcut: 'H', leadTime: 6, lagTime: 6, pitchRequired: 'zone_3_hitos' },
      { id: 'btn_11', name: 'Intercepción', category: 'Defensa', type: 'category', color: 'sky', keyShortcut: 'I', leadTime: 5, lagTime: 5, pitchRequired: 'point_full' },
      { id: 'btn_12', name: 'Regate Éxito', category: 'Ataque', type: 'category', color: 'violet', keyShortcut: 'K', leadTime: 5, lagTime: 5, pitchRequired: 'point_full' },
      
      // Descriptores Directos
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

// Initial Seed DEMO Players for Shabab Al Ordon (Full squad of 29 players)
const SEED_PLAYERS: Player[] = [
  { id: 'ply_tm_1_waleed_issam', name: 'Waleed Issam', number: 1, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', photo_url: 'https://img.a.transfermarkt.technology/portrait/medium/569541-1770765964.jpeg?lm=4711', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_2_noureddine_al_torman', name: 'Noureddine Al-Torman', number: 22, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', photo_url: 'https://img.a.transfermarkt.technology/portrait/medium/1119510-1770677822.jpeg?lm=4711', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_3_salameh_salman', name: 'Salameh Salman', number: 99, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_4_sa_l_castro', name: 'Saúl Castro', number: 4, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 24, nationality: 'Ecuador', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/44.png?lm=4711' },
  { id: 'ply_tm_5_amer_al_majdoubah', name: 'Amer Al-Majdoubah', number: 14, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_6_ali_rabaei', name: 'Ali Rabaei', number: 6, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 23, nationality: 'Palestina', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/240.png?lm=4711' },
  { id: 'ply_tm_7_qusai_tannous', name: 'Qusai Tannous', number: 16, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_8_hassan_holwah', name: 'Hassan Holwah', number: 3, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 23, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_9_mohammad_abu_ghoush', name: 'Mohammad Abu Ghoush', number: 9, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_10_jordy_dur_n', name: 'Jordy Durán', number: 10, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'República Dominicana', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/43.png?lm=4711' },
  { id: 'ply_tm_11_yazeed_mahfouz', name: 'Yazeed Mahfouz', number: 2, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 25, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_12_anas_zabout', name: 'Anas Zabout', number: 4, position: 'Lateral Derecho', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_13_ghassan_abu_hassan', name: 'Ghassan Abu Hassan', number: 55, position: 'Lateral Derecho', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_14_saif_suleiman', name: 'Saif Suleiman', number: 6, position: 'Pivote Defensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_15_ismail_freihat', name: 'Ismail Freihat', number: 15, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 19, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_16_rashid_al_shroqi', name: 'Rashid Al-Shroqi', number: 21, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_17_ahmad_khaled', name: 'Ahmad Khaled', number: 26, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_18_mustafa_al_saifi', name: 'Mustafa Al-Saifi', number: 23, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_19_fayez_draghmeh', name: 'Fayez Draghmeh', number: 88, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_20_ayham_hisham', name: 'Ayham Hisham', number: 10, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_21_hamza_al_shamali', name: 'Hamza Al-Shamali', number: 21, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 30, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_22_anas_zara', name: 'Anas Zara', number: 22, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 17, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_23_mohamad_al_absi', name: 'Mohamad Al-Absi', number: 77, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_24_iyed_belgacem', name: 'Iyed Belgacem', number: 27, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Túnez', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/173.png?lm=4711' },
  { id: 'ply_tm_25_mohammad_abu_arqob', name: 'Mohammad Abu Arqob', number: 25, position: 'Extremo Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 30, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_26_adham_al_refaei', name: 'Adham Al-Refaei', number: 70, position: 'Extremo Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_27_khaldoon_sabra', name: 'Khaldoon Sabra', number: 27, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_28_shaher_shelbaieh', name: 'Shaher Shelbaieh', number: 17, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
  { id: 'ply_tm_29_maikel_caicedo', name: 'Maikel Caicedo', number: 29, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 24, nationality: 'Ecuador', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/44.png?lm=4711' }
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
    home_team_logo: '/logo.png',
    away_team: 'Al Ramtha',
    away_team_logo: 'https://static.flashscore.com/res/image/data/AcAGnYwS-riw7cLfq.png',
    home_score: 1,
    away_score: 1,
    status: 'Finalizado',
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
    away_team_logo: '/logo.png',
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
    home_team_logo: '/logo.png',
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
    home_team_logo: '/logo.png',
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

function sanitizeMatchLogos(m: Match): Match {
  const norm = (s: string) => (s || '').toLowerCase();
  const isShababHome = norm(m.home_team).includes('shabab') || norm(m.home_team).includes('ordon');
  const isShababAway = norm(m.away_team).includes('shabab') || norm(m.away_team).includes('ordon');

  return {
    ...m,
    home_team_logo: isShababHome ? '/logo.png' : m.home_team_logo,
    away_team_logo: isShababAway ? '/logo.png' : m.away_team_logo,
  };
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    const parsed = JSON.parse(data);
    if (Array.isArray(defaultValue) && Array.isArray(parsed) && parsed.length === 0 && defaultValue.length > 0) {
      return defaultValue;
    }
    return parsed;
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
    const matches: Match[] = getFromStorage(STORAGE_KEYS.MATCHES, SEED_MATCHES);
    const sanitized = matches.map(sanitizeMatchLogos);
    setToStorage(STORAGE_KEYS.MATCHES, sanitized);
    return sanitized;
  },

  async syncMatchesFromSupabase(): Promise<Match[]> {
    const remote = await getMatchesFromSupabase();
    if (remote && remote.length > 0) {
      const allLocal = this.getMatches();
      const localMap = new Map(allLocal.map((m) => [m.id, m]));
      const remoteIds = new Set(remote.map((m) => m.id));
      const localOnly = allLocal.filter((m) => !remoteIds.has(m.id));

      const mergedRemote = remote.map((rm) => {
        const local = localMap.get(rm.id);
        if (!local) return rm;
        const rmHomeOk = rm.home_lineup && typeof rm.home_lineup === 'object' && Object.keys(rm.home_lineup).length > 0;
        const rmAwayOk = rm.away_lineup && typeof rm.away_lineup === 'object' && Object.keys(rm.away_lineup).length > 0;
        return {
          ...rm,
          home_lineup: rmHomeOk ? rm.home_lineup : (local.home_lineup || null),
          away_lineup: rmAwayOk ? rm.away_lineup : (local.away_lineup || null),
          video_type: rm.video_type || local.video_type,
          video_url: rm.video_url || local.video_url,
          video_source_name: rm.video_source_name || local.video_source_name,
          p1_video_start_time: rm.p1_video_start_time ?? local.p1_video_start_time,
          p2_video_start_time: rm.p2_video_start_time ?? local.p2_video_start_time,
          botonera_template_id: rm.botonera_template_id || local.botonera_template_id,
        };
      });

      const merged = [...mergedRemote, ...localOnly].map(sanitizeMatchLogos);
      setToStorage(STORAGE_KEYS.MATCHES, merged);
      return merged;
    }
    const sanitized = this.getMatches();
    setToStorage(STORAGE_KEYS.MATCHES, sanitized);
    return sanitized;
  },

  getMatchById(id: string): Match | undefined {
    const matches = this.getMatches();
    return matches.find(m => m.id === id);
  },

  saveMatch(match: Match): void {
    const matches = this.getMatches();

    const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existingIdx = matches.findIndex(m => {
      // 1. Direct ID or Flashscore MID match
      if (m.id === match.id) return true;
      if (m.flashscore_mid && match.flashscore_mid && m.flashscore_mid === match.flashscore_mid) return true;

      // 2. Same date AND same teams
      if (m.date && match.date && m.date === match.date) {
        const sameHome = norm(m.home_team).includes(norm(match.home_team)) || norm(match.home_team).includes(norm(m.home_team));
        const sameAway = norm(m.away_team).includes(norm(match.away_team)) || norm(match.away_team).includes(norm(m.away_team));
        if (sameHome || sameAway) return true;
      }

      // 3. Same round/jornada (e.g. "Jornada 1") AND matching teams
      if (m.round && match.round && norm(m.round) === norm(match.round)) {
        const sameHome = norm(m.home_team).includes(norm(match.home_team)) || norm(match.home_team).includes(norm(m.home_team));
        const sameAway = norm(m.away_team).includes(norm(match.away_team)) || norm(match.away_team).includes(norm(m.away_team));
        if (sameHome || sameAway) return true;
      }

      return false;
    });

    let savedTarget: Match;
    if (existingIdx >= 0) {
      const existing = matches[existingIdx];
      savedTarget = sanitizeMatchLogos({
        ...existing,
        ...match,
        id: existing.id, // Keep existing ID so links and event relations don't break
        home_score: match.status === 'Finalizado' || match.home_score > 0 ? match.home_score : existing.home_score,
        away_score: match.status === 'Finalizado' || match.away_score > 0 ? match.away_score : existing.away_score,
        status: match.status === 'Finalizado' ? 'Finalizado' : existing.status,
        import_status: existing.import_status === 'XML Importado' ? 'XML Importado' : match.import_status,
        event_count: existing.event_count > 0 ? existing.event_count : match.event_count,
        video_type: match.video_type !== undefined ? match.video_type : existing.video_type,
        video_url: match.video_url !== undefined ? match.video_url : existing.video_url,
        video_source_name: match.video_source_name !== undefined ? match.video_source_name : existing.video_source_name,
        p1_video_start_time: match.p1_video_start_time !== undefined ? match.p1_video_start_time : existing.p1_video_start_time,
        p2_video_start_time: match.p2_video_start_time !== undefined ? match.p2_video_start_time : existing.p2_video_start_time,
        botonera_template_id: match.botonera_template_id !== undefined ? match.botonera_template_id : existing.botonera_template_id,
        home_lineup: match.home_lineup !== undefined ? match.home_lineup : existing.home_lineup,
        away_lineup: match.away_lineup !== undefined ? match.away_lineup : existing.away_lineup,
      });
      matches[existingIdx] = savedTarget;
    } else {
      savedTarget = sanitizeMatchLogos(match);
      matches.unshift(savedTarget);
    }
    setToStorage(STORAGE_KEYS.MATCHES, matches.map(sanitizeMatchLogos));

    // Sync match analysis data to Supabase
    saveMatchesToSupabase([savedTarget]).catch((err) => {
      console.warn('Could not sync match analysis to Supabase:', err);
    });

    // Also update home_lineup and away_lineup in associated match_analyses
    if (savedTarget.home_lineup || savedTarget.away_lineup) {
      const analyses = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
      let changed = false;
      const updatedAnalyses = analyses.map((a) => {
        if (a.match_id === savedTarget.id || a.id === savedTarget.id) {
          changed = true;
          const updatedA = {
            ...a,
            home_lineup: savedTarget.home_lineup || a.home_lineup,
            away_lineup: savedTarget.away_lineup || a.away_lineup,
          };
          saveAnalysisToSupabase(updatedA).catch(() => {});
          return updatedA;
        }
        return a;
      });
      if (changed) {
        setToStorage(STORAGE_KEYS.MATCH_ANALYSES, updatedAnalyses);
      }
    }
  },

  // Normalized Events
  getNormalizedEvents(matchId?: string): NormalizedEvent[] {
    const allEvents: NormalizedEvent[] = getFromStorage(STORAGE_KEYS.EVENTS, []);
    if (!matchId) return allEvents;
    return allEvents.filter(e => e.match_id === matchId);
  },

  async syncAnalysisEventsFromSupabase(matchId?: string): Promise<NormalizedEvent[]> {
    if (!matchId) return this.getNormalizedEvents();
    try {
      const remoteEvs = await getAnalysisEventsFromSupabase(matchId);
      if (remoteEvs && remoteEvs.length > 0) {
        this.saveNormalizedEvents(remoteEvs, false);
      }
    } catch (err) {
      console.warn('Could not sync analysis_events from Supabase:', err);
    }
    return this.getNormalizedEvents(matchId);
  },

  saveNormalizedEvents(newEvents: NormalizedEvent[], replaceMatchEvents = false): void {
    let allEvents = this.getNormalizedEvents();
    if (newEvents.length > 0 && replaceMatchEvents) {
      const targetMatchId = newEvents[0].match_id;
      allEvents = allEvents.filter(e => e.match_id !== targetMatchId);
    } else if (newEvents.length > 0) {
      const newIds = new Set(newEvents.map(e => e.event_id));
      allEvents = allEvents.filter(e => !newIds.has(e.event_id));
    }
    allEvents = [...newEvents, ...allEvents];
    setToStorage(STORAGE_KEYS.EVENTS, allEvents);
  },

  deleteMatchEvents(matchId: string): void {
    const allEvents = this.getNormalizedEvents();
    const filtered = allEvents.filter(e => e.match_id !== matchId);
    setToStorage(STORAGE_KEYS.EVENTS, filtered);
  },

  // Trash & Recovery Backup (protection against accidental deletion)
  getTrashEvents(): NormalizedEvent[] {
    return getFromStorage<NormalizedEvent[]>(STORAGE_KEYS.TRASH_EVENTS, []);
  },

  backupDeletedEvents(eventsToBackup: NormalizedEvent[]): void {
    if (!eventsToBackup || eventsToBackup.length === 0) return;
    const currentTrash = this.getTrashEvents();
    const merged = [...eventsToBackup, ...currentTrash].slice(0, 500);
    setToStorage(STORAGE_KEYS.TRASH_EVENTS, merged);
  },

  restoreTrashEvents(matchId?: string): NormalizedEvent[] {
    const trash = this.getTrashEvents();
    if (trash.length === 0) return [];

    const toRestore = matchId ? trash.filter(e => e.match_id === matchId) : trash;
    if (toRestore.length > 0) {
      this.saveNormalizedEvents(toRestore, false);
      const remainingTrash = trash.filter(e => !toRestore.some(r => r.event_id === e.event_id));
      setToStorage(STORAGE_KEYS.TRASH_EVENTS, remainingTrash);
    }
    return toRestore;
  },

  clearTrash(): void {
    setToStorage(STORAGE_KEYS.TRASH_EVENTS, []);
  },

  // Players
  getPlayers(): Player[] {
    const list = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
    if (!list || list.length < SEED_PLAYERS.length) {
      setToStorage(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
      return SEED_PLAYERS;
    }
    return list;
  },

  async syncPlayersFromSupabase(): Promise<Player[]> {
    const remote = await getPlayersFromSupabase();
    if (remote && remote.length > 0) {
      const allLocal = this.getPlayers();
      const remoteIds = new Set(remote.map(p => p.id));
      const localOnly = allLocal.filter(p => !remoteIds.has(p.id));
      const merged = [...remote, ...localOnly];
      setToStorage(STORAGE_KEYS.PLAYERS, merged);
      return merged;
    }
    return this.getPlayers();
  },

  savePlayer(player: Player): void {
    const players = this.getPlayers();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const idx = players.findIndex(p => p.id === player.id || (p.name && norm(p.name) === norm(player.name)));
    let saved: Player;
    if (idx >= 0) {
      saved = {
        ...players[idx],
        ...player,
        id: players[idx].id, // Preserve existing ID
      };
      players[idx] = saved;
    } else {
      saved = player;
      players.push(saved);
    }
    setToStorage(STORAGE_KEYS.PLAYERS, players);

    savePlayersToSupabase([saved]).catch((err) => {
      console.warn('Could not sync player to Supabase:', err);
    });
  },

  deletePlayer(playerId: string): void {
    const players = this.getPlayers().filter(p => p.id !== playerId);
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

  async syncBotoneraTemplatesFromSupabase(): Promise<BotoneraTemplate[]> {
    const remoteTemplates = await getBotoneraTemplatesFromSupabase();
    if (remoteTemplates && remoteTemplates.length > 0) {
      setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, remoteTemplates);
      return remoteTemplates;
    }
    const current = this.getBotoneraTemplates();
    if (current && current.length > 0) {
      current.forEach(t => {
        saveBotoneraTemplateToSupabase(t).catch(() => {});
      });
    }
    return current;
  },

  saveBotoneraTemplate(template: BotoneraTemplate): void {
    const templates = this.getBotoneraTemplates();
    const idx = templates.findIndex(t => t.id === template.id);
    let updatedTmpl: BotoneraTemplate;
    if (idx >= 0) {
      updatedTmpl = { ...template, updated_at: new Date().toISOString() };
      templates[idx] = updatedTmpl;
    } else {
      updatedTmpl = { ...template, created_at: new Date().toISOString() };
      templates.unshift(updatedTmpl);
    }
    setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, templates);

    // Sync template asynchronously to Supabase
    saveBotoneraTemplateToSupabase(updatedTmpl).catch(err => {
      console.warn("Could not sync botonera template to Supabase:", err);
    });
  },

  deleteBotoneraTemplate(id: string): void {
    const templates = this.getBotoneraTemplates();
    const filtered = templates.filter(t => t.id !== id);
    setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, filtered);

    // Sync deletion asynchronously to Supabase
    deleteBotoneraTemplateFromSupabase(id).catch(err => {
      console.warn("Could not sync template deletion to Supabase:", err);
    });
  },

  resetBotoneraTemplates(): BotoneraTemplate[] {
    setToStorage(STORAGE_KEYS.BOTONERA_TEMPLATES, SEED_BOTONERA_TEMPLATES);
    SEED_BOTONERA_TEMPLATES.forEach(t => {
      saveBotoneraTemplateToSupabase(t).catch(() => {});
    });
    return SEED_BOTONERA_TEMPLATES;
  },

  // Active Session Persistence across Route Navigations, Tab Focus & Supabase Sync
  getActiveBotoneraSession(): ActiveBotoneraSession | null {
    return getFromStorage<ActiveBotoneraSession | null>(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, null);
  },

  async syncActiveSessionFromSupabase(matchId?: string): Promise<ActiveBotoneraSession | null> {
    const remoteSession = await getAnalysisSessionFromSupabase(matchId);
    if (remoteSession) {
      setToStorage(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, remoteSession);
      return remoteSession;
    }
    return this.getActiveBotoneraSession();
  },

  async getAllActiveSessions(): Promise<Record<string, ActiveBotoneraSession>> {
    const remoteSessions = await getAllActiveSessionsFromSupabase();
    const localSession = this.getActiveBotoneraSession();
    if (localSession && localSession.selectedMatchId) {
      remoteSessions[localSession.selectedMatchId] = localSession;
    }
    return remoteSessions;
  },

  _lastActiveSessionSupabaseSync: 0,

  saveActiveBotoneraSession(session: ActiveBotoneraSession): void {
    setToStorage(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, session);

    // Sync active session asynchronously to Supabase (throttled to every 5s or when paused)
    const now = Date.now();
    if (now - (this._lastActiveSessionSupabaseSync || 0) > 5000 || !session.isTimerRunning) {
      this._lastActiveSessionSupabaseSync = now;
      saveAnalysisSessionToSupabase(session).catch(err => {
        console.warn("Could not sync active session to Supabase:", err);
      });
    }
  },

  clearActiveBotoneraSession(matchId?: string): void {
    const currentSession = this.getActiveBotoneraSession();
    const targetMatchId = matchId || currentSession?.selectedMatchId;

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION);
    }

    if (targetMatchId) {
      deleteAnalysisSessionFromSupabase(targetMatchId).catch(err => {
        console.warn("Could not delete active session from Supabase:", err);
      });
    }
  },

  // Match Analyses Management
  getAnalyses(matchId?: string): MatchAnalysis[] {
    const list = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
    
    // Deduplicate list by match_id (falling back to analysis id if no match_id)
    const deduplicatedMap = new Map<string, MatchAnalysis>();
    list.forEach((item) => {
      const key = item.match_id || item.id;
      const existing = deduplicatedMap.get(key);
      if (!existing) {
        deduplicatedMap.set(key, item);
      } else {
        const existingCount = existing.events?.length || 0;
        const itemCount = item.events?.length || 0;
        if (itemCount >= existingCount) {
          deduplicatedMap.set(key, item);
        }
      }
    });

    const deduplicatedList = Array.from(deduplicatedMap.values());
    if (!matchId) return deduplicatedList;
    return deduplicatedList.filter(a => a.match_id === matchId);
  },

  getAnalysisById(id: string): MatchAnalysis | undefined {
    const list = this.getAnalyses();
    return list.find(a => a.id === id || a.match_id === id);
  },

  async syncAnalysesFromSupabase(matchId?: string): Promise<MatchAnalysis[]> {
    const remote = await getAnalysesFromSupabase(matchId);
    if (remote && remote.length > 0) {
      const allLocal = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
      const localMap = new Map(allLocal.map((a) => [a.id, a]));
      const nonMatchLocal = matchId ? allLocal.filter((a) => a.match_id !== matchId) : [];

      const mergedRemote = remote.map((ra) => {
        const local = localMap.get(ra.id) || allLocal.find((la) => la.match_id === ra.match_id);
        if (!local) return ra;
        const raHomeOk = ra.home_lineup && typeof ra.home_lineup === 'object' && Object.keys(ra.home_lineup).length > 0;
        const raAwayOk = ra.away_lineup && typeof ra.away_lineup === 'object' && Object.keys(ra.away_lineup).length > 0;
        return {
          ...ra,
          home_lineup: raHomeOk ? ra.home_lineup : (local.home_lineup || null),
          away_lineup: raAwayOk ? ra.away_lineup : (local.away_lineup || null),
        };
      });

      const merged = [...mergedRemote, ...nonMatchLocal];
      setToStorage(STORAGE_KEYS.MATCH_ANALYSES, merged);
      return this.getAnalyses(matchId);
    }
    return this.getAnalyses(matchId);
  },

  saveAnalysis(analysis: MatchAnalysis): void {
    const all = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
    const idx = all.findIndex(a => a.id === analysis.id || (analysis.match_id && a.match_id === analysis.match_id));
    let updated: MatchAnalysis;
    if (idx >= 0) {
      const existing = all[idx];
      updated = {
        ...existing,
        ...analysis,
        id: existing.id, // Keep existing ID
        created_at: existing.created_at || analysis.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all[idx] = updated;
    } else {
      updated = {
        ...analysis,
        created_at: analysis.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all.unshift(updated);
    }

    // Deduplicate remaining entries in storage by match_id (or item.id)
    const finalMap = new Map<string, MatchAnalysis>();
    all.forEach((item) => {
      const key = item.match_id || item.id;
      const existing = finalMap.get(key);
      if (!existing || (item.events?.length || 0) >= (existing.events?.length || 0)) {
        finalMap.set(key, item);
      }
    });

    const deduplicated = Array.from(finalMap.values());
    setToStorage(STORAGE_KEYS.MATCH_ANALYSES, deduplicated);

    // Sync analysis asynchronously to Supabase
    saveAnalysisToSupabase(updated).catch(err => {
      console.warn("Could not sync analysis to Supabase:", err);
    });

    // Also update home_lineup and away_lineup in associated match
    if (updated.match_id && (updated.home_lineup || updated.away_lineup)) {
      const matches = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
      const mIdx = matches.findIndex((m) => m.id === updated.match_id);
      if (mIdx >= 0) {
        const updatedM = {
          ...matches[mIdx],
          home_lineup: updated.home_lineup || matches[mIdx].home_lineup,
          away_lineup: updated.away_lineup || matches[mIdx].away_lineup,
        };
        matches[mIdx] = updatedM;
        setToStorage(STORAGE_KEYS.MATCHES, matches);
        saveMatchesToSupabase([updatedM]).catch(() => {});
      }
    }
  },

  deleteAnalysis(id: string): void {
    const all = this.getAnalyses();
    const target = all.find(a => a.id === id);
    const matchId = target?.match_id || (id.startsWith('analysis_') ? id.replace('analysis_', '') : undefined);

    const filtered = all.filter(a => a.id !== id);
    setToStorage(STORAGE_KEYS.MATCH_ANALYSES, filtered);

    if (matchId) {
      this.clearActiveBotoneraSession(matchId);
      clearAnalysisEventsFromSupabase(matchId).catch(() => {});
    }

    deleteAnalysisFromSupabase(id).catch(err => {
      console.warn("Could not delete analysis from Supabase:", err);
    });
  },

  // Match Dashboards (pizarras configurables por partido)
  getDashboards(matchId?: string): MatchDashboard[] {
    const list = getFromStorage<MatchDashboard[]>(STORAGE_KEYS.MATCH_DASHBOARDS, []);
    
    // Deduplicate by id and by match_id + name combination
    const deduplicatedMap = new Map<string, MatchDashboard>();
    list.forEach((item) => {
      const keyByCombo = `${item.match_id}_${item.name.trim().toLowerCase()}`;
      const existing = deduplicatedMap.get(item.id) || deduplicatedMap.get(keyByCombo);
      
      if (!existing) {
        deduplicatedMap.set(item.id, item);
        deduplicatedMap.set(keyByCombo, item);
      } else {
        // Keep the dashboard with more widgets or latest updated_at
        if ((item.widgets?.length || 0) >= (existing.widgets?.length || 0)) {
          deduplicatedMap.set(item.id, item);
          deduplicatedMap.set(keyByCombo, item);
        }
      }
    });

    const uniqueDashboards = Array.from(new Set(deduplicatedMap.values()));
    if (!matchId) return uniqueDashboards;
    return uniqueDashboards.filter(d => d.match_id === matchId);
  },

  getDashboardById(id: string): MatchDashboard | undefined {
    return this.getDashboards().find(d => d.id === id);
  },

  async syncDashboardsFromSupabase(matchId?: string): Promise<MatchDashboard[]> {
    const remote = await getDashboardsFromSupabase(matchId);
    if (remote && remote.length > 0) {
      const allLocal = this.getDashboards();
      const remoteIds = new Set(remote.map(d => d.id));
      const localOnly = allLocal.filter(d => !remoteIds.has(d.id));
      const merged = [...remote, ...localOnly];
      
      // Deduplicate merged array
      const deduplicatedMap = new Map<string, MatchDashboard>();
      merged.forEach(item => {
        const keyByCombo = `${item.match_id}_${item.name.trim().toLowerCase()}`;
        if (!deduplicatedMap.has(item.id) && !deduplicatedMap.has(keyByCombo)) {
          deduplicatedMap.set(item.id, item);
          deduplicatedMap.set(keyByCombo, item);
        }
      });
      const uniqueMerged = Array.from(new Set(deduplicatedMap.values()));

      setToStorage(STORAGE_KEYS.MATCH_DASHBOARDS, uniqueMerged);
      return matchId ? uniqueMerged.filter(d => d.match_id === matchId) : uniqueMerged;
    }
    return this.getDashboards(matchId);
  },

  saveDashboard(dashboard: MatchDashboard): void {
    const all = this.getDashboards();
    const idx = all.findIndex(
      d => d.id === dashboard.id || (d.match_id === dashboard.match_id && d.name.trim().toLowerCase() === dashboard.name.trim().toLowerCase())
    );
    const now = new Date().toISOString();
    let updated: MatchDashboard;
    if (idx >= 0) {
      updated = { ...all[idx], ...dashboard, updated_at: now };
      all[idx] = updated;
    } else {
      updated = { ...dashboard, created_at: dashboard.created_at || now, updated_at: now };
      all.unshift(updated);
    }

    // Clean up any remaining duplicates in storage
    const deduplicatedMap = new Map<string, MatchDashboard>();
    all.forEach(item => {
      const keyByCombo = `${item.match_id}_${item.name.trim().toLowerCase()}`;
      if (!deduplicatedMap.has(item.id) && !deduplicatedMap.has(keyByCombo)) {
        deduplicatedMap.set(item.id, item);
        deduplicatedMap.set(keyByCombo, item);
      }
    });
    const uniqueList = Array.from(new Set(deduplicatedMap.values()));

    setToStorage(STORAGE_KEYS.MATCH_DASHBOARDS, uniqueList);

    saveDashboardToSupabase(updated).catch(err => {
      console.warn("Could not sync dashboard to Supabase:", err);
    });
  },

  deleteDashboard(id: string): void {
    const filtered = this.getDashboards().filter(d => d.id !== id);
    setToStorage(STORAGE_KEYS.MATCH_DASHBOARDS, filtered);

    deleteDashboardFromSupabase(id).catch(err => {
      console.warn("Could not delete dashboard from Supabase:", err);
    });
  },

  // Dashboard Customization Config
  getDashboardConfig(): DashboardGlobalConfig {
    const cfg = getFromStorage<DashboardGlobalConfig | null>(STORAGE_KEYS.DASHBOARD_CONFIG, null);
    if (!cfg) return DEFAULT_DASHBOARD_CONFIG;
    return { ...DEFAULT_DASHBOARD_CONFIG, ...cfg };
  },

  saveDashboardConfig(config: DashboardGlobalConfig): void {
    setToStorage(STORAGE_KEYS.DASHBOARD_CONFIG, config);
  }
};


