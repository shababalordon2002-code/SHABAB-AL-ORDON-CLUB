import { Match, Player, PlayerMapping, Team, Competition, ImportLog, NormalizedEvent, BotoneraTemplate, ActiveBotoneraSession, MatchAnalysis, MatchDashboard, DashboardGlobalConfig } from '@/types';
import {
  saveBotoneraTemplateToSupabase,
  saveBotoneraTemplatesToSupabase,
  deleteBotoneraTemplateFromSupabase,
  getBotoneraTemplatesFromSupabase,
  saveAnalysisSessionToSupabase,
  getAnalysisSessionFromSupabase,
  getAllActiveSessionsFromSupabase,
  deleteAnalysisSessionFromSupabase,
  clearAnalysisEventsFromSupabase,
  getAnalysisEventsFromSupabase,
  getAnalysisEventsForMatchesFromSupabase
} from '@/lib/services/botonera-service';
import { saveMatchesToSupabase, getMatchesFromSupabase } from '@/lib/services/matches-service';
import { getPlayersFromSupabase, savePlayersToSupabase } from '@/lib/services/players-service';
import { fetchAnalysesFromSupabase, fetchAnalysesAndTombstonesFromSupabase, saveAnalysisToSupabase, deleteAnalysisFromSupabase } from '@/lib/services/analysis-service';
import { getDashboardsFromSupabase, saveDashboardToSupabase, deleteDashboardFromSupabase } from '@/lib/services/dashboard-service';
import { isMatchOnOrAfterSept2026 } from '@/lib/utils/date-utils';
import { isValidLineup } from '@/lib/live-lineups';

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
  DELETED_EVENT_IDS: 'sao_analytics_deleted_event_ids_v1',
  DELETED_MATCH_IDS: 'sao_analytics_deleted_match_ids_v1',
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

