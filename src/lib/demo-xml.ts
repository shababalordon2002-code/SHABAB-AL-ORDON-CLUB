/**
 * Generates a realistic LongoMatch XML file content for testing and demonstration.
 * Features 347 events, categories, subcategories, player tags (including variant player names),
 * period markers, and coordinates.
 */
export function getSampleLongoMatchXML(): string {
  const currentDate = '2026-09-01';
  
  const categories = [
    'Pase Exitoso', 'Pase Fallido', 'Remate a Puerta', 'Remate Fuera', 
    'Recuperacion', 'Perdida', 'Falta Cometida', 'Falta Recibida', 
    'Duelo Aereo Ganado', 'Intercepcion', 'Despeje', 'Corner'
  ];

  const homePlayers = [
    'Ahmad Ali', 'Musa Al-Taamari', 'Baha Abdel-Rahman', 'Yazan Al-Naimat', 
    'Ahmed Ali', 'Saeed Al-Murjan', 'Anas Bani Yaseen', 'Zaid Jaber', 
    'Mohannad Khairullah', 'Mustafa Kaza'
  ];

  const awayPlayers = [
    'Yousef Rawashdeh', 'Salem Al-Ajalin', 'Khalil Bani Attiah', 'Ibrahim Sadeh', 
    'Ahmad Ersan', 'Nazer Al-Ghafari'
  ];

  let eventsXml = '';
  
  // Generate 347 realistic events
  for (let i = 1; i <= 347; i++) {
    const isHome = i % 3 !== 0; // 66% home team events
    const team = isHome ? 'Shabab Al Ordon' : 'Al-Faisaly SC';
    const playerList = isHome ? homePlayers : awayPlayers;
    
    // Simulate some events without players (e.g., 4 events) to test warning detection!
    const hasPlayer = i !== 45 && i !== 120 && i !== 210 && i !== 290;
    const player = hasPlayer ? playerList[i % playerList.length] : '';

    const cat = categories[i % categories.length];
    const subcat = i % 2 === 0 ? 'Zona Media' : 'Tercio Final';
    const startSec = (i * 15) % 5400; // up to 90 mins (5400s)
    const stopSec = startSec + Math.floor(Math.random() * 6) + 2;
    const period = startSec < 2700 ? 1 : 2;
    
    // Coordinates 0-100
    const posX = Math.floor(Math.random() * 90) + 5;
    const posY = Math.floor(Math.random() * 80) + 10;
    const outcome = cat.includes('Exitoso') || cat.includes('Ganado') || cat.includes('Recuperacion') ? 'Exito' : 'Fallido';

    eventsXml += `    <event id="lm_evt_${i}" name="${cat}" category="${cat}" subcategory="${subcat}" team="${team}" player="${player}" start="${startSec}" stop="${stopSec}" period="${period}" x="${posX}" y="${posY}" outcome="${outcome}" />\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<project name="Shabab Al Ordon vs Al-Faisaly SC" local_team="Shabab Al Ordon" visitor_team="Al-Faisaly SC" date="${currentDate}" competition="Jordan Pro League 2026" season="2026/2027">
  <teams>
    <team name="Shabab Al Ordon">
      <players>
${homePlayers.map(p => `        <player name="${p}" />`).join('\n')}
      </players>
    </team>
    <team name="Al-Faisaly SC">
      <players>
${awayPlayers.map(p => `        <player name="${p}" />`).join('\n')}
      </players>
    </team>
  </teams>
  <categories>
${categories.map(c => `    <category name="${c}" />`).join('\n')}
  </categories>
  <events>
${eventsXml}  </events>
</project>`;
}
