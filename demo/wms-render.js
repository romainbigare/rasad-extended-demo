// Draws the map overlays (crop type, land use, individual trees) as PNG tiles for WMS GetMap requests,
// from the same placeholder farms the rest of the mock serves. Needs OffscreenCanvas (all current browsers).
import { CULTIVARS, FARMS, WFS_LAYERS, hash01, localToMerc, ringExtent } from './mock-core.js';

const LULC = {
  'Open Agriculture': '#7cb342', 'Protected Agriculture': '#26a69a', Structures: '#8d6e63', 'Barren Land': '#d7b98a', Fallow: '#bdbdbd',
};
const CROP = { Alfalfa: '#4caf50', 'Rhodes grass': '#9ccc3c', Other: '#9e9e9e' };
const SPECIES = { 'Date palm': '#2e7d32', 'Fruit Trees': '#ef6c00', 'Other Trees': '#0b3d2e' };
const CULTIVAR_COLORS = ['#1d6fe8', '#f59e0b', '#16a34a', '#9333ea', '#e11d48', '#0891b2', '#a16207', '#be185d', '#475569', '#65a30d'];
const VERSION_COLOR = { trees_v1: '#3b82f6', trees_v2: '#f59e0b', trees_v3: '#16a34a', trees_v4: '#9333ea' };

const q = (query, name) => query[name] ?? query[name.toLowerCase()] ?? query[name.toUpperCase()];

function fillRing(ctx, ring, toPx) {
  ctx.beginPath();
  ring.forEach(([x, y], i) => {
    const [px, py] = toPx(x, y);
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
}

function drawPolygons(ctx, records, colorOf, bbox, toPx) {
  for (const r of records) {
    const [x0, y0, x1, y1] = r.bbox;
    if (x1 < bbox[0] || x0 > bbox[2] || y1 < bbox[1] || y0 > bbox[3]) continue;
    ctx.fillStyle = colorOf(r.props);
    fillRing(ctx, r.geometry.coordinates[0], toPx);
  }
}

/** One dot per tree on a jittered grid inside every orchard / palm / forest field. */
function drawTrees(ctx, bbox, res, toPx, colorOf, kinds) {
  const radius = Math.max(1.4, 2.6 / res);
  for (const farm of FARMS) {
    const [fx0, fy0, fx1, fy1] = ringExtent(farm.ring);
    if (fx1 < bbox[0] || fx0 > bbox[2] || fy1 < bbox[1] || fy0 > bbox[3]) continue;
    for (const f of farm.fields) {
      if (!kinds.includes(f.kind)) continue;
      const [x0, y0, x1, y1] = f.extent;
      if (x1 < bbox[0] || x0 > bbox[2] || y1 < bbox[1] || y0 > bbox[3]) continue;
      const step = f.kind === 'palm' ? 8 : f.kind === 'fruit' ? 6 : 12;
      const [lx0, ly0, lx1, ly1] = ringExtent(f.local);
      for (let ix = 0, lx = lx0 + 4; lx < lx1 - 4; lx += step, ix++) {
        for (let iy = 0, ly = ly0 + 4; ly < ly1 - 4; ly += step, iy++) {
          const jx = (hash01(f.id, ix, iy, 'x') - 0.5) * 2.4;
          const jy = (hash01(f.id, ix, iy, 'y') - 0.5) * 2.4;
          const [mx, my] = localToMerc(farm.center, farm.rot, lx + jx, ly + jy);
          if (mx < bbox[0] || mx > bbox[2] || my < bbox[1] || my > bbox[3]) continue;
          const [px, py] = toPx(mx, my);
          ctx.fillStyle = colorOf(f, hash01(f.id, ix, iy, 'c'));
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function pickCultivar(f, r) {
  let acc = 0;
  for (const c of f.cultivars || []) {
    acc += c.share;
    if (r <= acc) return Math.max(0, CULTIVARS.findIndex(([n]) => n === c.name));
  }
  return 0;
}

/** Returns a PNG Blob for a WMS GetMap query, or null when the layer has nothing to draw. */
export async function renderWmsTile(query) {
  if (typeof OffscreenCanvas === 'undefined') return null;
  const bbox = String(q(query, 'BBOX') || '').split(',').map(Number);
  const w = Number(q(query, 'WIDTH')) || 256;
  const h = Number(q(query, 'HEIGHT')) || 256;
  if (bbox.length !== 4 || bbox.some(Number.isNaN)) return null;
  const layer = String(q(query, 'LAYERS') || '').replace(/^.*:/, '');
  const res = (bbox[2] - bbox[0]) / w; // metres per pixel (EPSG:3857)
  const toPx = (x, y) => [((x - bbox[0]) / (bbox[2] - bbox[0])) * w, ((bbox[3] - y) / (bbox[3] - bbox[1])) * h];
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.globalAlpha = 0.78;
  if (layer === 'lulc_v1') {
    drawPolygons(ctx, WFS_LAYERS.lulc_v1, (p) => LULC[p.l1] || LULC.Fallow, bbox, toPx);
  } else if (layer === 'field_crops_v4') {
    drawPolygons(ctx, WFS_LAYERS.field_crops_v4, (p) => CROP[p.crop_name] || CROP.Other, bbox, toPx);
  } else if (layer === 'trees_v7') {
    ctx.globalAlpha = 0.45;
    drawPolygons(ctx, WFS_LAYERS.fields, () => '#4b7f52', bbox, toPx);
    ctx.globalAlpha = 0.95;
    drawTrees(ctx, bbox, res, toPx, (f) => SPECIES[f.kind === 'palm' ? 'Date palm' : f.kind === 'fruit' ? 'Fruit Trees' : 'Other Trees'], ['palm', 'fruit', 'forest']);
  } else if (VERSION_COLOR[layer]) {
    ctx.globalAlpha = 0.95;
    const flat = VERSION_COLOR[layer];
    drawTrees(ctx, bbox, res, toPx, (f, r) => (layer === 'trees_v1' ? CULTIVAR_COLORS[pickCultivar(f, r) % CULTIVAR_COLORS.length] : flat), ['palm']);
  } else {
    return null; // HRI imagery etc.: the satellite basemap already shows it
  }
  return canvas.convertToBlob({ type: 'image/png' });
}
