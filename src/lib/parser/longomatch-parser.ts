import { ParsedXMLAnalysis, RawLongoMatchEvent } from '@/types';

export async function calculateFileHash(fileText: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(fileText);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < fileText.length; i++) {
    const char = fileText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16) + '_' + fileText.length;
}

export async function parseLongoMatchXML(
  fileText: string,
  fileName: string,
  existingHashes: string[] = []
): Promise<ParsedXMLAnalysis> {
  const fileHash = await calculateFileHash(fileText);
  const isDuplicate = existingHashes.includes(fileHash);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fileText || fileText.trim().length === 0) {
    errors.push('El archivo XML está vacío.');
    return buildEmptyAnalysis(fileName, fileHash, errors, warnings, isDuplicate);
  }

  let xmlDoc: Document;
  try {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(fileText, 'text/xml');
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      errors.push('Error de sintaxis XML: Sintaxis o etiquetas corruptas.');
      return buildEmptyAnalysis(fileName, fileHash, errors, warnings, isDuplicate);
    }
  } catch (err: any) {
    errors.push(`No se pudo interpretar el archivo XML: ${err.message || 'Formato no válido'}`);
    return buildEmptyAnalysis(fileName, fileHash, errors, warnings, isDuplicate);
  }

  // Root project node
  const projectNode = xmlDoc.getElementsByTagName('project')[0] || 
                      xmlDoc.getElementsByTagName('Project')[0] ||
                      xmlDoc.documentElement;

  let homeTeam = projectNode?.getAttribute('local_team') || 
                 projectNode?.getAttribute('home_team') || 
                 projectNode?.getAttribute('local') || '';

  let awayTeam = projectNode?.getAttribute('visitor_team') || 
                 projectNode?.getAttribute('away_team') || 
                 projectNode?.getAttribute('visitante') || '';

  let matchDate = projectNode?.getAttribute('date') || 
                  projectNode?.getAttribute('fecha') || '';

  const competition = projectNode?.getAttribute('competition') || 'Jordan Pro League 2026';
  const season = projectNode?.getAttribute('season') || '2026/2027';

  // Fallback to team nodes
  const teamNodes = Array.from(xmlDoc.getElementsByTagName('team')).concat(
    Array.from(xmlDoc.getElementsByTagName('Team'))
  );
  if (!homeTeam && teamNodes.length >= 1) {
    homeTeam = teamNodes[0].getAttribute('name') || teamNodes[0].textContent || 'Shabab Al Ordon';
  }
  if (!awayTeam && teamNodes.length >= 2) {
    awayTeam = teamNodes[1].getAttribute('name') || teamNodes[1].textContent || 'Equipo Rival';
  }

  if (!homeTeam) homeTeam = 'Shabab Al Ordon';
  if (!awayTeam) awayTeam = 'Equipo Rival';
  if (!matchDate) {
    matchDate = new Date().toISOString().split('T')[0];
    warnings.push('La fecha del partido no se encontró en el XML; se asignó la fecha actual.');
  }

  // Parse Categories
  const categoryNodes = Array.from(xmlDoc.getElementsByTagName('category')).concat(
    Array.from(xmlDoc.getElementsByTagName('Category'))
  );
  const categoriesSet = new Set<string>();
  categoryNodes.forEach(node => {
    const name = node.getAttribute('name') || node.getAttribute('id');
    if (name) categoriesSet.add(name);
  });

  // Parse Players
  const playerNodes = Array.from(xmlDoc.getElementsByTagName('player')).concat(
    Array.from(xmlDoc.getElementsByTagName('Player'))
  );
  const detectedPlayersSet = new Set<string>();
  playerNodes.forEach(p => {
    const pName = p.getAttribute('name') || p.getAttribute('player_name') || p.textContent;
    if (pName && pName.trim().length > 0) {
      detectedPlayersSet.add(pName.trim());
    }
  });

  // Parse Events
  let eventNodes = Array.from(xmlDoc.getElementsByTagName('event'));
  if (eventNodes.length === 0) eventNodes = Array.from(xmlDoc.getElementsByTagName('Event'));
  if (eventNodes.length === 0) eventNodes = Array.from(xmlDoc.getElementsByTagName('element'));
  if (eventNodes.length === 0) eventNodes = Array.from(xmlDoc.getElementsByTagName('node'));

  const rawEvents: RawLongoMatchEvent[] = [];
  let unassignedPlayerCount = 0;
  let maxStopTime = 0;

  eventNodes.forEach((node, idx) => {
    const sourceId = node.getAttribute('id') || node.getAttribute('uuid') || `evt_${idx + 1}`;
    const name = node.getAttribute('name') || node.getAttribute('title') || 'Evento';
    const category = node.getAttribute('category') || node.getAttribute('cat') || name || 'General';
    const subcategory = node.getAttribute('subcategory') || node.getAttribute('subcat') || undefined;
    const team = node.getAttribute('team') || node.getAttribute('team_name') || undefined;
    const player = node.getAttribute('player') || node.getAttribute('player_name') || undefined;

    const startAttr = node.getAttribute('start') || node.getAttribute('start_time') || node.getAttribute('timestamp');
    const stopAttr = node.getAttribute('stop') || node.getAttribute('stop_time');
    const periodAttr = node.getAttribute('period') || node.getAttribute('half');

    const xAttr = node.getAttribute('x') || node.getAttribute('pos_x');
    const yAttr = node.getAttribute('y') || node.getAttribute('pos_y');
    const endXAttr = node.getAttribute('end_x') || node.getAttribute('pos_end_x');
    const endYAttr = node.getAttribute('end_y') || node.getAttribute('pos_end_y');
    const outcome = node.getAttribute('outcome') || node.getAttribute('result') || undefined;

    const start = startAttr !== null ? parseFloat(startAttr) : undefined;
    const stop = stopAttr !== null ? parseFloat(stopAttr) : undefined;
    const period =
      periodAttr !== null
        ? parseInt(periodAttr, 10)
        : start !== undefined && start >= 2700
        ? 2
        : 1;
    const x = xAttr !== null ? parseFloat(xAttr) : undefined;
    const y = yAttr !== null ? parseFloat(yAttr) : undefined;
    const end_x = endXAttr !== null ? parseFloat(endXAttr) : undefined;
    const end_y = endYAttr !== null ? parseFloat(endYAttr) : undefined;

    if (!player || player.trim().length === 0) {
      unassignedPlayerCount++;
    } else {
      detectedPlayersSet.add(player.trim());
    }

    if (stop !== undefined && stop > maxStopTime) {
      maxStopTime = stop;
    } else if (start !== undefined && start > maxStopTime) {
      maxStopTime = start;
    }

    if (category) categoriesSet.add(category);

    const attributes: Record<string, any> = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      attributes[attr.name] = attr.value;
    }

    rawEvents.push({
      sourceId,
      name,
      category,
      subcategory,
      team,
      player,
      start,
      stop,
      period,
      x,
      y,
      end_x,
      end_y,
      outcome,
      attributes
    });
  });

  // Calculate Duration string
  const totalMinutes = Math.floor(maxStopTime / 60) || 90;
  const totalSeconds = Math.floor(maxStopTime % 60);
  const durationFormatted = `${totalMinutes}' ${totalSeconds.toString().padStart(2, '0')}"`;

  if (rawEvents.length === 0) {
    warnings.push('No se detectaron eventos (<event>) en el XML.');
  }

  if (unassignedPlayerCount > 0) {
    warnings.push(`Se han encontrado ${unassignedPlayerCount} eventos sin jugador asociado.`);
  }

  if (isDuplicate) {
    warnings.push('Este archivo/partido ya está importado en el sistema.');
  }

  return {
    fileName,
    fileHash,
    homeTeam,
    awayTeam,
    matchDate,
    durationFormatted,
    competition,
    season,
    rawEventsCount: rawEvents.length,
    categoriesCount: categoriesSet.size,
    categories: Array.from(categoriesSet),
    detectedPlayers: Array.from(detectedPlayersSet),
    unmappedPlayers: [],
    unassignedPlayerEventsCount: unassignedPlayerCount,
    warnings,
    errors,
    isDuplicate,
    events: rawEvents
  };
}

function buildEmptyAnalysis(
  fileName: string,
  fileHash: string,
  errors: string[],
  warnings: string[],
  isDuplicate: boolean
): ParsedXMLAnalysis {
  return {
    fileName,
    fileHash,
    homeTeam: 'Desconocido',
    awayTeam: 'Desconocido',
    matchDate: new Date().toISOString().split('T')[0],
    durationFormatted: '0\' 00"',
    competition: 'Jordan Pro League',
    season: '2026/2027',
    rawEventsCount: 0,
    categoriesCount: 0,
    categories: [],
    detectedPlayers: [],
    unmappedPlayers: [],
    unassignedPlayerEventsCount: 0,
    warnings,
    errors,
    isDuplicate,
    events: []
  };
}
