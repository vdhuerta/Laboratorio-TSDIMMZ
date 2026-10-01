import { LANE_COUNT, TSD3_SIDES, UNIT_SIZE, ROD_WIDTH, rodOf, visualCapacity } from '../data/lab';
import type { ActivityKey } from '../labTypes';
import type { Snapshot } from '../labTypes';
import volantin from '../assets/thumbs/volantin.jpg';
import castillo from '../assets/thumbs/castillo.jpg';
import home from '../assets/thumbs/home.png';

/** «Pantallazo» vectorial de la construcción final de cada actividad (SVG autocontenido, imágenes en miniatura incrustadas). */
const rect = (x: number, y: number, w: number, h: number, fill: string, stroke: string, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.2" ${extra}/>`;

/** Dibuja un carril; (x,y) = esquina superior izquierda de la caja. `dir`: h = de derecha a izquierda desde `align`, v = de abajo hacia arriba. */
function lane(lengths: number[], cap: number, x: number, y: number, k: number, dir: 'h' | 'v', align: 'start' | 'end' = 'start'): string {
  const u = UNIT_SIZE * k, wd = ROD_WIDTH * k, long = cap * u + 4 * k, pad = 2 * k;
  const box = dir === 'h' ? [x, y, long, wd + 6 * k] : [x, y, wd + 6 * k, long];
  let out = `<rect x="${box[0].toFixed(1)}" y="${box[1].toFixed(1)}" width="${box[2].toFixed(1)}" height="${box[3].toFixed(1)}" rx="${5 * k}" fill="#ffffff" fill-opacity="0.55" stroke="#94a3b8" stroke-width="${1.6 * k}" stroke-dasharray="${5 * k} ${4 * k}"/>`;
  const total = lengths.reduce((s, l) => s + l, 0);
  let off = 0;
  lengths.forEach((l) => {
    const r = rodOf(l); if (!r) return;
    if (dir === 'h') { const start = align === 'end' ? x + long - pad - total * u : x + pad; out += rect(start + off * u, y + pad + 1.5 * k, l * u, wd, r.color, r.border); }
    else out += rect(x + pad + 1.5 * k, y + long - pad - (off + l) * u, wd, l * u, r.color, r.border);
    off += l;
  });
  return out;
}
const L = (snap: Snapshot, a: ActivityKey, i: number) => (snap.lanes[a][i] ?? []).map((r) => r.length);
const svgWrap = (w: number, h: number, body: string, bg = '#ffffff') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
const txt = (x: number, y: number, s: string, size: number, fill = '#C98F2D') => `<text x="${x}" y="${y}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="700" text-anchor="middle" fill="${fill}">${s}</text>`;

function svgTSD1(snap: Snapshot): string {
  const k = 1.736, w = 1415, h = 823; const cap = visualCapacity('TSD1', 0, snap.config);
  const laneW = (cap * UNIT_SIZE + 4) * k, laneH = (ROD_WIDTH + 6) * k, gap = 3 * k, n = LANE_COUNT.TSD1;
  const right = w * (1 - 0.285), bottom = h * (1 - 0.09), top = bottom - (n * laneH + (n - 1) * gap);
  let b = `<image href="${volantin}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMax slice"/>`;
  for (let i = 0; i < n; i++) b += lane(L(snap, 'TSD1', i), cap, right - laneW, top + i * (laneH + gap), k, 'h', 'end');
  return svgWrap(w, h, b);
}
function svgTSD2(snap: Snapshot): string {
  const w = 640, h = 580, k = 1, n = LANE_COUNT.TSD2, gap = 20, laneW = (ROD_WIDTH + 6) * k;
  const total = n * laneW + (n - 1) * gap, x0 = (w - total) / 2, bottom = h * (1 - 0.125);
  let b = `<image href="${castillo}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMax slice"/>`;
  for (let i = 0; i < n; i++) {
    const cap = visualCapacity('TSD2', i, snap.config); const x = x0 + i * (laneW + gap);
    b += lane(L(snap, 'TSD2', i), cap, x, bottom - (cap * UNIT_SIZE + 4), k, 'v') + txt(x + laneW / 2, bottom + 16, `V${i + 1}`, 12, '#475569');
  }
  return svgWrap(w, h, b);
}
function svgTSD3(snap: Snapshot): string {
  const w = 480, h = 480, f = 400, ox = 40, oy = 40, k = 1, p = 34;
  let b = `<image href="${home}" x="${w / 2 - 88}" y="${h / 2 - 88}" width="176" height="176"/>`;
  const cap = (i: number) => visualCapacity('TSD3', i, snap.config);
  const pos: Record<number, [number, number, 'h' | 'v']> = { 3: [ox, oy + p, 'v'], 0: [ox + p, oy, 'h'], 1: [ox + f - (ROD_WIDTH + 6), oy + p, 'v'], 2: [ox + p, oy + f - (ROD_WIDTH + 6), 'h'] };
  TSD3_SIDES.forEach((s) => { const [x, y, d] = pos[s.idx]; b += lane(L(snap, 'TSD3', s.idx), cap(s.idx), x, d === 'v' ? y : y, k, d); });
  [[ox, oy], [ox + f - p, oy], [ox, oy + f - p], [ox + f - p, oy + f - p]].forEach(([x, y]) => { b += `<rect x="${x}" y="${y}" width="${p}" height="${p}" rx="4" fill="#000" stroke="#fff" stroke-width="2"/>`; });
  const lab: Record<number, [number, number]> = { 3: [ox - 24, oy + f / 2 + 4], 0: [ox + f / 2, oy - 12], 1: [ox + f + 24, oy + f / 2 + 4], 2: [ox + f / 2, oy + f + 22] };
  TSD3_SIDES.forEach((s) => { b += txt(lab[s.idx][0], lab[s.idx][1], s.label, 14); });
  return svgWrap(w, h, b);
}

/** Data-URI de la miniatura de cada actividad. */
export function snapshotImage(snap: Snapshot, a: ActivityKey): string {
  const svg = a === 'TSD1' ? svgTSD1(snap) : a === 'TSD2' ? svgTSD2(snap) : svgTSD3(snap);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
