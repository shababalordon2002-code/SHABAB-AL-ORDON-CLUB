import { Match, Player, PlayerMapping, Team, Competition, ImportLog, NormalizedEvent, BotoneraTemplate, ActiveBotoneraSession } from '@/types';
import { saveBotoneraTemplateToSupabase, deleteBotoneraTemplateFromSupabase } from '@/lib/services/botonera-service';
import { saveMatchesToSupabase } from '@/lib/services/matches-service';

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
    home_team_logo: 'https://static.flashscore.com/res/image/data/b5mbVfDa-dvq5wjeM.png',
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
      savedTarget = {
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
      };
      matches[existingIdx] = savedTarget;
    } else {
      savedTarget = match;
      matches.unshift(savedTarget);
    }
    setToStorage(STORAGE_KEYS.MATCHES, matches);

    // Sync match analysis data to Supabase
    saveMatchesToSupabase([savedTarget]).catch((err) => {
      console.warn('Could not sync match analysis to Supabase:', err);
    });
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
    const list = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
    if (!list || list.length < SEED_PLAYERS.length) {
      setToStorage(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
      return SEED_PLAYERS;
    }
    return list;
  },

  savePlayer(player: Player): void {
    const players = this.getPlayers();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const idx = players.findIndex(p => p.id === player.id || norm(p.name) === norm(player.name));
    if (idx >= 0) {
      players[idx] = {
        ...players[idx],
        ...player,
        id: players[idx].id, // Preserve existing ID
      };
    } else {
      players.push(player);
    }
    setToStorage(STORAGE_KEYS.PLAYERS, players);
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