export const SEED_MATCH_ANALYSES: MatchAnalysis[] = [];

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
    home_score: 1,
    away_score: 1,
    status: 'Finalizado',
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
    const validMatches = matches.filter((m) => isMatchOnOrAfterSept2026(m.date));

    // Sincronizar parámetros de vídeo y minutajes del partido directamente desde los análisis de la Botonera
    const analyses = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
    const analysisMap = new Map<string, MatchAnalysis>();
    analyses.forEach((a) => {
      if (a && a.match_id && a.video_url && a.video_url.trim()) {
        analysisMap.set(a.match_id, a);
      }
    });

    const activeSession = this.getActiveBotoneraSession();

    const synchronized = validMatches.map((m) => {
      const an = analysisMap.get(m.id);
      const isCurrentActive = activeSession && activeSession.selectedMatchId === m.id;
      const liveVideoUrl = isCurrentActive && activeSession.videoUrl && activeSession.videoUrl.trim() ? activeSession.videoUrl : null;
      const liveVideoType = isCurrentActive && activeSession.videoType ? activeSession.videoType : null;
      const liveVideoSource = isCurrentActive && activeSession.videoSourceName ? activeSession.videoSourceName : null;
      const liveP1 = isCurrentActive && activeSession.p1VideoStartSeconds != null ? activeSession.p1VideoStartSeconds : null;
      const liveP2 = isCurrentActive && activeSession.p2VideoStartSeconds != null ? activeSession.p2VideoStartSeconds : null;
      const liveAdjustments = isCurrentActive && activeSession.periodAdjustments ? activeSession.periodAdjustments : null;

      // Siempre priorizar: Sesión en vivo de Botonera > Análisis guardado en Botonera > Registro del partido
      const resolvedVideo = liveVideoUrl || an?.video_url || m.video_url;
      const resolvedType = liveVideoType || an?.video_type || m.video_type;
      const resolvedSource = liveVideoSource || an?.video_source_name || m.video_source_name;
      const resolvedP1 = liveP1 ?? an?.p1_video_start_time ?? m.p1_video_start_time;
      const resolvedP2 = liveP2 ?? an?.p2_video_start_time ?? m.p2_video_start_time;
      const resolvedAdjustments = liveAdjustments ?? an?.period_adjustments ?? m.period_adjustments;

      return sanitizeMatchLogos({
        ...m,
        video_url: resolvedVideo || m.video_url,
        video_type: resolvedType || m.video_type,
        video_source_name: resolvedSource || m.video_source_name,
        p1_video_start_time: resolvedP1 ?? m.p1_video_start_time,
        p2_video_start_time: resolvedP2 ?? m.p2_video_start_time,
        period_adjustments: resolvedAdjustments ?? m.period_adjustments,
      });
    });

    return synchronized;
  },

  async syncMatchesFromSupabase(): Promise<Match[]> {
    const remoteRaw = await getMatchesFromSupabase();
    const remote = remoteRaw ? remoteRaw.filter((rm) => isMatchOnOrAfterSept2026(rm.date)) : [];
    if (remote && remote.length > 0) {
      const allLocal = this.getMatches();
      const localMap = new Map(allLocal.map((m) => [m.id, m]));
      const remoteIds = new Set(remote.map((m) => m.id));
      const localOnly = allLocal.filter((m) => {
        if (remoteIds.has(m.id)) return false;
        if (!isMatchOnOrAfterSept2026(m.date)) return false;
        return true;
      });

      const mergedRemote = remote.map((rm) => {
        const local = localMap.get(rm.id);
        if (!local) return rm;
        const rmHomeOk = isValidLineup(rm.home_lineup);
        const rmAwayOk = isValidLineup(rm.away_lineup);
        const localHomeOk = isValidLineup(local.home_lineup);
        const localAwayOk = isValidLineup(local.away_lineup);
        return {
          ...rm,
          home_lineup: rmHomeOk ? rm.home_lineup : (localHomeOk ? local.home_lineup : null),
          away_lineup: rmAwayOk ? rm.away_lineup : (localAwayOk ? local.away_lineup : null),
          video_type: rm.video_type || local.video_type,
          video_url: rm.video_url || local.video_url,
          video_source_name: rm.video_source_name || local.video_source_name,
          p1_video_start_time: rm.p1_video_start_time ?? local.p1_video_start_time,
          p2_video_start_time: rm.p2_video_start_time ?? local.p2_video_start_time,
          period_adjustments: rm.period_adjustments ?? local.period_adjustments ?? (local.home_lineup as any)?._period_adjustments ?? null,
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
    if (!isMatchOnOrAfterSept2026(match.date)) return;
    const matches = this.getMatches();

    const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existingIdx = matches.findIndex(m => {
      // 1. Direct ID or Flashscore MID match
      if (m.id === match.id) return true;
      if (m.flashscore_mid && match.flashscore_mid && m.flashscore_mid === match.flashscore_mid) return true;

      // 2. Same date AND both same teams
      if (m.date && match.date && m.date === match.date) {
        const sameHome = norm(m.home_team).includes(norm(match.home_team)) || norm(match.home_team).includes(norm(m.home_team));
        const sameAway = norm(m.away_team).includes(norm(match.away_team)) || norm(match.away_team).includes(norm(m.away_team));
        if (sameHome && sameAway) return true;
      }

      // 3. Same round/jornada (e.g. "Jornada 1") AND both same teams
      if (m.round && match.round && norm(m.round) === norm(match.round)) {
        const sameHome = norm(m.home_team).includes(norm(match.home_team)) || norm(match.home_team).includes(norm(m.home_team));
        const sameAway = norm(m.away_team).includes(norm(match.away_team)) || norm(match.away_team).includes(norm(m.away_team));
        if (sameHome && sameAway) return true;
      }

      return false;
    });

    let savedTarget: Match;
    const existing = existingIdx >= 0 ? matches[existingIdx] : undefined;

    // Check associated analysis for fallback video & offsets
    const analyses = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
    const associatedAnalysis = analyses.find((a) => a.match_id === match.id || a.id === match.id || a.id === `analysis_${match.id}`);

    const resolvedVideoUrl = (match.video_url && match.video_url.trim()) || existing?.video_url || associatedAnalysis?.video_url || null;
    const resolvedVideoType = match.video_type || existing?.video_type || associatedAnalysis?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : undefined);
    const resolvedVideoSourceName = match.video_source_name || existing?.video_source_name || associatedAnalysis?.video_source_name || undefined;
    const resolvedP1 = match.p1_video_start_time != null ? match.p1_video_start_time : (existing?.p1_video_start_time ?? associatedAnalysis?.p1_video_start_time ?? null);
    const resolvedP2 = match.p2_video_start_time != null ? match.p2_video_start_time : (existing?.p2_video_start_time ?? associatedAnalysis?.p2_video_start_time ?? null);
    const resolvedAdjustments = match.period_adjustments !== undefined
      ? match.period_adjustments
      : (existing?.period_adjustments ?? associatedAnalysis?.period_adjustments ?? null);
    const resolvedTemplateId = match.botonera_template_id || existing?.botonera_template_id || associatedAnalysis?.botonera_template_id || undefined;
    const resolvedHomeLineup = (isValidLineup(match.home_lineup) ? match.home_lineup : null) ||
      (isValidLineup(existing?.home_lineup) ? existing?.home_lineup : null) ||
      (isValidLineup(associatedAnalysis?.home_lineup) ? associatedAnalysis?.home_lineup : null) ||
      undefined;
    const resolvedAwayLineup = (isValidLineup(match.away_lineup) ? match.away_lineup : null) ||
      (isValidLineup(existing?.away_lineup) ? existing?.away_lineup : null) ||
      (isValidLineup(associatedAnalysis?.away_lineup) ? associatedAnalysis?.away_lineup : null) ||
      undefined;

    if (existingIdx >= 0 && existing) {
      savedTarget = sanitizeMatchLogos({
        ...existing,
        ...match,
        id: existing.id, // Keep existing ID so links and event relations don't break
        home_score: match.home_score !== undefined ? match.home_score : existing.home_score,
        away_score: match.away_score !== undefined ? match.away_score : existing.away_score,
        status: match.status === 'Finalizado' ? 'Finalizado' : existing.status,
        import_status: existing.import_status === 'XML Importado' ? 'XML Importado' : match.import_status,
        event_count: existing.event_count > 0 ? existing.event_count : match.event_count,
        video_type: resolvedVideoType,
        video_url: resolvedVideoUrl || undefined,
        video_source_name: resolvedVideoSourceName,
        p1_video_start_time: resolvedP1,
        p2_video_start_time: resolvedP2,
        period_adjustments: resolvedAdjustments,
        botonera_template_id: resolvedTemplateId,
        home_lineup: resolvedHomeLineup,
        away_lineup: resolvedAwayLineup,
      });
      matches[existingIdx] = savedTarget;
    } else {
      savedTarget = sanitizeMatchLogos({
        ...match,
        video_type: resolvedVideoType,
        video_url: resolvedVideoUrl || undefined,
        video_source_name: resolvedVideoSourceName,
        p1_video_start_time: resolvedP1,
        p2_video_start_time: resolvedP2,
        period_adjustments: resolvedAdjustments,
        botonera_template_id: resolvedTemplateId,
        home_lineup: resolvedHomeLineup,
        away_lineup: resolvedAwayLineup,
      });
      matches.unshift(savedTarget);
    }
    setToStorage(STORAGE_KEYS.MATCHES, matches.map(sanitizeMatchLogos));

    // Sync match analysis data to Supabase
    saveMatchesToSupabase([savedTarget]).catch((err) => {
      console.warn('Could not sync match analysis to Supabase:', err);
    });

    let analysesChanged = false;
    const updatedAnalyses = analyses.map((a) => {
      if (a.match_id === savedTarget.id || a.id === savedTarget.id || a.id === `analysis_${savedTarget.id}`) {
        analysesChanged = true;
        const updatedA: MatchAnalysis = {
          ...a,
          video_url: resolvedVideoUrl || a.video_url,
          video_type: resolvedVideoType || a.video_type,
          video_source_name: resolvedVideoSourceName || a.video_source_name,
          p1_video_start_time: resolvedP1 != null ? resolvedP1 : a.p1_video_start_time,
          p2_video_start_time: resolvedP2 != null ? resolvedP2 : a.p2_video_start_time,
          period_adjustments: resolvedAdjustments !== undefined ? resolvedAdjustments : a.period_adjustments,
          botonera_template_id: resolvedTemplateId || a.botonera_template_id,
          home_lineup: resolvedHomeLineup || a.home_lineup,
          away_lineup: resolvedAwayLineup,
        };
        // skipEventsTableSync: this local copy may still hold events another analyst deleted;
        // re-upserting them into analysis_events would bring them back for everyone.
        saveAnalysisToSupabase(updatedA, { skipEventsTableSync: true }).catch(() => {});
        return updatedA;
      }
      return a;
    });
    if (analysesChanged) {
      setToStorage(STORAGE_KEYS.MATCH_ANALYSES, updatedAnalyses);
    }
  },

  // Helper for deduplicating events by event_id (preserving unique events tagged by any analyst)
  deduplicateEventsByTime(events: NormalizedEvent[]): NormalizedEvent[] {
    if (!events || events.length === 0) return [];

    // 1. Filter out invalid events
    const valid = events.filter((e) => e && e.event_id);

    // 2. Map by event_id keeping the latest version
    const byIdMap = new Map<string, NormalizedEvent>();
    valid.forEach((e) => {
      if (!byIdMap.has(e.event_id)) {
        byIdMap.set(e.event_id, e);
      } else {
        const existing = byIdMap.get(e.event_id)!;
        const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const currentTime = new Date(e.updated_at || e.created_at || 0).getTime();
        if (currentTime >= existingTime) {
          byIdMap.set(e.event_id, e);
        }
      }
    });

    return Array.from(byIdMap.values());
  },

  // Normalized Events
  getDeletedEventIds(): Set<string> {
    const list = getFromStorage<string[]>(STORAGE_KEYS.DELETED_EVENT_IDS, []);
    const trash = this.getTrashEvents();
    const set = new Set<string>(list);
    trash.forEach((t) => {
      if (t && t.event_id) set.add(t.event_id);
    });
    return set;
  },

  markEventDeleted(eventId: string): void {
    if (!eventId) return;
    const current = getFromStorage<string[]>(STORAGE_KEYS.DELETED_EVENT_IDS, []);
    if (!current.includes(eventId)) {
      current.push(eventId);
      setToStorage(STORAGE_KEYS.DELETED_EVENT_IDS, current.slice(-1000));
    }
  },

  isEventDeleted(eventId: string): boolean {
    if (!eventId) return false;
    return this.getDeletedEventIds().has(eventId);
  },

  getDeletedMatchIds(): Set<string> {
    const list = getFromStorage<string[]>(STORAGE_KEYS.DELETED_MATCH_IDS, []);
    return new Set(list);
  },

  markMatchAnalysisDeleted(matchId: string): void {
    if (!matchId) return;
    const current = getFromStorage<string[]>(STORAGE_KEYS.DELETED_MATCH_IDS, []);
    if (!current.includes(matchId)) {
      current.push(matchId);
      setToStorage(STORAGE_KEYS.DELETED_MATCH_IDS, current.slice(-500));
    }
  },

  unmarkMatchAnalysisDeleted(matchId: string): void {
    if (!matchId) return;
    const current = getFromStorage<string[]>(STORAGE_KEYS.DELETED_MATCH_IDS, []);
    const updated = current.filter((id) => id !== matchId);
    setToStorage(STORAGE_KEYS.DELETED_MATCH_IDS, updated);
  },

  isMatchAnalysisDeleted(_matchId: string): boolean {
    return false;
  },

  getNormalizedEvents(matchId?: string): NormalizedEvent[] {
    const storageEvents: NormalizedEvent[] = getFromStorage(STORAGE_KEYS.EVENTS, []);
    const deletedIds = this.getDeletedEventIds();

    const validEvents = storageEvents.filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
    if (matchId) {
      const matchOnly = validEvents.filter((e) => e.match_id === matchId);
      return this.deduplicateEventsByTime(matchOnly);
    }
    return this.deduplicateEventsByTime(validEvents);
  },

  async syncAnalysisEventsFromSupabase(matchId?: string): Promise<NormalizedEvent[]> {
    if (!matchId) return this.getNormalizedEvents();
    try {
      const remoteEvs = await getAnalysisEventsFromSupabase(matchId);
      if (remoteEvs && remoteEvs.length > 0) {
        this.saveNormalizedEvents(remoteEvs, false, matchId);
      }
    } catch (err) {
      console.warn('Could not sync analysis_events from Supabase:', err);
    }
    return this.getNormalizedEvents(matchId);
  },

  // Same result as calling syncAnalysisEventsFromSupabase(id) for every id, but with a
  // couple of batched queries instead of one request per match.
  async syncAnalysisEventsForMatchesFromSupabase(matchIds: string[]): Promise<void> {
    const byMatch = await getAnalysisEventsForMatchesFromSupabase(matchIds);
    if (!byMatch) {
      await Promise.all(matchIds.map((id) => this.syncAnalysisEventsFromSupabase(id)));
      return;
    }
    byMatch.forEach((evs, matchId) => {
      if (evs.length > 0) this.saveNormalizedEvents(evs, false, matchId);
    });
  },

  // Re-syncs analyses only for the given matches (null = all). Used by Realtime listeners
  // so one change doesn't re-download every analysis and event of every match.
  async syncAnalysesForMatchesFromSupabase(matchIds: string[] | null): Promise<MatchAnalysis[]> {
    if (!matchIds) return this.syncAnalysesFromSupabase();
    for (const id of matchIds) {
      await this.syncAnalysesFromSupabase(id);
    }
    return this.getAnalyses();
  },

  saveNormalizedEvents(newEvents: NormalizedEvent[], replaceMatchEvents = false, overrideMatchId?: string): void {
    const targetMatchId = overrideMatchId || newEvents[0]?.match_id;
    let allEvents = getFromStorage<NormalizedEvent[]>(STORAGE_KEYS.EVENTS, []);
    const deletedIds = this.getDeletedEventIds();
    allEvents = allEvents.filter((e) => e && e.event_id && !deletedIds.has(e.event_id));

    if (replaceMatchEvents && targetMatchId) {
      // Explicit replace (e.g. user manually cleared all events or replaced them)
      const otherMatches = allEvents.filter((e) => e.match_id !== targetMatchId);
      const cleanNew = (newEvents || []).filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
      allEvents = [...cleanNew, ...otherMatches];
      setToStorage(STORAGE_KEYS.EVENTS, allEvents);
      return;
    }

    if (!newEvents || newEvents.length === 0) return;

    // Filter incoming events against deletedIds to guarantee deleted events are never re-saved
    const cleanNewEvents = newEvents.filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
    if (cleanNewEvents.length === 0) return;

    // Safe merge by event_id: never lose events from other analysts
    const byId = new Map<string, NormalizedEvent>();
    allEvents.forEach((e) => {
      if (e && e.event_id) byId.set(e.event_id, e);
    });
    cleanNewEvents.forEach((e) => {
      const existing = byId.get(e.event_id);
      if (!existing) {
        byId.set(e.event_id, e);
      } else {
        const exTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const curTime = new Date(e.updated_at || e.created_at || 0).getTime();
        if (curTime >= exTime) {
          byId.set(e.event_id, e);
        }
      }
    });
    allEvents = Array.from(byId.values());
    setToStorage(STORAGE_KEYS.EVENTS, allEvents);
  },

  deleteMatchEvents(matchId: string): void {
    const allEvents = this.getNormalizedEvents();
    const filtered = allEvents.filter(e => e.match_id !== matchId);
    setToStorage(STORAGE_KEYS.EVENTS, filtered);
  },

  deleteNormalizedEvent(eventId: string, targetEventHint?: NormalizedEvent): void {
    if (!eventId) return;

    // 1. Mark in permanent deleted set so it can NEVER be resurrected
    this.markEventDeleted(eventId);

    // 2. Backup to trash if target can be found
    const allEvents = getFromStorage<NormalizedEvent[]>(STORAGE_KEYS.EVENTS, []);
    const active = this.getActiveBotoneraSession();
    const allAnalyses = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, []);

    const target =
      targetEventHint ||
      allEvents.find((e) => e.event_id === eventId) ||
      active?.events?.find((e) => e.event_id === eventId) ||
      allAnalyses.flatMap((a) => a.events || []).find((e) => e.event_id === eventId);

    if (target) {
      this.backupDeletedEvents([target]);
    }

    // 3. Remove from EVENTS in localStorage
    const filteredEvents = allEvents.filter((e) => e.event_id !== eventId);
    setToStorage(STORAGE_KEYS.EVENTS, filteredEvents);

    // 4. Also remove from active session in localStorage
    if (active && active.events && active.events.some((e) => e.event_id === eventId)) {
      setToStorage(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, {
        ...active,
        events: active.events.filter((e) => e.event_id !== eventId),
        lastUpdatedTimestamp: Date.now(),
      });
    }

    // 5. Also remove from saved analyses in localStorage
    let analysesChanged = false;
    const updatedAnalyses = allAnalyses.map((a) => {
      if (a.events && a.events.some((e) => e.event_id === eventId)) {
        analysesChanged = true;
        return {
          ...a,
          events: a.events.filter((e) => e.event_id !== eventId),
          updated_at: new Date().toISOString(),
        };
      }
      return a;
    });
    if (analysesChanged) {
      setToStorage(STORAGE_KEYS.MATCH_ANALYSES, updatedAnalyses);
    }
  },

  // Trash & Recovery Backup (protection against accidental deletion)
  getTrashEvents(): NormalizedEvent[] {
    return getFromStorage<NormalizedEvent[]>(STORAGE_KEYS.TRASH_EVENTS, []);
  },

  backupDeletedEvents(eventsToBackup: NormalizedEvent[]): void {
    if (!eventsToBackup || eventsToBackup.length === 0) return;
    const currentTrash = this.getTrashEvents();
    const existingIds = new Set(currentTrash.map((t) => t.event_id));
    const newItems = eventsToBackup.filter((e) => e && e.event_id && !existingIds.has(e.event_id));
    if (newItems.length === 0) return;
    const merged = [...newItems, ...currentTrash].slice(0, 500);
    setToStorage(STORAGE_KEYS.TRASH_EVENTS, merged);
  },

  restoreTrashEvents(matchId?: string): NormalizedEvent[] {
    const trash = this.getTrashEvents();
    if (trash.length === 0) return [];

    const toRestore = matchId ? trash.filter((e) => e.match_id === matchId) : trash;
    if (toRestore.length > 0) {
      // Remove from permanent deleted set
      const restoredIds = new Set(toRestore.map((r) => r.event_id));
      const currentDeleted = getFromStorage<string[]>(STORAGE_KEYS.DELETED_EVENT_IDS, []);
      const updatedDeleted = currentDeleted.filter((id) => !restoredIds.has(id));
      setToStorage(STORAGE_KEYS.DELETED_EVENT_IDS, updatedDeleted);

      this.saveNormalizedEvents(toRestore, false);
      const remainingTrash = trash.filter((e) => !restoredIds.has(e.event_id));
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
      saveBotoneraTemplatesToSupabase(current).catch(() => {});
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
    saveBotoneraTemplatesToSupabase(SEED_BOTONERA_TEMPLATES).catch(() => {});
    return SEED_BOTONERA_TEMPLATES;
  },

  // Active Session Persistence across Route Navigations, Tab Focus & Supabase Sync
  getActiveBotoneraSession(): ActiveBotoneraSession | null {
    return getFromStorage<ActiveBotoneraSession | null>(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, null);
  },

  async syncActiveSessionFromSupabase(matchId?: string): Promise<ActiveBotoneraSession | null> {
    const remoteSession = await getAnalysisSessionFromSupabase(matchId);
    if (remoteSession) {
      // La fila remota es compartida por todos los analistas del partido (la escribe el último
      // latido de cualquiera). La sesión local es la de ESTE analista: su crono, periodo e
      // inicios de parte propios, así que para el mismo partido siempre gana y no se pisa.
      const local = this.getActiveBotoneraSession();
      if (local && local.selectedMatchId === remoteSession.selectedMatchId) {
        return local;
      }
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
  _lastTimerRunningState: undefined as boolean | undefined,

  saveActiveBotoneraSession(session: ActiveBotoneraSession, forceImmediate = false): void {
    setToStorage(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION, session);

    // Sync active session asynchronously to Supabase:
    // - Immediate when status changes (play / pause / period change / event tagged)
    // - Throttled heartbeat to every 30s while timer is running (since startTimestamp accurately tracks elapsed time on all clients)
    const now = Date.now();
    const hasStatusChanged = session.isTimerRunning !== this._lastTimerRunningState;
    this._lastTimerRunningState = session.isTimerRunning;

    if (forceImmediate || hasStatusChanged || now - (this._lastActiveSessionSupabaseSync || 0) > 30000) {
      this._lastActiveSessionSupabaseSync = now;
      saveAnalysisSessionToSupabase(session).catch(err => {
        console.warn("Could not sync active session to Supabase:", err);
      });
    }
  },

  clearActiveBotoneraSession(matchId?: string): void {
    const currentSession = this.getActiveBotoneraSession();
    const targetMatchId = matchId || currentSession?.selectedMatchId;

    // Deleting another match's analysis must not drop the live session open here.
    if (typeof window !== 'undefined' && (!matchId || currentSession?.selectedMatchId === matchId)) {
      localStorage.removeItem(STORAGE_KEYS.BOTONERA_ACTIVE_SESSION);
    }

    if (targetMatchId) {
      deleteAnalysisSessionFromSupabase(targetMatchId).catch(err => {
        console.warn("Could not delete active session from Supabase:", err);
      });
    }
  },

  // Helper to parse and deduplicate analyst names neatly
  sanitizeAnalystNames(rawNames: (string | null | undefined)[]): string {
    const allNames: string[] = [];
    rawNames.forEach((raw) => {
      if (raw) {
        raw.split(',').forEach((name) => {
          // Drop the "+N analistas" summary a previous call appended, or it is read back as a new
          // name and the list grows on every save ("X +2 analistas +3 analistas ...").
          const trimmed = name.replace(/(\s*\+\d+\s+analistas)+\s*$/i, '').trim();
          if (trimmed && trimmed.length > 0) {
            allNames.push(trimmed);
          }
        });
      }
    });

    const unique = Array.from(new Set(allNames));
    if (unique.length === 0) return 'Analista Principal (SAO)';
    if (unique.length > 3) {
      return `${unique.slice(0, 2).join(', ')} +${unique.length - 2} analistas`;
    }
    return unique.join(', ');
  },

  // Consolidate multiple fragmented analyses into ONE single master analysis per match
  consolidateAnalyses(analyses: MatchAnalysis[]): MatchAnalysis[] {
    if (!analyses || analyses.length === 0) return [];
    const matches = this.getMatches();
    const matchMap = new Map(matches.map((m) => [m.id, m]));

    const groupMap = new Map<string, MatchAnalysis[]>();
    analyses.forEach((an) => {
      if (an && an.match_id) {
        const group = groupMap.get(an.match_id) || [];
        group.push(an);
        groupMap.set(an.match_id, group);
      }
    });

    const consolidated: MatchAnalysis[] = [];

    groupMap.forEach((group, mId) => {
      const matchObj = matchMap.get(mId);
      const deletedIds = this.getDeletedEventIds();
      const allEventsRaw = group.flatMap((a) => a.events || []).filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
      const cleanEvents = this.deduplicateEventsByTime(allEventsRaw);

      if (group.length === 1) {
        const single = group[0];
        const resolvedVideoUrl = (single.video_url && single.video_url.trim()) || (matchObj?.video_url && matchObj.video_url.trim()) || null;
        const resolvedVideoType = single.video_type || matchObj?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
        const resolvedVideoSourceName = single.video_source_name || matchObj?.video_source_name || null;
        const resolvedP1 = single.p1_video_start_time != null ? single.p1_video_start_time : (matchObj?.p1_video_start_time ?? null);
        const resolvedP2 = single.p2_video_start_time != null ? single.p2_video_start_time : (matchObj?.p2_video_start_time ?? null);
        const resolvedAdjustments = single.period_adjustments ?? matchObj?.period_adjustments ?? null;
        const resolvedTemplateId = single.botonera_template_id || matchObj?.botonera_template_id || null;
        const resolvedHomeLineup = single.home_lineup || matchObj?.home_lineup || null;
        const resolvedAwayLineup = single.away_lineup || matchObj?.away_lineup || null;

        consolidated.push({
          ...single,
          analyst_name: this.sanitizeAnalystNames([single.analyst_name]),
          events: cleanEvents,
          video_url: resolvedVideoUrl,
          video_type: resolvedVideoType,
          video_source_name: resolvedVideoSourceName,
          p1_video_start_time: resolvedP1,
          p2_video_start_time: resolvedP2,
          period_adjustments: resolvedAdjustments,
          botonera_template_id: resolvedTemplateId,
          home_lineup: resolvedHomeLineup,
          away_lineup: resolvedAwayLineup,
        });
      } else {
        // Multiple analyses for the same match -> Merge into 1 Master Analysis
        const analystNames = this.sanitizeAnalystNames(group.map((a) => a.analyst_name));

        const withVideo = group.find((a) => a.video_url && a.video_url.trim()) || (matchObj?.video_url ? {
          video_url: matchObj.video_url,
          video_type: matchObj.video_type,
          video_source_name: matchObj.video_source_name,
        } : null) || group[0];
        const withHomeLineup = group.find((a) => isValidLineup(a.home_lineup)) || (isValidLineup(matchObj?.home_lineup) ? { home_lineup: matchObj.home_lineup } : null);
        const withAwayLineup = group.find((a) => isValidLineup(a.away_lineup)) || (isValidLineup(matchObj?.away_lineup) ? { away_lineup: matchObj.away_lineup } : null);

        const title = ('title' in withVideo && withVideo.title) || (matchObj ? `Análisis ${matchObj.home_team} vs ${matchObj.away_team}` : group[0].title);

        const resolvedVideoUrl = (withVideo.video_url && withVideo.video_url.trim()) || (matchObj?.video_url && matchObj.video_url.trim()) || null;
        const resolvedVideoType = withVideo.video_type || matchObj?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
        const resolvedVideoSourceName = withVideo.video_source_name || matchObj?.video_source_name || null;
        const resolvedP1 = group.find((a) => a.p1_video_start_time != null)?.p1_video_start_time ?? matchObj?.p1_video_start_time ?? null;
        const resolvedP2 = group.find((a) => a.p2_video_start_time != null)?.p2_video_start_time ?? matchObj?.p2_video_start_time ?? null;
        const resolvedAdjustments = group.find((a) => a.period_adjustments && Object.keys(a.period_adjustments).length > 0)?.period_adjustments ?? matchObj?.period_adjustments ?? null;
        const resolvedTemplateId = group.find((a) => a.botonera_template_id)?.botonera_template_id ?? matchObj?.botonera_template_id ?? null;

        const masterAnalysis: MatchAnalysis = {
          id: `analysis_${mId}`,
          match_id: mId,
          title: title,
          analyst_name: analystNames,
          status: group.some((a) => a.status === 'completed') ? 'completed' : 'in_progress',
          video_type: resolvedVideoType,
          video_url: resolvedVideoUrl,
          video_source_name: resolvedVideoSourceName,
          p1_video_start_time: resolvedP1,
          p2_video_start_time: resolvedP2,
          period_adjustments: resolvedAdjustments,
          botonera_template_id: resolvedTemplateId,
          home_lineup: withHomeLineup?.home_lineup || group[0].home_lineup || null,
          away_lineup: withAwayLineup?.away_lineup || group[0].away_lineup || null,
          events: cleanEvents,
          created_at: group.map((a) => a.created_at).sort()[0] || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        consolidated.push(masterAnalysis);
      }

      // Guarantee matchObj in matches table reflects analysis video & offsets
      if (matchObj) {
        const an = consolidated[consolidated.length - 1];
        if (an) {
          if (an.video_url && an.video_url.trim()) {
            matchObj.video_url = an.video_url;
            matchObj.video_type = an.video_type || matchObj.video_type || 'link';
            matchObj.video_source_name = an.video_source_name || matchObj.video_source_name;
          }
          if (an.p1_video_start_time != null) {
            matchObj.p1_video_start_time = an.p1_video_start_time;
          }
          if (an.p2_video_start_time != null) {
            matchObj.p2_video_start_time = an.p2_video_start_time;
          }
          if (an.period_adjustments && Object.keys(an.period_adjustments).length > 0) {
            matchObj.period_adjustments = an.period_adjustments;
          }
          if (an.botonera_template_id) {
            matchObj.botonera_template_id = an.botonera_template_id;
          }
        }
      }
    });

    // Persistir partidos actualizados para que match.video_url coincida siempre con el análisis de la botonera
    setToStorage(STORAGE_KEYS.MATCHES, matches);

    return consolidated;
  },

  mergeMatchAnalyses(sourceMatchId: string, targetMatchId: string): MatchAnalysis | null {
    const list = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
    const eventsList = getFromStorage<NormalizedEvent[]>(STORAGE_KEYS.EVENTS, []);

    const targetMatch = this.getMatchById(targetMatchId);
    if (!targetMatch) return null;

    const sourceAnalyses = list.filter((a) => a.match_id === sourceMatchId || a.id.includes(sourceMatchId));
    const targetAnalyses = list.filter((a) => a.match_id === targetMatchId || a.id.includes(targetMatchId));

    if (sourceAnalyses.length === 0 && targetAnalyses.length === 0) return null;

    const sourceEvents = [
      ...sourceAnalyses.flatMap((a) => a.events || []),
      ...eventsList.filter((e) => e.match_id === sourceMatchId),
    ];
    const targetEvents = [
      ...targetAnalyses.flatMap((a) => a.events || []),
      ...eventsList.filter((e) => e.match_id === targetMatchId),
    ];

    const remappedSourceEvents = sourceEvents.map((e) => ({
      ...e,
      match_id: targetMatchId,
    }));

    const allCombined = [...remappedSourceEvents, ...targetEvents];
    const deduplicatedEvents = this.deduplicateEventsByTime(allCombined);

    const allAnalyses = [...targetAnalyses, ...sourceAnalyses];
    const analystNames = this.sanitizeAnalystNames(allAnalyses.map((a) => a.analyst_name));

    const withVideo = targetAnalyses.find((a) => a.video_url) || sourceAnalyses.find((a) => a.video_url) || allAnalyses[0];
    const withHomeLineup = allAnalyses.find((a) => isValidLineup(a.home_lineup)) || (isValidLineup(targetMatch.home_lineup) ? { home_lineup: targetMatch.home_lineup } : null);
    const withAwayLineup = allAnalyses.find((a) => isValidLineup(a.away_lineup)) || (isValidLineup(targetMatch.away_lineup) ? { away_lineup: targetMatch.away_lineup } : null);

    const masterAnalysis: MatchAnalysis = {
      id: `analysis_${targetMatchId}`,
      match_id: targetMatchId,
      title: `Análisis ${targetMatch.home_team} vs ${targetMatch.away_team}`,
      analyst_name: analystNames,
      status: allAnalyses.some((a) => a.status === 'completed') ? 'completed' : 'in_progress',
      video_type: withVideo?.video_type || targetMatch.video_type || undefined,
      video_url: withVideo?.video_url || targetMatch.video_url || undefined,
      video_source_name: withVideo?.video_source_name || targetMatch.video_source_name || undefined,
      p1_video_start_time: allAnalyses.find((a) => a.p1_video_start_time != null)?.p1_video_start_time ?? targetMatch.p1_video_start_time ?? null,
      p2_video_start_time: allAnalyses.find((a) => a.p2_video_start_time != null)?.p2_video_start_time ?? targetMatch.p2_video_start_time ?? null,
      home_lineup: withHomeLineup?.home_lineup || targetMatch.home_lineup || null,
      away_lineup: withAwayLineup?.away_lineup || targetMatch.away_lineup || null,
      events: deduplicatedEvents,
      created_at: allAnalyses.map((a) => a.created_at).sort()[0] || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const remainingAnalyses = list.filter(
      (a) => a.match_id !== sourceMatchId && a.match_id !== targetMatchId && !sourceAnalyses.some((sa) => sa.id === a.id)
    );
    const finalAnalyses = [masterAnalysis, ...remainingAnalyses];
    setToStorage(STORAGE_KEYS.MATCH_ANALYSES, finalAnalyses);

    this.saveNormalizedEvents(deduplicatedEvents, true, targetMatchId);
    this.deleteMatchEvents(sourceMatchId);

    saveAnalysisToSupabase(masterAnalysis).catch(() => {});
    sourceAnalyses.forEach((sa) => {
      deleteAnalysisFromSupabase(sa.id, { matchId: sourceMatchId }).catch(() => {});
    });

    return masterAnalysis;
  },

  // Match Analyses Management
  getAnalyses(matchId?: string): MatchAnalysis[] {
    let list = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);

    const consolidatedList = this.consolidateAnalyses(list);

    if (list.length !== consolidatedList.length) {
      setToStorage(STORAGE_KEYS.MATCH_ANALYSES, consolidatedList);
    }

    if (!matchId) return consolidatedList;
    return consolidatedList.filter((a) => a.match_id === matchId);
  },

  getAnalysisById(id: string): MatchAnalysis | undefined {
    const list = this.getAnalyses();
    return list.find((a) => a.id === id || a.match_id === id);
  },

  async syncAnalysesFromSupabase(matchId?: string): Promise<MatchAnalysis[]> {
    const result = await fetchAnalysesAndTombstonesFromSupabase(matchId);

    if (result) {
      const { analyses: remote, deletedMatchIds } = result;

      // 1. Remove all local analyses that are not in remote when remote is fetched
      const allLocal = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
      const remoteMatchIds = new Set(remote.map((r) => r.match_id));

      const keptLocal = allLocal.filter((l) => {
        if (!l || !l.match_id) return false;
        if (remoteMatchIds.has(l.match_id)) return true;
        if (matchId && l.match_id !== matchId) return true;
        return false;
      });

      const mergedRaw = [...remote, ...keptLocal.filter((l) => !remoteMatchIds.has(l.match_id))];
      const consolidated = this.consolidateAnalyses(mergedRaw);

      setToStorage(STORAGE_KEYS.MATCH_ANALYSES, consolidated);

      // Save normalized events for active analyses
      consolidated.forEach((an) => {
        if (an.events && an.events.length > 0) {
          this.saveNormalizedEvents(an.events, false, an.match_id);
        }
      });

      // Update event counts on matches in local store
      const matches = this.getMatches();
      let matchesUpdated = false;
      matches.forEach((m) => {
        const matchingAn = consolidated.find((c) => c.match_id === m.id);
        if (matchingAn) {
          const count = matchingAn.events?.length || 0;
          if (m.event_count !== count) {
            m.event_count = count;
            matchesUpdated = true;
          }
        } else {
          if (m.event_count !== 0) {
            m.event_count = 0;
            matchesUpdated = true;
          }
        }
      });
      if (matchesUpdated) {
        setToStorage(STORAGE_KEYS.MATCHES, matches);
      }

      if (remote && remote.length > 1 && matchId) {
        const matchRemote = remote.filter((r) => r.match_id === matchId);
        if (matchRemote.length > 1) {
          const master = consolidated.find((c) => c.match_id === matchId);
          if (master) {
            saveAnalysisToSupabase(master, { skipEventsTableSync: true }).catch(() => {});
            matchRemote.forEach((oldRemote) => {
              if (oldRemote.id !== master.id) {
                deleteAnalysisFromSupabase(oldRemote.id, { rowOnly: true }).catch(() => {});
              }
            });
          }
        }
      }

      if (!matchId) return consolidated;
      return consolidated.filter((a) => a.match_id === matchId);
    } else {
      const allLocal = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
      const consolidated = this.consolidateAnalyses(allLocal.filter((l) => l && l.match_id));
      if (!matchId) return consolidated;
      return consolidated.filter((a) => a.match_id === matchId);
    }
  },

  saveAnalysis(analysis: MatchAnalysis, options?: { allowResurrect?: boolean }): void {
    if (!analysis || !analysis.match_id) return;
    const targetId = analysis.id && analysis.id.startsWith('analysis_') ? analysis.id : `analysis_${analysis.match_id}`;
    const normalizedAnalysis = { ...analysis, id: targetId };

    const all = getFromStorage<MatchAnalysis[]>(STORAGE_KEYS.MATCH_ANALYSES, SEED_MATCH_ANALYSES);
    const idx = all.findIndex(a => a.id === targetId || a.match_id === normalizedAnalysis.match_id);
    const existing = idx >= 0 ? all[idx] : undefined;
    const matchObj = this.getMatchById(normalizedAnalysis.match_id);

    const resolvedVideoUrl = (normalizedAnalysis.video_url && normalizedAnalysis.video_url.trim()) || existing?.video_url || matchObj?.video_url || null;
    const resolvedVideoType = normalizedAnalysis.video_type || existing?.video_type || matchObj?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
    const resolvedVideoSourceName = normalizedAnalysis.video_source_name || existing?.video_source_name || matchObj?.video_source_name || null;
    const resolvedP1 = normalizedAnalysis.p1_video_start_time != null ? normalizedAnalysis.p1_video_start_time : (existing?.p1_video_start_time ?? matchObj?.p1_video_start_time ?? null);
    const resolvedP2 = normalizedAnalysis.p2_video_start_time != null ? normalizedAnalysis.p2_video_start_time : (existing?.p2_video_start_time ?? matchObj?.p2_video_start_time ?? null);
    const resolvedAdjustments = normalizedAnalysis.period_adjustments !== undefined
      ? normalizedAnalysis.period_adjustments
      : (existing?.period_adjustments ?? matchObj?.period_adjustments ?? null);
    const resolvedTemplateId = normalizedAnalysis.botonera_template_id || existing?.botonera_template_id || matchObj?.botonera_template_id || null;
    const resolvedHomeLineup = normalizedAnalysis.home_lineup || existing?.home_lineup || matchObj?.home_lineup || null;
    const resolvedAwayLineup = normalizedAnalysis.away_lineup || existing?.away_lineup || matchObj?.away_lineup || null;

    let updated: MatchAnalysis;

    const deletedIds = this.getDeletedEventIds();

    if (idx >= 0 && existing) {
      const combinedAnalystNames = this.sanitizeAnalystNames([existing.analyst_name, normalizedAnalysis.analyst_name]);
      // If incoming events is provided (including empty array when user cleared events), use them.
      let targetEvents: NormalizedEvent[];
      if (normalizedAnalysis.events !== undefined) {
        targetEvents = normalizedAnalysis.events.filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
      } else {
        targetEvents = (existing.events || []).filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
      }

      updated = {
        ...existing,
        ...normalizedAnalysis,
        id: targetId,
        analyst_name: combinedAnalystNames,
        events: targetEvents,
        video_type: resolvedVideoType,
        video_url: resolvedVideoUrl,
        video_source_name: resolvedVideoSourceName,
        p1_video_start_time: resolvedP1,
        p2_video_start_time: resolvedP2,
        period_adjustments: resolvedAdjustments,
        botonera_template_id: resolvedTemplateId,
        home_lineup: resolvedHomeLineup,
        away_lineup: resolvedAwayLineup,
        created_at: existing.created_at || normalizedAnalysis.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all[idx] = updated;
    } else {
      const cleanEvents = (normalizedAnalysis.events || []).filter((e) => e && e.event_id && !deletedIds.has(e.event_id));
      updated = {
        ...normalizedAnalysis,
        id: targetId,
        analyst_name: this.sanitizeAnalystNames([normalizedAnalysis.analyst_name]),
        events: cleanEvents,
        video_type: resolvedVideoType,
        video_url: resolvedVideoUrl,
        video_source_name: resolvedVideoSourceName,
        p1_video_start_time: resolvedP1,
        p2_video_start_time: resolvedP2,
        period_adjustments: resolvedAdjustments,
        botonera_template_id: resolvedTemplateId,
        home_lineup: resolvedHomeLineup,
        away_lineup: resolvedAwayLineup,
        created_at: normalizedAnalysis.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all.unshift(updated);
    }

    // Keep 1 single analysis entry per match_id in storage
    const matchMap = new Map<string, MatchAnalysis>();
    all.forEach((item) => {
      if (item && item.match_id) {
        if (!matchMap.has(item.match_id) || item.id === targetId) {
          matchMap.set(item.match_id, item);
        }
      }
    });

    const deduplicated = Array.from(matchMap.values());
    setToStorage(STORAGE_KEYS.MATCH_ANALYSES, deduplicated);

    // Sync analysis asynchronously to Supabase without reviving deleted events from analysis_events table
    saveAnalysisToSupabase(updated, { skipEventsTableSync: true }).catch(err => {
      console.warn("Could not sync analysis to Supabase:", err);
    });

    // Also synchronize video, period offsets, and lineups to associated match permanently
    if (updated.match_id) {
      const matches = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
      const mIdx = matches.findIndex((m) => m.id === updated.match_id);
      if (mIdx >= 0) {
        const updatedM: Match = {
          ...matches[mIdx],
          video_url: resolvedVideoUrl || matches[mIdx].video_url,
          video_type: resolvedVideoType || matches[mIdx].video_type,
          video_source_name: resolvedVideoSourceName || matches[mIdx].video_source_name,
          p1_video_start_time: resolvedP1 != null ? resolvedP1 : matches[mIdx].p1_video_start_time,
          p2_video_start_time: resolvedP2 != null ? resolvedP2 : matches[mIdx].p2_video_start_time,
          period_adjustments: resolvedAdjustments !== undefined ? resolvedAdjustments : matches[mIdx].period_adjustments,
          botonera_template_id: resolvedTemplateId || matches[mIdx].botonera_template_id,
          home_lineup: resolvedHomeLineup || matches[mIdx].home_lineup,
          away_lineup: resolvedAwayLineup || matches[mIdx].away_lineup,
        };
        matches[mIdx] = updatedM;
        setToStorage(STORAGE_KEYS.MATCHES, matches);
        saveMatchesToSupabase([updatedM]).catch(() => {});
      }
    }
  },

  async saveAnalysisAsync(analysis: MatchAnalysis): Promise<boolean> {
    this.saveAnalysis(analysis);
    const targetId = analysis.id && analysis.id.startsWith('analysis_') ? analysis.id : `analysis_${analysis.match_id}`;
    const all = this.getAnalyses();
    const updated = all.find(a => a.id === targetId || a.match_id === analysis.match_id) || analysis;
    return await saveAnalysisToSupabase(updated);
  },

  async deleteAnalysis(id: string, options?: { matchId?: string }): Promise<boolean> {
    const all = this.getAnalyses();
    const target = all.find(a => a.id === id || a.match_id === id);
    const matchId = options?.matchId || target?.match_id || (id.startsWith('analysis_') ? id.replace('analysis_', '') : id);

    if (matchId) {
      this.unmarkMatchAnalysisDeleted(matchId);
      this.deleteMatchEvents(matchId);
      this.clearActiveBotoneraSession(matchId);
    }

    const filtered = all.filter(a => a.id !== id && (matchId ? a.match_id !== matchId : true));
    setToStorage(STORAGE_KEYS.MATCH_ANALYSES, filtered);

    if (matchId) {
      const matches = this.getMatches();
      let matchChanged = false;
      matches.forEach((m) => {
        if (m.id === matchId) {
          m.event_count = 0;
          m.video_url = undefined;
          m.video_type = undefined;
          m.video_source_name = undefined;
          m.p1_video_start_time = null;
          m.p2_video_start_time = null;
          m.period_adjustments = null;
          m.botonera_template_id = undefined;
          matchChanged = true;
        }
      });
      if (matchChanged) {
        setToStorage(STORAGE_KEYS.MATCHES, matches);
      }
    }

    let ok = true;
    try {
      ok = await deleteAnalysisFromSupabase(id, { matchId });
    } catch (err) {
      console.warn("Could not delete analysis from Supabase:", err);
      ok = false;
    }
    return ok;
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


