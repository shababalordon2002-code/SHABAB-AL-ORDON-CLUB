/**
 * Informe PDF de "Estadísticas Equipo".
 *
 * La página marca cada sección con `data-pdf-section` (+ `data-pdf-title`) y
 * cada bloque exportable con `data-pdf-block`. Aquí se captura cada bloque tal
 * y como se ve (html2canvas-pro) y se paginan en hojas A4 apaisadas: portada
 * con índice + páginas por sección, apilando bloques sin cortarlos.
 */

export interface TeamReportMeta {
  clubName: string;
  subtitle: string;
  periodLabel: string;
  filterLabel: string;
  kpis: { label: string; value: string; color?: string }[];
  form: { label: string; result: 'G' | 'E' | 'P' }[];
}

interface SectionCapture {
  title: string;
  blocks: HTMLCanvasElement[];
}

interface PlannedPage {
  sectionTitle: string;
  sectionIndex: number;
  continued: boolean;
  blocks: { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }[];
}

const PAGE_W = 1920;
const PAGE_H = 1358; // proporción A4 apaisado
const MARGIN_X = 56;
const HEADER_H = 104;
const FOOTER_H = 64;
const GAP = 28;
const AREA_W = PAGE_W - MARGIN_X * 2;
const AREA_TOP = HEADER_H + 28;
const AREA_H = PAGE_H - AREA_TOP - FOOTER_H - 16;

const BG = '#020617';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const RESULT_BG = { G: '#15803d', E: '#a16207', P: '#b91c1c' } as const;

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))));

export async function captureReportSections(
  root: HTMLElement,
  onProgress?: (msg: string) => void
): Promise<SectionCapture[]> {
  const html2canvas = (await import('html2canvas-pro')).default;
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-section]'));
  const totalBlocks = sections.reduce((a, s) => a + s.querySelectorAll('[data-pdf-block]').length, 0);
  const out: SectionCapture[] = [];
  let done = 0;

  for (const section of sections) {
    const title = section.dataset.pdfTitle || 'Sección';
    const blocks: HTMLCanvasElement[] = [];
    for (const el of Array.from(section.querySelectorAll<HTMLElement>('[data-pdf-block]'))) {
      done++;
      onProgress?.(`Capturando ${title} (${done}/${totalBlocks})…`);
      await nextFrame();
      try {
        const canvas = await html2canvas(el, {
          scale: 1.6,
          useCORS: true,
          backgroundColor: BG,
          logging: false,
          windowWidth: 1920,
          windowHeight: 4000,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: (node) => node instanceof HTMLElement && node.dataset.pdfIgnore === 'true',
        });
        if (canvas.width > 0 && canvas.height > 0) blocks.push(canvas);
      } catch (err) {
        console.warn('PDF equipo: no se pudo capturar un bloque', title, err);
      }
    }
    if (blocks.length) out.push({ title, blocks });
  }
  return out;
}

