// html2canvas `onclone` helper for the PDF export.
//
// The export lays the page out in a fixed 1920px-wide virtual window (windowWidth), but
// html2canvas draws inline <svg> elements at the size they had on the user's real screen.
// On a screen wider or narrower than 1920px the pitch drawings (campogramas) then don't fit
// their box in the capture: cropped at the sides on a big monitor, shrunk into a corner on
// a laptop. Replacing each large SVG in the cloned document with an <img> of itself, sized
// to the clone's layout and scaled with object-fit, makes the capture match the box exactly.

const MIN_SNAPSHOT_SIZE = 80; // px; icons stay as they are

export function snapshotSvgsForCapture(doc: Document): void {
  const view = doc.defaultView;
  const svgs = Array.from(doc.querySelectorAll('svg')).filter((svg) => !svg.parentElement?.closest('svg'));

  for (const svg of svgs) {
    const viewBox = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const [, , vbWidth, vbHeight] = viewBox;
    if (!(vbWidth > 0 && vbHeight > 0)) continue;

    const rect = svg.getBoundingClientRect();
    if (rect.width < MIN_SNAPSHOT_SIZE || rect.height < MIN_SNAPSHOT_SIZE) continue;

    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', String(vbWidth));
    copy.setAttribute('height', String(vbHeight));
    copy.removeAttribute('class');
    copy.removeAttribute('style');
    // `currentColor` inside the standalone image resolves against the root's color
    const color = view?.getComputedStyle(svg).color;
    if (color) copy.style.color = color;

    const img = doc.createElement('img');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    const className = svg.getAttribute('class');
    if (className) img.setAttribute('class', className);
    const inlineStyle = svg.getAttribute('style');
    if (inlineStyle) img.setAttribute('style', inlineStyle);
    img.style.width = `${rect.width}px`;
    img.style.height = `${rect.height}px`;
    const aspect = svg.getAttribute('preserveAspectRatio') || '';
    img.style.objectFit = aspect.startsWith('none') ? 'fill' : aspect.includes('slice') ? 'cover' : 'contain';

    svg.replaceWith(img);
  }
}