function planPages(sections: SectionCapture[]): PlannedPage[] {
  const pages: PlannedPage[] = [];
  sections.forEach((section, sectionIndex) => {
    let page: PlannedPage | null = null;
    let cursor = 0;
    section.blocks.forEach((canvas) => {
      let w = AREA_W;
      let h = (canvas.height / canvas.width) * w;
      if (h > AREA_H) {
        h = AREA_H;
        w = (canvas.width / canvas.height) * h;
      }
      if (!page || cursor + h > AREA_H) {
        page = { sectionTitle: section.title, sectionIndex, continued: !!page, blocks: [] };
        pages.push(page);
        cursor = 0;
      }
      page.blocks.push({ canvas, x: MARGIN_X + (AREA_W - w) / 2, y: AREA_TOP + cursor, w, h });
      cursor += h + GAP;
    });
  });
  return pages;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawChrome(ctx: CanvasRenderingContext2D, title: string, subtitle: string, clubName: string, pageNum: number, logo: HTMLImageElement | null) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const grad = ctx.createLinearGradient(0, 0, PAGE_W, 0);
  grad.addColorStop(0, '#450a0a');
  grad.addColorStop(0.45, '#0f172a');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PAGE_W, HEADER_H);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, HEADER_H - 4, PAGE_W, 4);

  if (logo) ctx.drawImage(logo, MARGIN_X, 22, 60, 60);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbbf24';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(title, MARGIN_X + (logo ? 80 : 0), 42);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText(subtitle, MARGIN_X + (logo ? 80 : 0), 74);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText(clubName.toUpperCase(), PAGE_W - MARGIN_X, 42);
  ctx.fillStyle = '#64748b';
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText('Informe estadístico de equipo', PAGE_W - MARGIN_X, 72);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, PAGE_H - FOOTER_H + 8);
  ctx.lineTo(PAGE_W - MARGIN_X, PAGE_H - FOOTER_H + 8);
  ctx.stroke();
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText(`Datos: Botonera Live · Generado el ${new Date().toLocaleString('es-ES')}`, MARGIN_X, PAGE_H - FOOTER_H / 2 + 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(`Página ${pageNum}`, PAGE_W - MARGIN_X, PAGE_H - FOOTER_H / 2 + 4);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  meta: TeamReportMeta,
  toc: { title: string; page: number }[],
  logo: HTMLImageElement | null
) {
  const bg = ctx.createRadialGradient(PAGE_W * 0.3, PAGE_H * 0.25, 50, PAGE_W * 0.5, PAGE_H * 0.5, PAGE_W * 0.8);
  bg.addColorStop(0, '#1e1b2e');
  bg.addColorStop(0.5, '#0b1020');
  bg.addColorStop(1, BG);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 18, PAGE_H);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(18, 0, 6, PAGE_H);

  const left = 120;
  if (logo) ctx.drawImage(logo, left, 110, 150, 150);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f59e0b';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText('INFORME ESTADÍSTICO DE EQUIPO', left + 190, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 72px ${FONT}`;
  ctx.fillText(meta.clubName, left + 190, 228);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(meta.subtitle, left + 190, 272);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(meta.periodLabel, left, 350);
  ctx.fillStyle = '#64748b';
  ctx.font = `500 20px ${FONT}`;
  ctx.fillText(meta.filterLabel, left, 384);

  // KPIs
  const kpiY = 430;
  const kpiW = 178;
  const kpiGap = 16;
  meta.kpis.slice(0, 9).forEach((k, i) => {
    const x = left + i * (kpiW + kpiGap);
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, x, kpiY, kpiW, 130, 18);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = k.color || '#ffffff';
    ctx.font = `900 50px ${FONT}`;
    ctx.fillText(k.value, x + kpiW / 2, kpiY + 72);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(k.label.toUpperCase(), x + kpiW / 2, kpiY + 108);
  });

  // Forma
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText('SECUENCIA DE RESULTADOS', left, 624);
  const chip = 44;
  const maxChips = Math.floor((PAGE_W - left * 2) / (chip + 8));
  meta.form.slice(-maxChips).forEach((f, i) => {
    const x = left + i * (chip + 8);
    ctx.fillStyle = RESULT_BG[f.result];
    roundRect(ctx, x, 644, chip, chip, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(f.result, x + chip / 2, 674);
    ctx.fillStyle = '#64748b';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(f.label, x + chip / 2, 706);
  });

  // Índice
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText('CONTENIDO', left, 790);
  const colW = (PAGE_W - left * 2 - 60) / 2;
  const perCol = Math.ceil(toc.length / 2);
  toc.forEach((entry, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = left + col * (colW + 60);
    const y = 836 + row * 40;
    ctx.fillStyle = '#f59e0b';
    ctx.font = `800 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1).padStart(2, '0'), x, y);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(entry.title, x + 44, y);
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    ctx.fillText(`pág. ${entry.page}`, x + colW, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 44, y + 12);
    ctx.lineTo(x + colW, y + 12);
    ctx.stroke();
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText(`Datos: Botonera Live · Generado el ${new Date().toLocaleString('es-ES')}`, left, PAGE_H - 50);
}

export async function downloadTeamStatsReport(
  root: HTMLElement,
  meta: TeamReportMeta,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Cargando librerías…');
  const { jsPDF } = await import('jspdf');
  const logo = await loadImage('/logo.png');

  const sections = await captureReportSections(root, onProgress);
  const planned = planPages(sections);

  const toc: { title: string; page: number }[] = [];
  planned.forEach((p, i) => {
    if (!p.continued) toc.push({ title: p.sectionTitle, page: i + 2 });
  });

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H], compress: true });
  // Un canvas nuevo por página: si una captura lo contamina, no arrastra al resto.
  const freshPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D };
  };

  onProgress?.('Componiendo portada…');
  const cover = freshPage();
  drawCover(cover.ctx, meta, toc, logo);
  pdf.addImage(cover.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PAGE_W, PAGE_H);

  for (let i = 0; i < planned.length; i++) {
    const p = planned[i];
    onProgress?.(`Componiendo página ${i + 2} de ${planned.length + 1}…`);
    const { canvas: pageCanvas, ctx } = freshPage();
    drawChrome(
      ctx,
      `${String(p.sectionIndex + 1).padStart(2, '0')} · ${p.sectionTitle}${p.continued ? ' (cont.)' : ''}`,
      meta.periodLabel,
      meta.clubName,
      i + 2,
      logo
    );
    p.blocks.forEach((b) => ctx.drawImage(b.canvas, b.x, b.y, b.w, b.h));
    try {
      const data = pageCanvas.toDataURL('image/jpeg', 0.9);
      pdf.addPage([PAGE_W, PAGE_H], 'landscape');
      pdf.addImage(data, 'JPEG', 0, 0, PAGE_W, PAGE_H);
    } catch (err) {
      // Un escudo externo sin CORS "mancha" el canvas: saltamos la página en vez de abortar.
      console.warn('PDF equipo: página omitida (canvas contaminado)', p.sectionTitle, err);
    }
  }

  onProgress?.('Descargando PDF…');
  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`Informe_Estadistico_${meta.clubName.replace(/[^a-zA-Z0-9]+/g, '_')}_${stamp}.pdf`);
}
