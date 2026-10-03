/*
 * RASAD / ADAFSA local mock backend.
 *
 * One dependency-free Node (>=18) HTTP server that stands in for every backend the
 * Next.js frontend talks to (RBAC/auth, farm-service, analytics, satellite, weather,
 * reports and the GeoServer WMS/WFS proxy). All data is generated deterministically
 * from a seeded PRNG at start-up. See README.md.
 *
 *   node server.js            -> http://127.0.0.1:8000
 *   PORT=8001 node server.js
 *   MOCK_VERBOSE=1 node server.js   (log every request to stderr)
 */

import { Buffer } from 'buffer';
import { zlibSync } from 'fflate';

// Browser build of the mock backend: runs inside the service worker (demo/sw-entry.js).
const zlib = { deflateSync: (raw) => zlibSync(raw, { level: 6 }) };

/* ------------------------------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry32(20260930);
const rr = (a, b) => a + (b - a) * R();
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v, d = 0) => {
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
};
function weightedPick(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let x = R() * total;
  for (const [v, w] of pairs) {
    x -= w;
    if (x <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
}
/** Stable hash -> [0,1) for values that must not depend on request order. */
function hash01(...parts) {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const DAY = 86400000;
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const isoNow = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * DAY);

/* Web mercator (EPSG:3857) */
const MERC = 20037508.342789244;
function toMerc(lon, lat) {
  const x = (lon * MERC) / 180;
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (MERC / 180);
  return [x, y];
}
function fromMerc(x, y) {
  const lon = (x * 180) / MERC;
  const lat = (Math.atan(Math.exp((y / MERC) * Math.PI)) * 360) / Math.PI - 90;
  return [lon, lat];
}
const shoelace = (ring) => {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(a) / 2;
};
const ringExtent = (ring) => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of ring) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
};
const wkt = (ring) => `POLYGON((${ring.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(', ')}))`;
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1],
      xj = ring[j][0],
      yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function erf(x) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
  return s * y;
}
const normCdf = (x, m, sd) => 0.5 * (1 + erf((x - m) / (sd * Math.SQRT2)));

/* ------------------------------------------------------------------------------------------------
 * Reference data
 * ---------------------------------------------------------------------------------------------- */

const ZONES = [
  { id: 1, name: 'Abu Dhabi' },
  { id: 2, name: 'Al Ain' },
  { id: 3, name: 'Al Dhafra' },
];
/** Emirate-wide farm counts per region: these are the "big" scaled totals (sum = 24,082). */
const ZONE_FARM_TOTAL = { 1: 8420, 2: 9150, 3: 6512 };
/** Ratio between the typical real holding and the ~300 du mock holdings, applied to areas/trees. */
const AREA_DAMPING = 0.14;

const PLACES = {
  1: [
    { n: 'Al Khatam', c: [54.93, 24.19] },
    { n: 'Sweihan', c: [55.31, 24.47] },
    { n: 'Al Wathba', c: [54.64, 24.25] },
    { n: 'Al Falah', c: [54.6, 24.36] },
  ],
  2: [
    { n: 'Al Ain', c: [55.7, 24.2] },
    { n: 'Al Hayer', c: [55.58, 24.04] },
    { n: 'Al Khazna', c: [55.4, 24.28] },
    { n: 'Zakher', c: [55.66, 24.36] },
    { n: 'Um Ghafa', c: [55.8, 24.27] },
  ],
  3: [
    { n: 'Madinat Zayed', c: [53.7, 23.68] },
    { n: 'Liwa', c: [53.77, 23.13] },
    { n: 'Ghayathi', c: [52.8, 23.84] },
    { n: 'Al Mirfa', c: [53.45, 24.1] },
  ],
};
/** Zone of farm i (cycled so ids interleave regions: the first farm is Abu Dhabi). */
const ZONE_PATTERN = [1, 1, 3, 2, 2, 3, 1, 2, 3, 2];
const PINNED = [
  { place: 'Al Khatam', digits: 12278 },
  { place: 'Sweihan', digits: 18689 },
  { place: 'Madinat Zayed', digits: 24052 },
];

const OWNERS = [
  'Khalifa Al Mansoori', 'Saeed Al Dhaheri', 'Mohammed Al Mazrouei', 'Hamdan Al Ketbi', 'Rashid Al Shamsi',
  'Sultan Al Nuaimi', 'Abdullah Al Qubaisi', 'Hazza Al Suwaidi', 'Ahmed Al Hammadi', 'Mansour Al Falahi',
  'Zayed Al Rumaithi', 'Obaid Al Mheiri', 'Humaid Al Kaabi', 'Salem Al Marar', 'Juma Al Blooshi',
];

const CULTIVARS = [
  ['Khalas', 0.3, 'Khalas'], ['Khenaizi', 0.15, 'Khanizi'], ['Fard', 0.12, 'Fardh'], ['Lulu', 0.1, 'Other'],
  ['Barhi', 0.06, 'Other'], ['Medjool', 0.08, 'Medjool'], ['Shishi', 0.07, 'Shishi'], ['Dabbas', 0.05, 'Dabbas'],
  ['Bomaan', 0.04, 'Bomaan'], ['Sukkary', 0.03, 'Other'],
]; // [display name, weight, name used by the map layer legend]
const CULTIVAR_WFS = Object.fromEntries(CULTIVARS.map(([n, , w]) => [n, w]));

const FODDER = [['Rhodes Grass', 0.4], ['Alfalfa', 0.45], ['Sorghum', 0.15]];
const CEREAL = [['Wheat', 0.5], ['Barley', 0.5]];
const VEG = [['Tomato', 0.35], ['Cucumber', 0.3], ['Eggplant', 0.2], ['Okra', 0.15]];
const FRUIT = [['Lemon', 0.25], ['Mango', 0.2], ['Pomegranate', 0.2], ['Fig', 0.15], ['Olive', 0.2]];
const FOREST = [['Ghaf', 0.5], ['Sidr', 0.3], ['Samar', 0.2]];

const SCIENTIFIC = {
  'Date Palm': 'Phoenix dactylifera', Lemon: 'Citrus limon', Mango: 'Mangifera indica',
  Pomegranate: 'Punica granatum', Fig: 'Ficus carica', Olive: 'Olea europaea',
  Ghaf: 'Prosopis cineraria', Sidr: 'Ziziphus spina-christi', Samar: 'Vachellia tortilis',
};
const CROP_CATEGORY = {
  'Rhodes Grass': 'Forage & Fodder', Alfalfa: 'Forage & Fodder', Sorghum: 'Forage & Fodder',
  Wheat: 'Cereals', Barley: 'Cereals', Tomato: 'Vegetables', Cucumber: 'Vegetables',
  Eggplant: 'Vegetables', Okra: 'Vegetables',
};
/** t/dunum over the 60-day forecast window (annual-equivalent scaled down). */
const CROP_YIELD_PER_DU = {
  'Rhodes Grass': [1.1, 1.7], Alfalfa: [0.9, 1.5], Sorghum: [0.8, 1.2], Wheat: [0.35, 0.55], Barley: [0.3, 0.5],
  Tomato: [2.6, 4.4], Cucumber: [2.2, 3.8], Eggplant: [2.0, 3.4], Okra: [0.9, 1.5],
};
const WATER_RATE = { palm: [3.4, 5.0], fruit: [3.0, 4.4], forest: [0.8, 1.5], crop: [4.8, 7.8], greenhouse: [2.6, 4.2], fallow: [0, 0] };
const DELIVERY = ['Drip', 'Bubbler', 'Sprinkler', 'Centre Pivot', 'Flood'];
const STRUCT_TYPES = [
  // type, key, l2 label, w range, d range, probability weight
  ['Residential', 'residential', 'Residential', [14, 26], [10, 16], 0.9],
  ['Labour Housing', 'labour_housing', 'Labour Housing', [18, 34], [10, 14], 0.8],
  ['Animal Pens', 'animal_pens', 'Animal Pens', [20, 36], [12, 20], 0.35],
  ['Warehouse', 'warehouse', 'Warehouse', [16, 30], [12, 18], 0.5],
  ['Machine Storage', 'machine_storage', 'Machine Storage', [12, 22], [8, 14], 0.6],
  ['Water Storage', 'water_storage', 'Water Storage', [6, 12], [6, 12], 0.8],
  ['Irrigation & Utilities', 'irrigation_utilities', 'Irrigation & Utilities', [5, 9], [5, 8], 0.8],
  ['Commercial', 'commercial', 'Commercial', [10, 18], [8, 12], 0.12],
  ['Vehicle/Road', 'vehicle_road', 'Vehicle/Road', [24, 40], [4, 6], 0.7],
];
const PROTECTED_EXTRA = [
  ['Shade House', 'shade_house', 'Shade House', [20, 34], [10, 16], 0.28],
  ['Open Shed', 'open_shed', 'Open Shed', [16, 28], [8, 12], 0.3],
  ['Hydroponics', 'hydroponics', 'Hydroponics', [14, 24], [10, 14], 0.08],
];
const ADVISORIES = [
  'Irrigation reduction recommended: soil moisture above field capacity in the north fields.',
  'Red palm weevil trap inspection due within 7 days.',
  'Nitrogen top-dressing recommended for fodder fields before the next cutting.',
  'Canopy stress detected on 2 palm blocks: check drip emitters.',
  'Fungal risk elevated after high humidity: scout the greenhouse crops.',
  'Water use is trending above the monthly quota.',
];
const SUB_ZONE_SUFFIX = ['Block 1', 'Block 2', 'Oasis Belt', 'North Sector', 'East Sector', 'Agri Zone'];

/* ------------------------------------------------------------------------------------------------
 * Farm / field / structure generation
 * ---------------------------------------------------------------------------------------------- */

const FARMS = [];
const FIELDS = [];
const STRUCTS = [];
let nextFieldId = 1;
let nextStructId = 1;

function localToMerc(center, rot, x, y) {
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const dx = x * c - y * s,
    dy = x * s + y * c;
  const k = 1 / Math.cos((center.lat * Math.PI) / 180);
  return [center.x + dx * k, center.y + dy * k];
}
function rectLocal(x0, y0, x1, y1, jitter) {
  const j = () => (jitter ? rr(-jitter, jitter) : 0);
  const ring = [
    [x0 + j(), y0 + j()],
    [x1 + j(), y0 + j()],
    [x1 + j(), y1 + j()],
    [x0 + j(), y1 + j()],
  ];
  ring.push([ring[0][0], ring[0][1]]);
  return ring;
}

const PROFILES = {
  palm: [['palm', 0.62], ['fodder', 0.16], ['fruit', 0.1], ['fallow', 0.06], ['veg', 0.06]],
  fodder: [['fodder', 0.58], ['palm', 0.2], ['cereal', 0.12], ['fallow', 0.1]],
  veg: [['veg', 0.45], ['greenhouse', 0.25], ['fodder', 0.1], ['palm', 0.14], ['fallow', 0.06]],
  mixed: [['palm', 0.3], ['fruit', 0.18], ['veg', 0.14], ['fodder', 0.2], ['forest', 0.06], ['fallow', 0.08], ['cereal', 0.04]],
  forest: [['forest', 0.28], ['fruit', 0.3], ['palm', 0.34], ['fallow', 0.08]],
};

function makeField(farm, idx, kind, localRing) {
  const q = farm.quality;
  const base = {
    palm: [0.36, 0.62], crop: [0.42, 0.86], fruit: [0.4, 0.72], forest: [0.26, 0.46], greenhouse: [0.5, 0.82], fallow: [0.07, 0.2],
  };
  let group = kind;
  let crop = null;
  let landUse = 'open_agriculture';
  let production = 'Open Field';
  if (kind === 'palm') crop = 'Date Palm', production = 'Date Palm';
  else if (kind === 'fodder') crop = weightedPick(FODDER), group = 'crop';
  else if (kind === 'cereal') crop = weightedPick(CEREAL), group = 'crop';
  else if (kind === 'veg') crop = weightedPick(VEG), group = 'crop';
  else if (kind === 'greenhouse') crop = pick(['Tomato', 'Cucumber', 'Cucumber']), landUse = 'protected_agriculture', production = 'Greenhouse';
  else if (kind === 'fruit') crop = weightedPick(FRUIT), production = 'Orchard';
  else if (kind === 'forest') crop = weightedPick(FOREST), production = 'Forestry';
  else if (kind === 'fallow') landUse = 'fallow_land', production = 'Fallow';

  const areaM2 = shoelace(localRing);
  const du = areaM2 / 1000;
  const [lo, hi] = base[group] || base.crop;
  const ndvi = round(clamp(lo + (hi - lo) * clamp(q * 0.8 + R() * 0.35, 0, 1), 0.05, 0.92), 2);
  let treeCount = 0;
  if (kind === 'palm') treeCount = Math.round(du * rr(9, 14));
  if (kind === 'fruit') treeCount = Math.round(du * rr(7, 11));
  if (kind === 'forest') treeCount = Math.round(du * rr(3, 6));
  let cultivars = null;
  if (kind === 'palm') {
    const n = ri(2, 3);
    const chosen = [];
    while (chosen.length < n) {
      const c = weightedPick(CULTIVARS.map(([name, w]) => [name, w]));
      if (!chosen.includes(c)) chosen.push(c);
    }
    const shares = chosen.map(() => rr(0.4, 1));
    const sum = shares.reduce((a, b) => a + b, 0);
    cultivars = chosen.map((name, i) => ({ name, share: shares[i] / sum }));
  }
  const rates = WATER_RATE[group === 'crop' ? 'crop' : group] || WATER_RATE.crop;
  const waterRate = rr(rates[0], rates[1]);
  let yieldT = null; // crop yield
  let treeYieldT = null;
  if (group === 'crop' || kind === 'greenhouse') {
    const [a, b] = CROP_YIELD_PER_DU[crop] || [1, 2];
    yieldT = round(du * rr(a, b) * (kind === 'greenhouse' ? 1.15 : 1), 2);
  }
  if (kind === 'palm') treeYieldT = round(treeCount * rr(0.055, 0.09), 2);
  if (kind === 'fruit') yieldT = round(treeCount * rr(0.03, 0.06), 2);
  const chi = kind === 'palm' ? round(clamp(40 + 52 * clamp(q * 0.92 + rr(-0.17, 0.17), 0, 1), 38, 96), 1) : null;
  const field = {
    id: nextFieldId++,
    idx,
    farm_id: farm.id,
    farm_uid: farm.uid,
    uid: `FLD-${farm.digits}-${String(idx + 1).padStart(2, '0')}`,
    name: `Field ${idx + 1}`,
    kind,
    group,
    crop,
    landUse,
    production,
    local: localRing,
    area_m2: areaM2,
    du,
    ha: du / 10,
    ndvi,
    ndvi_as_of: null,
    tree_count: treeCount,
    cultivars,
    chi,
    ier: round(clamp(farm.ier + rr(-9, 9), 35, 99), 1),
    water_rate: waterRate,
    yield_t: yieldT, // crop / fruit (counted in crop_yield_tons)
    tree_yield_t: treeYieldT, // palms
    watering: pick(DELIVERY),
    growth: kind === 'fallow' ? 'Fallow' : pick(['Vegetative', 'Flowering', 'Fruiting', 'Maturity', 'Establishment']),
    tillage: pick(['No Till', 'Reduced Till', 'Conventional']),
  };
  return field;
}

function buildFarm(i) {
  const zone = ZONE_PATTERN[i % ZONE_PATTERN.length];
  const pinned = PINNED[i];
  const places = PLACES[zone];
  const place = pinned ? [].concat(...Object.values(PLACES)).find((p) => p.n === pinned.place) : places[Math.floor(i / 3) % places.length];
  const digits = pinned ? pinned.digits : ri(10100, 29900);
  const id = i + 1;
  const profile = i === 0 ? 'mixed' : weightedPick([['palm', 0.3], ['fodder', 0.2], ['veg', 0.18], ['mixed', 0.22], ['forest', 0.1]]);
  const lon = place.c[0] + rr(-0.07, 0.07),
    lat = place.c[1] + rr(-0.05, 0.05);
  const [cx, cy] = toMerc(lon, lat);
  const center = { lon, lat, x: cx, y: cy };
  const W = round(rr(260, 800)),
    H = round(rr(210, 640));
  const rot = (rr(-24, 24) * Math.PI) / 180;
  const quality = i === 0 ? 0.74 : clamp(R() * 0.9 + 0.05, 0.03, 0.99);
  const farm = {
    id,
    zone_id: zone,
    place: place.n,
    digits,
    uid: `FRM-${digits}`,
    name: `${place.n} Farm ${digits}`,
    owner_name: pick(OWNERS),
    profile,
    quality,
    center,
    rot,
    W,
    H,
    ier: round(clamp(40 + 58 * Math.pow(quality, 0.85) + rr(-8, 8), 40, 98), 1),
    fields: [],
    structs: [],
    parcels: [],
    created_at: `2024-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}T08:00:00Z`,
    updated_at: new Date(Date.now() - ri(1, 20) * DAY).toISOString(),
    advisory: null,
    advisory_status: 'none',
  };
  // outer boundary (local, with jittered corners)
  farm.localBoundary = rectLocal(-W / 2, -H / 2, W / 2, H / 2, 3.5);
  // field grid
  const yard = 48,
    margin = 6,
    gap = 7;
  const gx0 = -W / 2 + margin,
    gx1 = W / 2 - margin,
    gy0 = -H / 2 + yard + gap,
    gy1 = H / 2 - margin;
  const gw = gx1 - gx0,
    gh = gy1 - gy0;
  let n = i === 0 ? 6 : ri(3, 8);
  if (i === 1) n = 5;
  const rows = Math.max(1, Math.round(Math.sqrt((n * gh) / gw)));
  const cols = Math.ceil(n / rows);
  const rowCount = [];
  let left = n;
  for (let r = 0; r < rows; r++) {
    const k = Math.min(cols, Math.ceil(left / (rows - r)));
    rowCount.push(k);
    left -= k;
  }
  const kinds = [];
  if (i === 0) kinds.push('palm', 'palm', 'fodder', 'veg', 'fruit', 'palm');
  else if (i === 1) kinds.push('palm', 'palm', 'fodder', 'palm', 'veg');
  else {
    const plan = PROFILES[profile];
    for (let k = 0; k < n; k++) kinds.push(weightedPick(plan));
    if (['palm', 'forest', 'mixed'].includes(profile) && !kinds.includes('palm')) kinds[0] = 'palm';
    if (!kinds.some((k) => k !== 'fallow')) kinds[0] = 'fodder';
  }
  let fi = 0;
  const cellH = (gh - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    const k = rowCount[r];
    const cellW = (gw - gap * (k - 1)) / k;
    const y0 = gy0 + r * (cellH + gap);
    for (let c = 0; c < k; c++) {
      const x0 = gx0 + c * (cellW + gap);
      const ring = rectLocal(x0, y0, x0 + cellW, y0 + cellH, 2.5);
      const field = makeField(farm, fi, kinds[fi], ring);
      farm.fields.push(field);
      FIELDS.push(field);
      fi++;
    }
  }
  // structures in the yard strip (south edge)
  let sx = -W / 2 + margin + 4;
  const yardY0 = -H / 2 + 6;
  const structDefs = [];
  for (const def of STRUCT_TYPES) if (R() < def[5]) structDefs.push(def);
  const wantsProtectedExtra = profile === 'veg' || R() < 0.3;
  if (wantsProtectedExtra) for (const def of PROTECTED_EXTRA) if (R() < def[5]) structDefs.push(def);
  if (!structDefs.length) structDefs.push(STRUCT_TYPES[0]);
  for (const def of structDefs) {
    const w = rr(def[3][0], def[3][1]),
      d = rr(def[4][0], def[4][1]);
    if (sx + w > W / 2 - margin) break;
    const ring = rectLocal(sx, yardY0, sx + w, yardY0 + Math.min(d, yard - 14), 0);
    const protectedExtra = PROTECTED_EXTRA.includes(def);
    const st = {
      id: nextStructId++,
      farm_id: farm.id,
      farm_uid: farm.uid,
      type: def[0],
      key: def[1],
      l2: def[2],
      cls: protectedExtra ? 'protected_agriculture' : 'structures',
      local: ring,
      du: shoelace(ring) / 1000,
      built_year: ri(2008, 2024),
      code: `STR-${String(farm.digits).slice(-3)}-${String(farm.structs.length + 1).padStart(2, '0')}`,
      condition: pick(['Optimal', 'Compliant', 'Good', 'Needs Maintenance']),
      permit: weightedPick([['permitted', 0.78], ['pending', 0.14], ['unpermitted', 0.08]]),
    };
    farm.structs.push(st);
    STRUCTS.push(st);
    sx += w + rr(5, 10);
  }
  return farm;
}

function finishFarm(farm) {
  const { center, rot } = farm;
  const toM = (ring) => ring.map(([x, y]) => localToMerc(center, rot, x, y));
  farm.ring = toM(farm.localBoundary);
  farm.area_m2 = shoelace(farm.localBoundary);
  farm.du = farm.area_m2 / 1000;
  farm.ha = farm.du / 10;
  farm.boundary = wkt(farm.ring);
  farm.extent = ringExtent(farm.ring);
  farm.centroid = fromMerc((farm.extent[0] + farm.extent[2]) / 2, (farm.extent[1] + farm.extent[3]) / 2);
  const ndviDate = isoDate(daysAgo(ri(2, 6)));
  for (const f of farm.fields) {
    f.ring = toM(f.local);
    f.boundary = wkt(f.ring);
    f.extent = ringExtent(f.ring);
    f.centroid = fromMerc((f.extent[0] + f.extent[2]) / 2, (f.extent[1] + f.extent[3]) / 2);
    f.ndvi_as_of = ndviDate;
  }
  for (const s of farm.structs) {
    s.ring = toM(s.local);
    s.extent = ringExtent(s.ring);
  }
  // barren leftover = farm area - fields - structures (>= 0)
  const used = farm.fields.reduce((a, f) => a + f.du, 0) + farm.structs.reduce((a, s) => a + s.du, 0);
  const barrenDu = Math.max(farm.du * 0.015, (farm.du - used) * 0.3);
  const bx0 = -farm.W / 2,
    by0 = farm.H / 2 - 5;
  const barrenLocal = rectLocal(bx0, by0, farm.W / 2, farm.H / 2, 0);
  farm.barren = { du: barrenDu, ring: toM(barrenLocal), local: barrenLocal };

  // parcels (land-use records)
  const parcels = [];
  const KEYS = { palm: ['Palm Trees', 'palm_trees'], crop: ['Cultivated Fields', 'cultivated_fields'], fruit: ['Fruit Trees', 'fruit_trees'], forest: ['Forest Trees', 'forest_trees'] };
  for (const f of farm.fields) {
    let cls = f.landUse,
      sub,
      key;
    if (f.kind === 'greenhouse') (sub = 'Greenhouse'), (key = 'greenhouse');
    else if (f.kind === 'fallow') (sub = 'Fallow Land'), (key = 'fallow_land');
    else [sub, key] = KEYS[f.group === 'crop' ? 'crop' : f.kind];
    parcels.push({ cls, sub, key, du: f.du, trees: f.tree_count, ring: f.ring, extent: f.extent, l1: cls === 'protected_agriculture' ? 'Protected Agriculture' : 'Open Agriculture', field: f });
  }
  for (const s of farm.structs) {
    parcels.push({ cls: s.cls, sub: s.l2, key: s.key, du: s.du, trees: 0, ring: s.ring, extent: s.extent, l1: s.cls === 'protected_agriculture' ? 'Protected Agriculture' : 'Structures', struct: s });
  }
  parcels.push({ cls: 'barren_land', sub: 'Barren Land', key: 'barren_land', du: barrenDu, trees: 0, ring: farm.barren.ring, extent: ringExtent(farm.barren.ring), l1: 'Barren Land' });
  farm.parcels = parcels;

  /* ---- aggregate per-farm stats ---- */
  const fl = farm.fields;
  const palms = fl.filter((f) => f.kind === 'palm');
  farm.tree_count = fl.reduce((a, f) => a + f.tree_count, 0);
  farm.palm_count = palms.reduce((a, f) => a + f.tree_count, 0);
  farm.has_palms = palms.length > 0;
  farm.has_crops = fl.some((f) => f.group === 'crop' || f.kind === 'greenhouse');
  const areaSum = fl.reduce((a, f) => a + f.du, 0) || 1;
  farm.mean_ndvi = round(fl.reduce((a, f) => a + f.ndvi * f.du, 0) / areaSum, 2);
  farm.chi = farm.has_palms ? round(palms.reduce((a, f) => a + f.chi * f.tree_count, 0) / Math.max(1, farm.palm_count), 1) : null;
  farm.yield_crop = round(fl.filter((f) => f.group === 'crop' || f.kind === 'greenhouse').reduce((a, f) => a + (f.yield_t || 0), 0), 2);
  farm.yield_palm = round(fl.reduce((a, f) => a + (f.tree_yield_t || 0), 0), 2);
  farm.yield_fruit = round(fl.filter((f) => f.kind === 'fruit').reduce((a, f) => a + (f.yield_t || 0), 0), 2);
  // fruit yield is counted in yield_t of the fruit field: do not double count in crop
  farm.yield_total = round(farm.yield_crop + farm.yield_palm + farm.yield_fruit, 2);
  const crop_only = fl.filter((f) => f.group === 'crop' || f.kind === 'greenhouse');
  farm.yield_crop = round(crop_only.reduce((a, f) => a + (f.yield_t || 0), 0), 2);
  farm.yield_total = round(farm.yield_crop + farm.yield_palm + farm.yield_fruit, 2);
  const daily = fl.reduce((a, f) => a + f.du * f.water_rate, 0);
  farm.water = {
    daily: round(daily, 1),
    weekly: round(daily * 7, 1),
    monthly: round(daily * 30, 1),
    allocation: round(daily * 30 * (farm.id === 1 ? 1.22 : rr(0.82, 1.38)), 0),
  };
  farm.delivery = farm.fields.length ? pick(DELIVERY) : null;
  // advisories
  const a = R();
  farm.advisory_status = a < 0.08 ? 'critical' : a < 0.38 ? 'active' : 'none';
  farm.advisory_count = farm.advisory_status === 'none' ? 0 : farm.advisory_status === 'critical' ? ri(2, 4) : ri(1, 2);
  farm.advisory = farm.advisory_status === 'none' ? null : pick(ADVISORIES);
  // satellite passes
  farm.pass_offset = { S1: ri(1, 4), S2: ri(1, 7), S3: ri(0, 2) };
  farm.irrigation_method = farm.delivery;
}

for (let i = 0; i < 40; i++) FARMS.push(buildFarm(i));
for (const f of FARMS) finishFarm(f);

const FARM_BY_ID = new Map(FARMS.map((f) => [f.id, f]));
const FARM_BY_UID = new Map(FARMS.map((f) => [f.uid, f]));
const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]));

const LISTED_PER_ZONE = {};
for (const f of FARMS) LISTED_PER_ZONE[f.zone_id] = (LISTED_PER_ZONE[f.zone_id] || 0) + 1;
/** Count weight / area weight of one listed farm when rolled up to the emirate. */
const wc = (f) => ZONE_FARM_TOTAL[f.zone_id] / LISTED_PER_ZONE[f.zone_id];
const wa = (f) => wc(f) * AREA_DAMPING;
const scopeFarms = (zoneId) => FARMS.filter((f) => zoneId == null || f.zone_id === zoneId);

const ratingOf = (ier) => (ier >= 85 ? 'excellent' : ier >= 70 ? 'good' : ier >= 55 ? 'fair' : 'poor');
const chiStatus = (chi) => (chi >= 72 ? 'Healthy' : chi >= 52 ? 'Monitor' : 'At Risk');
const chiRatingOf = (chi) => (chi >= 90 ? 'excellent' : chi >= 72 ? 'good' : chi >= 52 ? 'fair' : 'poor');

/* ------------------------------------------------------------------------------------------------
 * Aggregations (zone-filtered, scaled to emirate level)
 * ---------------------------------------------------------------------------------------------- */

const memo = new Map();
const memoize = (key, fn) => {
  if (!memo.has(key)) memo.set(key, fn());
  return memo.get(key);
};
const du2ha = (du) => round(du / 10, 2);
const num = (v, d = 0) => (v === null || v === undefined ? null : round(v, d));

const CLASS_LABEL = {
  open_agriculture: 'Open Agriculture',
  protected_agriculture: 'Protected Agriculture',
  structures: 'Structures',
  barren_land: 'Barren Land',
  fallow_land: 'Fallow Land',
};

function landUseSummary(zoneId) {
  return memoize(`lu:${zoneId}`, () => {
    const acc = {};
    for (const c of Object.keys(CLASS_LABEL)) acc[c] = { parcels: 0, du: 0 };
    for (const farm of scopeFarms(zoneId)) {
      for (const p of farm.parcels) {
        acc[p.cls].parcels += wc(farm);
        acc[p.cls].du += p.du * wa(farm);
      }
    }
    const nonFallow = Object.entries(acc).filter(([c]) => c !== 'fallow_land').reduce((a, [, v]) => a + v.du, 0);
    const total = Object.values(acc).reduce((a, v) => a + v.du, 0);
    return {
      classes: Object.keys(CLASS_LABEL).map((c) => ({
        class: c,
        label: CLASS_LABEL[c],
        parcels: Math.round(acc[c].parcels),
        area_ha: du2ha(acc[c].du),
        area_du: round(acc[c].du, 1),
        share_pct: c === 'fallow_land' ? null : round((acc[c].du / nonFallow) * 100, 1),
      })),
      total_area_ha: du2ha(total),
      total_area_du: round(total, 1),
      total_structures: Math.round(acc.structures.parcels),
    };
  });
}

function landUseBreakdown(zoneId, cls) {
  const rows = new Map();
  for (const farm of scopeFarms(zoneId)) {
    for (const p of farm.parcels) {
      if (p.cls !== cls) continue;
      const r = rows.get(p.sub) || { sub_class: p.sub, parcels: 0, du: 0, farms: new Set(), farmW: 0 };
      r.parcels += wc(farm);
      r.du += p.du * wa(farm);
      if (!r.farms.has(farm.id)) {
        r.farms.add(farm.id);
        r.farmW += wc(farm);
      }
      rows.set(p.sub, r);
    }
  }
  const total = [...rows.values()].reduce((a, r) => a + r.du, 0) || 1;
  return [...rows.values()]
    .sort((a, b) => b.du - a.du)
    .map((r) => ({
      sub_class: r.sub_class,
      parcels: Math.round(r.parcels),
      area_ha: du2ha(r.du),
      area_du: round(r.du, 1),
      share_pct: round((r.du / total) * 100, 1),
      farm_count: Math.round(r.farmW),
    }));
}

const DOMAIN_CARDS = {
  open_agriculture: [
    ['cultivated_fields', 'Cultivated Fields', 'plots'],
    ['palm_trees', 'Palm Trees', 'palms'],
    ['fruit_trees', 'Fruit Trees', 'trees'],
    ['forest_trees', 'Forest Trees', 'trees'],
    ['fallow_land', 'Fallow Land', 'parcels'],
  ],
  protected_agriculture: [
    ['greenhouse', 'Greenhouses', 'units'],
    ['shade_house', 'Shade Houses', 'units'],
    ['hydroponics', 'Hydroponics', 'units'],
    ['open_shed', 'Open Sheds', 'units'],
  ],
  structures: [
    ['residential', 'Residential', 'units'],
    ['labour_housing', 'Labour Housing', 'units'],
    ['machine_storage', 'Machine Storage', 'units'],
    ['water_storage', 'Water Storage', 'units'],
    ['vehicle_road', 'Vehicle / Road', 'units'],
    ['warehouse', 'Warehouses', 'units'],
    ['commercial', 'Commercial', 'units'],
    ['animal_pens', 'Animal Enclosures', 'units'],
    ['irrigation_utilities', 'Irrigation & Utilities', 'units'],
  ],
};
const DOMAIN_CLASSES = {
  open_agriculture: ['open_agriculture', 'fallow_land'],
  protected_agriculture: ['protected_agriculture'],
  structures: ['structures'],
};

function domainSummary(zoneId, domain) {
  if (!DOMAIN_CARDS[domain]) return null;
  const classes = DOMAIN_CLASSES[domain];
  const rows = new Map(DOMAIN_CARDS[domain].map(([key, label, unit]) => [key, { key, label, unit, count: 0, du: 0, plots: 0 }]));
  let parcels = 0,
    footprint = 0;
  const farmsAny = new Map();
  const cropsByArea = new Map();
  const cultivarsByTrees = new Map();
  for (const farm of scopeFarms(zoneId)) {
    for (const p of farm.parcels) {
      farmsAny.set(farm.id, wc(farm));
      if (!classes.includes(p.cls)) continue;
      const r = rows.get(p.key);
      if (!r) continue;
      parcels += wc(farm);
      footprint += p.du * wa(farm);
      r.plots += wc(farm);
      r.du += p.du * wa(farm);
      r.count += r.unit === 'palms' || r.unit === 'trees' ? p.trees * wa(farm) : wc(farm);
      if (p.field && p.field.crop) {
        if (p.key === 'cultivated_fields') cropsByArea.set(p.field.crop, (cropsByArea.get(p.field.crop) || 0) + p.du);
        if (p.key === 'palm_trees') for (const c of p.field.cultivars) cultivarsByTrees.set(c.name, (cultivarsByTrees.get(c.name) || 0) + p.trees * c.share);
        if (p.key === 'fruit_trees' || p.key === 'forest_trees') cropsByArea.set(`${p.key}:${p.field.crop}`, (cropsByArea.get(`${p.key}:${p.field.crop}`) || 0) + p.du);
      }
    }
  }
  const top = (map, prefix, n = 3) =>
    [...map.entries()]
      .filter(([k]) => (prefix ? k.startsWith(prefix) : !k.includes(':')))
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => (prefix ? k.slice(prefix.length) : k));
  const examples = {
    cultivated_fields: top(cropsByArea, null).join(', '),
    palm_trees: top(cultivarsByTrees, null).join(', '),
    fruit_trees: top(cropsByArea, 'fruit_trees:').join(', '),
    forest_trees: top(cropsByArea, 'forest_trees:').join(', '),
  };
  const nonFallowDu = [...rows.values()].filter((r) => r.key !== 'fallow_land').reduce((a, r) => a + r.du, 0) || 1;
  return {
    domain,
    parcels: Math.round(parcels),
    farms: Math.round([...farmsAny.values()].reduce((a, b) => a + b, 0)),
    footprint_ha: du2ha(footprint),
    breakdown: [...rows.values()].map((r) => ({
      key: r.key,
      label: r.label,
      count: Math.round(r.count),
      count_unit: r.unit,
      share_pct: r.key === 'fallow_land' ? null : round((r.du / nonFallowDu) * 100, 1),
      area_ha: du2ha(r.du),
      area_du: round(r.du, 1),
      status: null,
      examples: examples[r.key] || null,
      attention: r.key === 'fallow_land',
    })),
  };
}

function treeSummary(zoneId) {
  return memoize(`trees:${zoneId}`, () => {
    let date_palm = 0, fruit = 0, olive = 0, native = 0, yPalm = 0, yFruit = 0, canopy = 0;
    for (const farm of scopeFarms(zoneId)) {
      const w = wa(farm);
      for (const f of farm.fields) {
        if (f.kind === 'palm') (date_palm += f.tree_count * w), (yPalm += (f.tree_yield_t || 0) * w), (canopy += f.du * 0.42 * w);
        if (f.kind === 'fruit') {
          if (f.crop === 'Olive') olive += f.tree_count * w;
          else fruit += f.tree_count * w;
          yFruit += (f.yield_t || 0) * w;
          canopy += f.du * 0.35 * w;
        }
        if (f.kind === 'forest') (native += f.tree_count * w), (canopy += f.du * 0.18 * w);
      }
    }
    return {
      total: Math.round(date_palm + fruit + olive + native),
      date_palm: Math.round(date_palm),
      fruit: Math.round(fruit),
      olive: Math.round(olive),
      native_forest: Math.round(native),
      date_palm_yield_t: round(yPalm, 1),
      fruit_volume_t: round(yFruit, 1),
      canopy_area_du: round(canopy, 1),
    };
  });
}

function speciesSummary(zoneId, category) {
  const all = memoize(`species:${zoneId}`, () => {
    const rows = new Map();
    const add = (cat, display, species, cultivar, trees, yieldT, du) => {
      const k = `${cat}|${display}`;
      const r = rows.get(k) || { cat, display, species, cultivar, trees: 0, yieldT: 0, du: 0, hasYield: yieldT !== null };
      r.trees += trees;
      r.yieldT += yieldT || 0;
      r.du += du;
      rows.set(k, r);
    };
    for (const farm of scopeFarms(zoneId)) {
      const w = wa(farm);
      for (const f of farm.fields) {
        if (f.kind === 'palm') {
          for (const c of f.cultivars) add('date_palm', `${c.name} (Date Palm)`, 'Date Palm', c.name, f.tree_count * c.share * w, (f.tree_yield_t || 0) * c.share * w, f.du * c.share * w);
        } else if (f.kind === 'fruit') {
          add('fruit', `${f.crop} (Fruit Tree)`, f.crop, null, f.tree_count * w, (f.yield_t || 0) * w, f.du * w);
        } else if (f.kind === 'forest') {
          const tag = f.crop === 'Ghaf' ? 'UAE National Tree' : 'Native Heritage';
          add('native', `${f.crop} (${tag})`, f.crop, null, f.tree_count * w, null, f.du * w);
        }
      }
    }
    const byCat = {};
    for (const r of rows.values()) byCat[r.cat] = (byCat[r.cat] || 0) + r.trees;
    const order = { date_palm: 0, fruit: 1, native: 2 };
    const list = [...rows.values()]
      .sort((a, b) => order[a.cat] - order[b.cat] || b.trees - a.trees)
      .map((r) => ({
        display_name: r.display,
        species: r.species,
        cultivar: r.cultivar,
        scientific_name: SCIENTIFIC[r.species] || null,
        category: r.cat,
        tree_count: Math.round(r.trees),
        category_share_pct: round((r.trees / byCat[r.cat]) * 100, 1),
        est_yield_t: r.hasYield ? round(r.yieldT, 1) : null,
        est_yield_estimated: r.hasYield,
        area_ha: du2ha(r.du),
        area_du: round(r.du, 1),
      }));
    return { rows: list };
  });
  return { rows: all.rows.filter((r) => !category || r.category === category) };
}

function cropSummary(zoneId, groupBy) {
  const crops = new Map();
  const farms = [];
  for (const farm of scopeFarms(zoneId)) {
    const perFarm = new Map();
    for (const f of farm.fields) {
      if (!(f.group === 'crop' || f.kind === 'greenhouse')) continue;
      const k = f.crop;
      const a = perFarm.get(k) || { crop: k, du: 0, n: 0 };
      a.du += f.du;
      a.n += 1;
      perFarm.set(k, a);
      const g = crops.get(k) || { crop: k, du: 0, n: 0 };
      g.du += f.du * wa(farm);
      g.n += wc(farm);
      crops.set(k, g);
    }
    const farmTotal = [...perFarm.values()].reduce((a, c) => a + c.du, 0) || 1;
    if (perFarm.size) {
      farms.push({
        farm_id: farm.id,
        farm_name: farm.name,
        crops: [...perFarm.values()].sort((a, b) => b.du - a.du).map((c) => ({
          crop: c.crop,
          area_du: round(c.du, 1),
          share_pct: round((c.du / farmTotal) * 100, 1),
          field_count: c.n,
        })),
      });
    }
  }
  const total = [...crops.values()].reduce((a, c) => a + c.du, 0) || 1;
  return {
    crops: [...crops.values()].sort((a, b) => b.du - a.du).map((c) => ({
      crop: c.crop,
      area_du: round(c.du, 1),
      share_pct: round((c.du / total) * 100, 1),
      field_count: Math.round(c.n),
    })),
    farms: groupBy === 'farm' ? farms : null,
  };
}

function structuresSummary(zoneId) {
  return memoize(`str:${zoneId}`, () => {
    const by = new Map();
    let totalCount = 0,
      totalDu = 0,
      farmsWith = 0;
    let largestHolding = null,
      largestStructure = null;
    for (const farm of scopeFarms(zoneId)) {
      const own = farm.structs.filter((s) => s.cls === 'structures');
      if (!own.length) continue;
      farmsWith += wc(farm);
      const farmDu = own.reduce((a, s) => a + s.du, 0);
      if (!largestHolding || farmDu > largestHolding.du) largestHolding = { farm_id: farm.id, farm_name: farm.name, du: farmDu, w: wa(farm) };
      for (const s of own) {
        totalCount += wc(farm);
        totalDu += s.du * wa(farm);
        const r = by.get(s.type) || { type: s.type, count: 0, du: 0, maxDu: 0 };
        r.count += wc(farm);
        r.du += s.du * wa(farm);
        r.maxDu = Math.max(r.maxDu, s.du);
        by.set(s.type, r);
        if (!largestStructure || s.du > largestStructure.du) largestStructure = { type: s.type, du: s.du };
      }
    }
    return {
      total_count: Math.round(totalCount),
      total_area_du: round(totalDu, 1),
      farms_with_structures: Math.round(farmsWith),
      largest_holding: largestHolding ? { farm_id: largestHolding.farm_id, farm_name: largestHolding.farm_name, area_du: round(largestHolding.du, 1) } : null,
      largest_structure: largestStructure ? { type: largestStructure.type, area_du: round(largestStructure.du, 1) } : null,
      by_type: [...by.values()].sort((a, b) => b.du - a.du).map((r) => ({ type: r.type, count: Math.round(r.count), area_du: round(r.du, 1) })),
    };
  });
}

function portfolioSummary(zoneId) {
  return memoize(`pf:${zoneId}`, () => {
    let farms = 0,
      fields = 0,
      palm = 0,
      other = 0;
    for (const farm of scopeFarms(zoneId)) {
      farms += wc(farm);
      fields += farm.fields.length * wc(farm);
      for (const f of farm.fields) {
        if (f.kind === 'palm') palm += f.tree_count * wa(farm);
        else other += f.tree_count * wa(farm);
      }
    }
    const total = palm + other;
    return {
      total_farms: Math.round(farms),
      total_fields: Math.round(fields),
      total_trees: Math.round(total),
      tree_split: {
        date_palm: { count: Math.round(palm), pct: total ? round((palm / total) * 100, 1) : null },
        other: { count: Math.round(other), pct: total ? round((other / total) * 100, 1) : null },
      },
      boundary_verified_pct: 96.4,
    };
  });
}

function farmsInZone(zoneId) {
  return scopeFarms(zoneId);
}

function enterpriseKpi(kind, zoneId) {
  const farms = scopeFarms(zoneId);
  const nowIso = isoNow();
  const asOf = isoDate(daysAgo(2));
  if (kind === 'advisories') {
    let active = 0,
      critical = 0,
      farmsAffected = 0;
    for (const f of farms) {
      if (f.advisory_status === 'none') continue;
      farmsAffected += wc(f);
      if (f.advisory_status === 'critical') critical += f.advisory_count * wc(f);
      else active += f.advisory_count * wc(f);
    }
    const total = Math.round(active + critical);
    return {
      value: total, unit: 'advisories', label: 'Active advisories', subtext: `Across ${Math.round(farmsAffected).toLocaleString('en-US')} holdings`,
      rolled_up_at: nowIso,
      badges: [
        { label: `${Math.round(critical).toLocaleString('en-US')} critical`, tone: 'critical' },
        { label: `${Math.round(active).toLocaleString('en-US')} advisory`, tone: 'warning' },
      ],
    };
  }
  if (kind === 'ier') {
    const scored = farms.filter((f) => f.ier != null);
    const w = scored.reduce((a, f) => a + wc(f), 0);
    const avg = scored.reduce((a, f) => a + f.ier * wc(f), 0) / w;
    const counts = { excellent: 0, good: 0, fair: 0, poor: 0 };
    for (const f of scored) counts[ratingOf(f.ier)] += wc(f);
    for (const k of Object.keys(counts)) counts[k] = Math.round(counts[k]);
    return {
      value: counts.poor, unit: 'farms', label: 'Farms rated low', subtext: null, rolled_up_at: nowIso,
      badges: [{ label: `${counts.fair.toLocaleString('en-US')} fair`, tone: 'warning' }],
      scored_farms: Math.round(w), average_score: round(avg, 1), average_class: ratingOf(avg), class_counts: counts,
      as_of: asOf, period_days: 30,
    };
  }
  if (kind === 'yield') {
    const total = farms.reduce((a, f) => a + f.yield_total * wa(f), 0);
    return {
      value: round(total, 1), unit: 't', label: 'Forecast yield', subtext: 'Newest 60-day forecast window', rolled_up_at: nowIso,
      badges: [{ label: 'Forecast window open', tone: 'positive' }],
      window_start: isoDate(daysAgo(10)), window_end: isoDate(new Date(Date.now() + 50 * DAY)),
    };
  }
  if (kind === 'treeHealth') {
    let scored = 0, stressed = 0, critical = 0, scoreW = 0;
    for (const f of farms) {
      if (!f.has_palms) continue;
      const trees = f.palm_count * wa(f) * 0.92;
      const d = canopyShares(f.chi);
      scored += trees;
      stressed += trees * d.stressed;
      critical += trees * d.critical;
      scoreW += f.chi * trees;
    }
    return {
      value: Math.round(stressed + critical), unit: 'trees', label: 'Stressed or critical trees', subtext: null, rolled_up_at: nowIso,
      badges: [{ label: 'Calibrated model', tone: 'positive' }],
      scored_trees: Math.round(scored), average_score: round(scoreW / scored, 1), stressed_trees: Math.round(stressed),
      critical_trees: Math.round(critical), as_of: asOf,
    };
  }
  return null;
}

/** Shares of a farm's palms in each canopy class given its mean CHI. */
function canopyShares(chi) {
  const sd = 11;
  const c = (x) => normCdf(x, chi, sd);
  const veryHealthy = 1 - c(90),
    healthy = c(90) - c(75),
    watch = c(75) - c(60),
    stressed = c(60) - c(45),
    critical = c(45);
  return { very_healthy: veryHealthy, healthy, watch, stressed, critical };
}

function canopyDistribution(zoneId) {
  const acc = { very_healthy: 0, healthy: 0, watch: 0, stressed: 0, critical: 0 };
  let scored = 0,
    without = 0;
  for (const f of scopeFarms(zoneId)) {
    if (!f.has_palms) continue;
    if (f.chi < 48 && f.id % 7 === 0) {
      without += wc(f);
      continue;
    }
    const trees = f.palm_count * wa(f) * 0.93;
    const d = canopyShares(f.chi);
    scored += trees;
    for (const k of Object.keys(acc)) acc[k] += trees * d[k];
  }
  for (const k of Object.keys(acc)) acc[k] = Math.round(acc[k]);
  return { scored_trees: Math.round(scored), classes: acc, farms_without_headline: Math.round(without), latest_capture_date: isoDate(daysAgo(2)) };
}

function waterSummary(zoneId) {
  const farms = scopeFarms(zoneId);
  let demand = 0, alloc = 0, count = 0, above = 0;
  for (const f of farms) {
    demand += f.water.monthly * wa(f);
    alloc += f.water.allocation * wa(f);
    count += wc(f);
    if (f.water.monthly > f.water.allocation) above += wc(f);
  }
  return {
    total_demand_m3: Math.round(demand), total_allocated_m3: Math.round(alloc), total_farms: Math.round(count),
    farms_above_allocation: Math.round(above), farms_within_allocation: Math.round(count - above),
    demand_rate_min_m3_per_dunum: 0.8, demand_rate_max_m3_per_dunum: 7.8,
  };
}

function farmRankingRow(f) {
  const lastPass = latestPassDate(f);
  const nextPass = nextPassDate(f);
  const health = f.chi;
  let status = 'optimal';
  if (f.advisory_status === 'critical' || (health !== null && health < 52) || f.ier < 55) status = 'attention';
  else if (f.advisory_status === 'active' || (health !== null && health < 72) || f.ier < 70) status = 'watch';
  const crops = cropMix(f);
  return {
    farm_id: f.id,
    farm_uid: f.uid,
    farm_name: f.name,
    zone_name: ZONES.find((z) => z.id === f.zone_id).name,
    status,
    health_pct: health,
    health_as_of: health === null ? null : isoDate(daysAgo(2)),
    mean_ndvi: f.mean_ndvi,
    ndvi_as_of: isoDate(daysAgo(3)),
    has_trees: f.tree_count > 0,
    has_crops: f.has_crops,
    yield_t: f.yield_total,
    yield_t_per_du: round(f.yield_total / f.du, 2),
    ier: f.ier,
    water_pct_of_quota: round((f.water.monthly / f.water.allocation) * 100, 1),
    water_m3_month: Math.round(f.water.monthly),
    yield_breakdown: { crop_t: f.yield_crop, date_palm_t: f.yield_palm, fruit_t: f.yield_fruit },
    irrigation_method: f.irrigation_method,
    field_count: f.fields.length,
    crops,
    latest_pass_date: lastPass,
    next_pass_date: nextPass,
    advisory: f.advisory,
  };
}

function cropMix(f) {
  const by = new Map();
  for (const fld of f.fields) {
    if (fld.kind === 'fallow') continue;
    const label = fld.kind === 'palm' ? 'Date Palm' : fld.kind === 'fruit' ? 'Fruit Trees' : fld.kind === 'forest' ? 'Forest Trees' : fld.crop;
    by.set(label, (by.get(label) || 0) + fld.du);
  }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  return top.join(' & ') || null;
}

function farmRankings(zoneId, metric, order, q, limit) {
  let rows = scopeFarms(zoneId).map(farmRankingRow);
  const needle = (q || '').trim().toLowerCase();
  if (needle) rows = rows.filter((r) => `${r.farm_name} ${r.farm_uid} ${r.crops || ''}`.toLowerCase().includes(needle));
  const value = {
    health: (r) => r.health_pct,
    yield: (r) => r.yield_t,
    ier: (r) => r.ier,
    water: (r) => r.water_pct_of_quota,
  }[metric] || ((r) => r.ier);
  const bestHigh = metric !== 'water';
  const withVal = rows.filter((r) => value(r) !== null);
  const without = rows.filter((r) => value(r) === null);
  withVal.sort((a, b) => (bestHigh ? value(b) - value(a) : value(a) - value(b)));
  let ordered = order === 'bottom' ? [...withVal].reverse() : withVal;
  ordered = ordered.concat(without);
  const top = ordered.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
  const avg = (fn) => {
    const v = rows.map(fn).filter((x) => x !== null && x !== undefined);
    return v.length ? round(v.reduce((a, b) => a + b, 0) / v.length, 1) : null;
  };
  return {
    averages: {
      health_pct: avg((r) => r.health_pct),
      mean_ndvi: avg((r) => r.mean_ndvi) === null ? null : round(avg((r) => r.mean_ndvi) / 1, 2),
      yield_t: avg((r) => r.yield_t),
      yield_t_per_du: avg((r) => r.yield_t_per_du),
      ier: avg((r) => r.ier),
      water_pct_of_quota: avg((r) => r.water_pct_of_quota),
      water_m3_month: avg((r) => r.water_m3_month),
    },
    rows: top,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Satellite
 * ---------------------------------------------------------------------------------------------- */

const SATELLITES = {
  S1: { repeat: 5, craft: ['Sentinel-2A', 'Sentinel-2B'], hour: 6, minute: 52, categories: { Vegetation: ['NDVI', 'EVI', 'SAVI', 'GNDVI'], Chlorophyll: ['NDRE', 'CIgreen'], Water: ['NDWI', 'NDMI'] } },
  S2: { repeat: 8, craft: ['Landsat-8', 'Landsat-9'], hour: 6, minute: 41, categories: { Vegetation: ['NDVI', 'EVI', 'SAVI'], Water: ['NDWI', 'NDMI'] } },
  S3: { repeat: 3, craft: ['PlanetScope'], hour: 7, minute: 14, categories: { Vegetation: ['NDVI', 'GNDVI'], Chlorophyll: ['CIgreen'] } },
};
const INDEX_DESC = {
  NDVI: 'Normalised Difference Vegetation Index', EVI: 'Enhanced Vegetation Index', SAVI: 'Soil Adjusted Vegetation Index',
  GNDVI: 'Green NDVI', NDRE: 'Normalised Difference Red Edge', CIgreen: 'Green Chlorophyll Index',
  NDWI: 'Normalised Difference Water Index', NDMI: 'Normalised Difference Moisture Index',
};

function passesFor(farm, sat) {
  const def = SATELLITES[sat];
  const out = [];
  const offset = farm.pass_offset[sat];
  for (let k = 0; ; k++) {
    const ago = offset + k * def.repeat;
    if (ago > 420) break;
    const d = daysAgo(ago);
    d.setUTCHours(def.hour, def.minute + Math.floor(hash01(farm.id, sat, k, 'm') * 9), Math.floor(hash01(farm.id, sat, k, 's') * 59), 0);
    const cloudRaw = hash01(farm.id, sat, k, 'c');
    const cloud = round(Math.pow(cloudRaw, 2.2) * 88, 2);
    out.push({
      satellite: sat,
      spacecraft_id: def.craft[k % def.craft.length],
      datetime: d.toISOString().replace('.000Z', 'Z'),
      cloud_cover: cloud,
      is_active: hash01(farm.id, sat, k, 'a') > 0.06,
    });
  }
  return out;
}
function latestPassDate(farm) {
  const p = passesFor(farm, 'S1')[0];
  return p ? p.datetime.slice(0, 10) : null;
}
function nextPassDate(farm) {
  const p = passesFor(farm, 'S1')[0];
  if (!p) return null;
  return isoDate(new Date(new Date(p.datetime).getTime() + SATELLITES.S1.repeat * DAY));
}

/* ----- PNG encoding (no deps) ----- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
const TRANSPARENT_PNG = encodePng(1, 1, Buffer.from([0, 0, 0, 0]));

const RAMP = ['#d73027', '#fc8d59', '#fee08b', '#91cf60', '#1a9850'];
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const imageryCache = new Map();

/** A raster of the farm's fields coloured by a pseudo "index" value, plus its legend. */
function fieldImagery(farm, sat, index, dateKey) {
  const key = `${farm.id}|${sat}|${index}|${dateKey}`;
  if (imageryCache.has(key)) return imageryCache.get(key);
  const W = 176,
    H = Math.max(96, Math.round((176 * (farm.extent[3] - farm.extent[1])) / (farm.extent[2] - farm.extent[0])));
  const [x0, y0, x1, y1] = farm.extent;
  const buf = Buffer.alloc(W * H * 4);
  const shift = { NDVI: 0, EVI: -0.08, SAVI: -0.05, GNDVI: 0.04, NDRE: -0.18, CIgreen: -0.1, NDWI: -0.3, NDMI: -0.2 }[index] || 0;
  const counts = [0, 0, 0, 0, 0];
  const seed = hash01(farm.id, sat, index, dateKey) * 6.28;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const mx = x0 + ((px + 0.5) / W) * (x1 - x0);
      const my = y1 - ((py + 0.5) / H) * (y1 - y0);
      let field = null;
      for (const f of farm.fields) {
        if (mx >= f.extent[0] && mx <= f.extent[2] && my >= f.extent[1] && my <= f.extent[3] && pointInRing(mx, my, f.ring)) {
          field = f;
          break;
        }
      }
      const o = (py * W + px) * 4;
      if (!field) continue;
      const n1 = Math.sin(px * 0.21 + seed) * Math.cos(py * 0.17 - seed) * 0.09;
      const n2 = Math.sin(px * 0.9 + py * 0.7 + seed) * 0.03;
      const grad = ((px / W) - 0.5) * 0.08;
      const v = clamp(field.ndvi + shift + n1 + n2 + grad, 0.001, 0.999);
      const cls = Math.min(4, Math.floor(v * 5));
      counts[cls]++;
      const [r, g, b] = hexRgb(RAMP[cls]);
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = 235;
    }
  }
  const pixelHa = (farm.ha * (farm.fields.reduce((a, f) => a + f.area_m2, 0) / farm.area_m2)) / Math.max(1, counts.reduce((a, b) => a + b, 0));
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const legends = RAMP.map((hex, i) => ({
    hex,
    min: round(i * 0.2, 2),
    max: round((i + 1) * 0.2, 2),
    unit: '',
    area: round(counts[i] * pixelHa, 2),
    'area%': `${((counts[i] / total) * 100).toFixed(1)}%`,
  }));
  const res = { image: encodePng(W, H, buf).toString('base64'), dynamic: true, legends, unit: 'hectare' };
  imageryCache.set(key, res);
  return res;
}

/* ------------------------------------------------------------------------------------------------
 * Weather
 * ---------------------------------------------------------------------------------------------- */

function localHour(d = new Date()) {
  return (d.getUTCHours() + 4 + d.getUTCMinutes() / 60) % 24; // UTC+4
}
function tempAt(farm, d) {
  const h = localHour(d);
  const zoneBias = { 1: 0, 2: 0.9, 3: -0.6 }[farm.zone_id] || 0;
  // Early-October Gulf: 26-39 C, min ~05:30, max ~15:00 local
  return 32.5 + zoneBias + 6.5 * Math.sin(((h - 9.5) / 24) * 2 * Math.PI);
}
function currentWeather(farm) {
  const now = new Date();
  const t = tempAt(farm, now);
  const hum = clamp(round(78 - (t - 26) * 3.4 + hash01(farm.id, 'h') * 6, 0), 22, 88);
  const dew = t - (100 - hum) / 5;
  const wind = round(2.4 + hash01(farm.id, 'w', now.getUTCHours()) * 3.6, 1);
  const hr = localHour(now);
  const uv = hr < 6.5 || hr > 17.5 ? 0 : round(9.5 * Math.sin(((hr - 6.5) / 11) * Math.PI), 1);
  return {
    temperature_c: round(t, 1), temperature_f: round(t * 1.8 + 32, 1), humidity: hum, pressure_hpa: round(1009 + hash01(farm.id, 'p') * 4, 1),
    pressure_inhg: round((1009 + hash01(farm.id, 'p') * 4) * 0.02953, 2), t_dew_c: round(dew, 1), t_dew_f: round(dew * 1.8 + 32, 1),
    vpd_kpa: round(0.6108 * Math.exp((17.27 * t) / (t + 237.3)) * (1 - hum / 100), 2), vpd_inhg: round(0.6108 * Math.exp((17.27 * t) / (t + 237.3)) * (1 - hum / 100) * 0.2953, 2),
    unit: 'metric', 'uv index': uv, wind_speed_mps: wind, wind_speed_mph: round(wind * 2.2369, 1), wind_deg: Math.round(hash01(farm.id, 'wd') * 70 + 290) % 360,
    clouds: Math.round(hash01(farm.id, 'cl') * 18), rain_mm: 0, rain_in: 0, last_updated: new Date(Math.floor(now.getTime() / 600000) * 600000).toISOString(),
    type: 'current', current_rain_beta_mm: 0, current_rain_beta_in: 0, soil_moisture_deficit_mm: round(14 + hash01(farm.id, 'sm') * 22, 1),
    soil_moisture_0_7_cm: round(0.11 + hash01(farm.id, 's1') * 0.07, 3), soil_moisture_7_28_cm: round(0.14 + hash01(farm.id, 's2') * 0.06, 3),
    soil_moisture_28_100_cm: round(0.18 + hash01(farm.id, 's3') * 0.05, 3), soil_moisture_100_289_cm: round(0.2 + hash01(farm.id, 's4') * 0.04, 3),
    soil_temperature_0_7_cm: round(t - 2.5, 1), soil_temperature_7_28_cm: round(t - 5.5, 1), soil_temperature_54_cm: round(t - 8, 1), soil_temperature_100_289_cm: round(31.5, 1),
  };
}
function dayForecast(farm) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const d = new Date(start.getTime() + i * 3600000);
    const t = tempAt(farm, d) + (hash01(farm.id, 'f', i) - 0.5) * 1.2 - Math.floor(i / 24) * 0.4;
    const hum = clamp(78 - (t - 26) * 3.4 + (hash01(farm.id, 'fh', i) - 0.5) * 6, 20, 90);
    const dayIdx = Math.floor(i / 24);
    const rainy = dayIdx === 2 && i % 24 >= 14 && i % 24 <= 17;
    pts.push({
      temp: round(t, 1),
      pressure: round(1009 + Math.sin(i / 12) * 2 + hash01(farm.id, 'fp', i), 1),
      humidity: Math.round(hum),
      wind_speed: round(2.2 + hash01(farm.id, 'fw', i) * 4.2, 1),
      rain: rainy ? round(0.3 + hash01(farm.id, 'fr', i) * 0.8, 2) : 0,
      datetime: d.toISOString().replace('T', ' ').slice(0, 19),
    });
  }
  return pts;
}
function soilWater(farm) {
  const t = tempAt(farm, new Date());
  return {
    soil_moisture_deficit_mm: round(14 + hash01(farm.id, 'sm') * 22, 1),
    volumetric_soil_water_5cm_m3m3: round(0.1 + hash01(farm.id, 'v1') * 0.07, 3),
    volumetric_soil_water_15cm_m3m3: round(0.13 + hash01(farm.id, 'v2') * 0.06, 3),
    volumetric_soil_water_50cm_m3m3: round(0.17 + hash01(farm.id, 'v3') * 0.05, 3),
    volumetric_soil_water_150cm_m3m3: round(0.2 + hash01(farm.id, 'v4') * 0.04, 3),
    soil_temp_5cm_c: round(t - 2.5, 1), soil_temp_15cm_c: round(t - 5.5, 1), soil_temp_50cm_c: round(t - 8, 1), soil_temp_150cm_c: 31.5,
    last_updated: new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString(),
    stale: false,
  };
}
function minuteCast() {
  return {
    Summary: { Phrase: 'No precipitation for the next 120 min', Type: null, TypeId: 0 },
    Summaries: [{ StartMinute: 0, EndMinute: 119, CountMinute: 120, MinuteText: 'No precipitation for %MINUTE_VALUE min', Type: null, TypeId: 0 }],
    Link: 'https://example.invalid/minutecast',
    MobileLink: 'https://example.invalid/minutecast',
  };
}

/* ------------------------------------------------------------------------------------------------
 * GeoServer-style WFS datasets + a tiny CQL evaluator
 * ---------------------------------------------------------------------------------------------- */

const LAYER_PREFIX = 'ADAFSA_MLRegistry:';
const polyGeom = (ring) => ({ type: 'Polygon', coordinates: [ring.map(([x, y]) => [round(x, 2), round(y, 2)])] });
const bboxOf = (ring) => ringExtent(ring).map((v) => round(v, 2));

const WFS_LAYERS = (() => {
  const farms = [],
    fields = [],
    lulc = [],
    crops = [],
    trees = [];
  let tid = 1;
  for (const farm of FARMS) {
    farms.push({ id: `farms.${farm.id}`, props: { uid: farm.uid, area_dunum: round(farm.du, 3), area_ha: round(farm.ha, 4), zone_id: farm.zone_id }, ring: farm.ring });
    for (const f of farm.fields) {
      fields.push({ id: `fields.${f.id}`, props: { id: f.id, farm_uid: farm.uid, production_system: f.production }, ring: f.ring });
      if (f.group === 'crop' || f.kind === 'greenhouse') {
        const name = f.crop === 'Rhodes Grass' ? 'Rhodes grass' : f.crop === 'Alfalfa' ? 'Alfalfa' : 'Other';
        crops.push({ id: `field_crops_v4.${f.id}`, props: { farm_uid: farm.uid, crop_name: name, field_id: f.id }, ring: f.ring });
      }
      if (f.kind === 'palm' || f.kind === 'fruit' || f.kind === 'forest') {
        const n = Math.min(f.tree_count, f.kind === 'palm' ? 26 : 10);
        const [lx0, ly0, lx1, ly1] = ringExtent(f.local);
        for (let k = 0; k < n; k++) {
          const lx = lx0 + 6 + R() * (lx1 - lx0 - 12),
            ly = ly0 + 6 + R() * (ly1 - ly0 - 12);
          const half = 2.6;
          const ring = rectLocalAt(farm, lx - half, ly - half, lx + half, ly + half);
          let species, variety;
          if (f.kind === 'palm') {
            let x = R(),
              chosen = f.cultivars[0].name;
            for (const c of f.cultivars) {
              x -= c.share;
              if (x <= 0) {
                chosen = c.name;
                break;
              }
            }
            species = 'Date palm';
            variety = CULTIVAR_WFS[chosen] || 'Other';
          } else if (f.kind === 'fruit') (species = 'Fruit Trees'), (variety = f.crop);
          else (species = 'Other Trees'), (variety = f.crop);
          trees.push({
            id: `trees_v7.${tid++}`,
            props: { farm_uid: farm.uid, species, variety_cultivar: variety, tree_name: `${species} ${tid}`, canopy_health_index: f.chi ? round(f.chi + (R() - 0.5) * 14, 1) : null, farm_id: farm.id, last_confirmed_at: isoDate(daysAgo(ri(2, 40))) },
            ring,
          });
        }
      }
    }
    for (const p of farm.parcels) {
      lulc.push({ id: `lulc_v1.${lulc.length + 1}`, props: { farm_uid: farm.uid, l1: p.l1, l2: p.sub }, ring: p.ring });
    }
  }
  const prep = (arr) => arr.map((r) => ({ id: r.id, props: r.props, geometry: polyGeom(r.ring), bbox: bboxOf(r.ring) }));
  const L = {
    farms: prep(farms), fields: prep(fields), lulc_v1: prep(lulc), field_crops_v4: prep(crops), trees_v7: prep(trees),
  };
  return L;
})();

function rectLocalAt(farm, x0, y0, x1, y1) {
  const ring = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  return ring.map(([x, y]) => localToMerc(farm.center, farm.rot, x, y));
}

function wfsRecords(typeName) {
  const name = String(typeName || '').replace(/^.*:/, '');
  const attrs = name.endsWith('_attrs');
  const base = name.replace(/_attrs$/, '');
  const recs = WFS_LAYERS[base];
  if (!recs) return null;
  return { recs, attrs, base };
}

/* --- CQL --- */
function tokenizeCql(src) {
  const re = /\s*(?:('(?:[^']|'')*')|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][\w.]*)|(<>|<=|>=|!=|=|<|>|\(|\)|,))/y;
  const out = [];
  re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    const m = re.exec(src);
    if (!m) break;
    if (m[1] !== undefined) out.push({ t: 'str', v: m[1].slice(1, -1).replace(/''/g, "'") });
    else if (m[2] !== undefined) out.push({ t: 'num', v: Number(m[2]) });
    else if (m[3] !== undefined) out.push({ t: 'id', v: m[3] });
    else out.push({ t: 'op', v: m[4] });
  }
  return out;
}
function compileCql(src) {
  if (!src || !String(src).trim()) return () => true;
  const toks = tokenizeCql(String(src));
  let i = 0;
  const peek = () => toks[i];
  const kw = (t, w) => t && t.t === 'id' && t.v.toUpperCase() === w;
  function value() {
    const t = toks[i++];
    return t ? t.v : null;
  }
  function parseOr() {
    let left = parseAnd();
    while (kw(peek(), 'OR')) {
      i++;
      const l = left,
        r = parseAnd();
      left = (f) => l(f) || r(f);
    }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (kw(peek(), 'AND')) {
      i++;
      const l = left,
        r = parseUnary();
      left = (f) => l(f) && r(f);
    }
    return left;
  }
  function parseUnary() {
    const t = peek();
    if (kw(t, 'NOT')) {
      i++;
      const inner = parseUnary();
      return (f) => !inner(f);
    }
    if (t && t.t === 'op' && t.v === '(') {
      i++;
      const inner = parseOr();
      if (peek() && peek().v === ')') i++;
      return inner;
    }
    return parsePredicate();
  }
  function parsePredicate() {
    const t = toks[i++];
    if (!t) return () => true;
    if (kw(t, 'BBOX')) {
      i++; // (
      i++; // geometry field
      const nums = [];
      while (peek() && !(peek().t === 'op' && peek().v === ')')) {
        const n = toks[i++];
        if (n.t === 'num') nums.push(n.v);
      }
      i++; // )
      const [a, b, c, d] = nums;
      return (f) => !!f.bbox && f.bbox[0] <= c && f.bbox[2] >= a && f.bbox[1] <= d && f.bbox[3] >= b;
    }
    const field = t.v;
    const op = toks[i++];
    if (!op) return () => true;
    if (kw(op, 'IN')) {
      i++; // (
      const vals = [];
      while (peek() && !(peek().t === 'op' && peek().v === ')')) {
        const v = toks[i++];
        if (v.t !== 'op') vals.push(v.v);
      }
      i++;
      const set = new Set(vals.map(String));
      return (f) => set.has(String(f.props[field]));
    }
    if (kw(op, 'LIKE')) {
      const pat = String(value());
      const re = new RegExp('^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
      return (f) => re.test(String(f.props[field] ?? ''));
    }
    const rhs = value();
    switch (op.v) {
      case '=': return (f) => String(f.props[field]) === String(rhs);
      case '<>':
      case '!=': return (f) => String(f.props[field]) !== String(rhs);
      case '<': return (f) => Number(f.props[field]) < Number(rhs);
      case '>': return (f) => Number(f.props[field]) > Number(rhs);
      case '<=': return (f) => Number(f.props[field]) <= Number(rhs);
      case '>=': return (f) => Number(f.props[field]) >= Number(rhs);
      default: return () => true;
    }
  }
  try {
    return parseOr();
  } catch {
    return () => true;
  }
}

const TREE_LAYER_COUNTS = { trees_v1: 18402113, trees_v2: 21733980, trees_v3: 24581306, trees_v4: 27019442 };

function handleWfs(ctx) {
  const q = ctx.query;
  const typeName = q.typeName || q.typename || q.TYPENAME || q.typeNames;
  const resultType = String(q.resultType || q.resulttype || '').toLowerCase();
  const name = String(typeName || '').replace(/^.*:/, '');
  let features = [];
  let matched = 0;
  const wantHits = resultType === 'hits';
  if (TREE_LAYER_COUNTS[name]) {
    matched = TREE_LAYER_COUNTS[name];
  } else {
    const found = wfsRecords(typeName);
    if (!found) return ctx.json(404, { error: `Unknown layer ${typeName}` });
    const pred = compileCql(q.CQL_FILTER || q.cql_filter);
    const all = found.recs.filter(pred);
    matched = all.length;
    const max = Number(q.maxFeatures || q.count || q.MAXFEATURES || 0) || all.length;
    const props = (q.propertyName || q.propertyname || '').split(',').map((s) => s.trim()).filter(Boolean);
    features = all.slice(0, max).map((r) => {
      const p = props.length ? Object.fromEntries(Object.entries(r.props).filter(([k]) => props.includes(k))) : r.props;
      return { type: 'Feature', id: r.id, geometry: found.attrs ? null : r.geometry, geometry_name: 'geom', properties: p, bbox: r.bbox };
    });
  }
  if (wantHits) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs" numberOfFeatures="${matched}" timeStamp="${isoNow()}"/>`;
    return ctx.send(200, { 'Content-Type': 'text/xml; charset=utf-8' }, xml);
  }
  return ctx.json(200, {
    type: 'FeatureCollection',
    features,
    totalFeatures: matched,
    numberMatched: matched,
    numberReturned: features.length,
    timeStamp: isoNow(),
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::3857' } },
  });
}

function handleWms(ctx) {
  const req = String(ctx.query.REQUEST || ctx.query.request || 'GetMap').toLowerCase();
  if (req === 'getfeatureinfo') {
    return ctx.json(200, { type: 'FeatureCollection', features: [], totalFeatures: 0, numberReturned: 0 });
  }
  return ctx.send(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' }, TRANSPARENT_PNG);
}

/* ------------------------------------------------------------------------------------------------
 * Auth / profile
 * ---------------------------------------------------------------------------------------------- */

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function makeJwt(payload) {
  return `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u(payload)}.mock-signature`;
}
const JWT_BASE = {
  sub: '1', email: 'tariq.alnuaimi@adafsa.gov.ae', name: 'Dr. Tariq Al-Nuaimi',
  // NOTE: the app only renders the sidebar for the roles in components/AppShell/navigation.ts
  // (SuperAdmin, ADAFSAAdmin, Agronomist, FieldOfficer); "Agronomist" is the Senior Agronomist's RBAC role.
  role_name: 'Agronomist', role_id: 3, product: 'farm monitoring', iat: 1767225600, exp: 4102444800,
};
const ACCESS_TOKEN = makeJwt({ ...JWT_BASE, type: 'access' });
const REFRESH_TOKEN = makeJwt({ ...JWT_BASE, type: 'refresh', exp: 4102444800 });

const PROFILE = {
  id: 1, name: 'Dr. Tariq Al-Nuaimi', email: 'tariq.alnuaimi@adafsa.gov.ae', phone: '+971501234567', country_code: '971',
  company_id: 1, company_name: 'ADAFSA', organization: 'ADAFSA', job_title: 'Senior Agronomist', designation: 'Senior Agronomist',
  role_id: 3, role_name: 'Agronomist', roles: ['Agronomist'], permissions: ['*'], is_active: true, is_verified: true,
  country: 'United Arab Emirates', city: 'Abu Dhabi', state: 'Abu Dhabi', postcode: '', unit: 'metric', timezone: 'Asia/Dubai',
  notification_active: true, created_at: '2024-02-11T08:00:00Z',
  preferences: { area_unit: 'dunum', coord_format: 'DMS', locale: 'en' },
};

/* ------------------------------------------------------------------------------------------------
 * Farm-service payload builders
 * ---------------------------------------------------------------------------------------------- */

const s2 = (v, d) => (v === null || v === undefined ? null : v.toFixed(d));
const farmRecord = (f) => ({
  id: f.id, uid: f.uid, name: f.name, owner_name: f.owner_name, area_ha: s2(f.ha, 4), area_dunum: s2(f.du, 3), boundary: f.boundary,
  zone_id: f.zone_id, imagery_batch: 3, org_id: 1, created_at: f.created_at, updated_at: f.updated_at,
});
const fieldRecord = (f) => {
  const farm = FARM_BY_ID.get(f.farm_id);
  return {
    id: f.id, uid: f.uid, farm_id: f.farm_id, owner_name: farm.owner_name, area_ha: s2(f.ha, 4), area_dunum: s2(f.du, 3), boundary: f.boundary,
    imagery_batch: 3, created_at: farm.created_at, updated_at: farm.updated_at,
  };
};
const fieldCropTypes = (f) => {
  if (f.kind === 'fallow') return [];
  const label = f.kind === 'forest' ? f.crop : f.crop;
  return [{ crop_type: label, cultivated_area_dunum: s2(f.du, 3) }];
};
const zoneName = (id) => ZONES.find((z) => z.id === id).name;

function farmMonitoring(farm) {
  const cropNames = [...new Set(farm.fields.filter((f) => f.kind !== 'fallow').map((f) => f.crop))];
  return {
    farm: {
      id: farm.id, uid: farm.uid, name: farm.name, owner_name: farm.owner_name, area_ha: s2(farm.ha, 4), area_dunum: s2(farm.du, 3),
      zone_id: farm.zone_id, zone_name: zoneName(farm.zone_id), imagery_batch: 3, org_id: 1, field_count: farm.fields.length,
      tree_count: farm.tree_count, crop_types: cropNames, mean_ndvi: farm.mean_ndvi, ndvi_as_of: isoDate(daysAgo(3)),
      created_at: farm.created_at, updated_at: farm.updated_at,
    },
    fields: farm.fields.map((f) => ({
      id: f.id, uid: f.uid, name: f.name, owner_name: farm.owner_name, area_ha: s2(f.ha, 4), area_dunum: s2(f.du, 3), imagery_batch: 3,
      share_of_farm_area_pct: s2((f.area_m2 / farm.area_m2) * 100, 2), tree_count: f.tree_count, crop_types: fieldCropTypes(f),
      ndvi: f.ndvi, ndvi_as_of: f.ndvi_as_of, land_use: f.landUse,
    })),
  };
}
function fieldMonitoring(farm, f) {
  const total = f.tree_count;
  const scored = f.kind === 'palm' ? Math.round(total * 0.93) : null;
  return {
    id: f.id, uid: f.uid, farm_id: farm.id, owner_name: farm.owner_name, area_ha: s2(f.ha, 4), area_dunum: s2(f.du, 3), boundary: f.boundary,
    centroid_lat: round(f.centroid[1], 6), centroid_lon: round(f.centroid[0], 6), imagery_batch: 3, tree_count: total,
    avg_canopy_health_index: f.kind === 'palm' ? f.chi : null, chi_latest_capture_date: f.kind === 'palm' ? isoDate(daysAgo(2)) : null,
    chi_trees_scored: scored, chi_trees_total: f.kind === 'palm' ? total : null, crop_types: fieldCropTypes(f),
    created_at: farm.created_at, updated_at: farm.updated_at,
  };
}
function treeHealthScore(farm) {
  if (!farm.has_palms) {
    return {
      overall_score: null, status_label: 'No Data', trees_surveyed: 0, healthy_count: 0, monitor_count: 0, at_risk_count: 0, no_data_count: 0,
      latest_capture_date: null, trees_total: 0, trees_scored: 0, headline_available: false, median_canopy_health_index: null,
      sub_scores: { canopy_health_index: null, frond_count: null, trunk_condition: null, pest_pressure: null },
    };
  }
  const chi = farm.chi;
  const total = farm.palm_count;
  const scored = Math.round(total * 0.93);
  const d = canopyShares(chi);
  const healthy = d.very_healthy + d.healthy,
    monitor = d.watch,
    atRisk = d.stressed + d.critical;
  const healthyN = Math.round(scored * healthy),
    monitorN = Math.round(scored * monitor);
  return {
    overall_score: chi, status_label: chiStatus(chi), trees_surveyed: scored, healthy_count: healthyN, monitor_count: monitorN,
    at_risk_count: scored - healthyN - monitorN, no_data_count: total - scored, latest_capture_date: isoDate(daysAgo(2)), trees_total: total,
    trees_scored: scored, headline_available: true, median_canopy_health_index: round(chi + 1.8, 1),
    status_shares_percent: { Healthy: round(healthy * 100, 1), Monitor: round(monitor * 100, 1), 'At Risk': round(atRisk * 100, 1) },
    sub_scores: {
      canopy_health_index: chi, frond_count: round(clamp(chi + 4, 0, 100), 1), trunk_condition: round(clamp(chi + 7, 0, 100), 1),
      pest_pressure: round(clamp(chi - 3, 0, 100), 1),
    },
  };
}
function treeHealthMonitoring(farm, page, size) {
  const items = farm.fields.filter((f) => f.kind === 'palm').map((f) => ({
    field_id: String(f.id), field_name: f.name, tree_count: f.tree_count, health_status: chiStatus(f.chi),
    health_color: f.chi >= 72 ? '#4FB840' : f.chi >= 52 ? '#f5a623' : '#d64545', average_canopy_health_index: f.chi,
    stress_flags: f.chi < 55 ? ['water_stress'] : [], latitude: round(f.centroid[1], 6), longitude: round(f.centroid[0], 6),
    trees_total: f.tree_count, trees_scored: Math.round(f.tree_count * 0.93), headline_available: true, latest_capture_date: isoDate(daysAgo(2)),
  }));
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), total: items.length, page, size, pages: Math.max(1, Math.ceil(items.length / size)) };
}
function farmIer(farm) {
  const rated = farm.fields.filter((f) => f.kind !== 'fallow');
  return {
    ier_pct: farm.ier, class: ratingOf(farm.ier), delivery_method: farm.delivery, field_count: rated.length,
    fields: rated.map((f) => ({ field_id: f.id, ier_pct: f.ier, class: ratingOf(f.ier), area_ha: round(f.ha, 2), is_tree_field: false })),
    as_of: isoDate(daysAgo(2)), period_start: isoDate(daysAgo(32)), period_days: 30,
    ier_rating: farm.ier >= 85 ? 'Excellent' : farm.ier >= 70 ? 'Good' : farm.ier >= 55 ? 'Acceptable' : farm.ier >= 45 ? 'Poor' : 'Critical',
    tree_field_ier_pct: null,
  };
}
function farmWater(farm) {
  return { farm_id: farm.uid, daily_demand_m3: farm.water.daily, weekly_demand_m3: farm.water.weekly, monthly_demand_m3: farm.water.monthly, allocation_m3: farm.water.allocation };
}
function farmYieldFields(farm) {
  const w = { forecast_date: isoDate(daysAgo(1)), window_start: isoDate(daysAgo(10)), window_end: isoDate(new Date(Date.now() + 50 * DAY)), counted_from: isoDate(daysAgo(10)) };
  const fields = farm.fields.map((f) => ({
    field_id: f.id, crop: f.kind === 'fallow' || f.kind === 'forest' ? null : f.crop, area_ha: round(f.ha, 3), area_dunum: round(f.du, 2),
    yield_tons: f.kind === 'palm' ? f.tree_yield_t : f.yield_t,
    crop_yield_tons: f.kind === 'palm' || f.kind === 'forest' || f.kind === 'fallow' ? null : f.yield_t,
    tree_yield_tons: f.kind === 'palm' ? f.tree_yield_t : null,
    tree_count_used: f.kind === 'palm' ? Math.round(f.tree_count * 0.95) : null, tree_count_skipped: f.kind === 'palm' ? Math.round(f.tree_count * 0.05) : null,
    ...w,
  }));
  return {
    farm_id: farm.id, farm_name: farm.name, field_count: farm.fields.length, total_yield_tons: farm.yield_total, total_crop_yield_tons: round(farm.yield_crop + farm.yield_fruit, 2),
    total_tree_yield_tons: farm.yield_palm, fields, unfielded_palms: null,
  };
}

/* --- Satellite --- */
function satelliteCatalog(farm) {
  return Object.entries(SATELLITES).map(([satellite, def]) => ({ satellite, indices: Object.values(def.categories).flat() }));
}
function satelliteIndices(sat) {
  const def = SATELLITES[sat];
  if (!def) return {};
  const out = {};
  let rank = 1;
  for (const [category, aliases] of Object.entries(def.categories)) {
    out[category] = aliases.map((alias) => ({
      category, rank: rank++, description: INDEX_DESC[alias] || alias, alias, process: true, statistics: true, satellite: sat, is_available: true,
    }));
  }
  return out;
}

/* --- Reports --- */
const monthLabel = 'Autumn 2026';
function reportFarms(zoneId) {
  return scopeFarms(zoneId).map((f) => {
    const palms = {};
    for (const fl of f.fields) if (fl.kind === 'palm') for (const c of fl.cultivars) palms[c.name] = (palms[c.name] || 0) + fl.tree_count * c.share;
    const cultivars = Object.keys(palms).length
      ? Object.entries(palms).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
      : [...new Set(f.fields.filter((x) => x.group === 'crop').map((x) => x.crop))].slice(0, 3);
    const used = Math.round(f.water.monthly * (0.9 + hash01(f.id, 'wu') * 0.28));
    return {
      farm_id: f.id, sub_zone: `${f.place} ${SUB_ZONE_SUFFIX[f.id % SUB_ZONE_SUFFIX.length]}`, crop_mix: cropMix(f), cultivars,
      forecast_yield_t: f.yield_total, ier_score: f.ier, ier_class: ratingOf(f.ier), water_used_m3: used, water_allocated_m3: f.water.allocation,
      water_balance_m3: f.water.allocation - used, advisory_status: f.advisory_status, advisory_count: f.advisory_count,
    };
  });
}
function reportFields(zoneId) {
  const rows = [];
  for (const f of scopeFarms(zoneId)) {
    for (const fl of f.fields) {
      rows.push({
        field_id: fl.id, land_use: fl.landUse, ndvi: fl.ndvi, health: fl.ndvi >= 0.5 ? 'healthy' : fl.ndvi >= 0.32 ? 'moderate' : 'stressed',
        watering_method: fl.kind === 'fallow' ? null : fl.watering, growth_status: fl.growth, ier: fl.kind === 'fallow' ? null : fl.ier, crop: fl.kind === 'fallow' ? null : fl.crop,
        tree_count: fl.tree_count || null, tillage: fl.tillage,
      });
    }
  }
  return rows;
}
function reportCrops(zoneId) {
  const rows = [];
  for (const f of scopeFarms(zoneId)) {
    const by = new Map();
    for (const fl of f.fields) {
      if (!(fl.group === 'crop' || fl.kind === 'greenhouse')) continue;
      const a = by.get(fl.crop) || { crop: fl.crop, fields: [], protectedAg: false };
      a.fields.push(fl);
      if (fl.kind === 'greenhouse') a.protectedAg = true;
      by.set(fl.crop, a);
    }
    for (const a of by.values()) {
      const status = weightedPick([['Growing', 0.6], ['Harvested', 0.15], ['Planned', 0.15], ['Fallow', 0.1]]);
      const planted = daysAgo(ri(20, 110));
      const forecast = round(a.fields.reduce((s, x) => s + (x.yield_t || 0), 0), 1);
      rows.push({
        farm_id: f.id, crop: a.crop, season: monthLabel, status, ier: round(a.fields.reduce((s, x) => s + x.ier, 0) / a.fields.length, 1),
        category: a.protectedAg ? 'Protected Greenhouse' : CROP_CATEGORY[a.crop] || 'Vegetables', planting_date: isoDate(planted),
        harvest_date: isoDate(new Date(planted.getTime() + ri(70, 150) * DAY)), forecast_yield_t: forecast, target_yield_t: round(forecast * rr(0.95, 1.15), 1),
      });
    }
  }
  return rows;
}
function reportCultivars(zoneId) {
  const rows = [];
  for (const f of scopeFarms(zoneId)) {
    const by = new Map();
    for (const fl of f.fields) {
      if (fl.kind !== 'palm') continue;
      for (const c of fl.cultivars) {
        const a = by.get(c.name) || { cultivar: c.name, palms: 0, du: 0, yieldT: 0, chi: fl.chi, irrigation: fl.watering };
        a.palms += fl.tree_count * c.share;
        a.du += fl.du * c.share;
        a.yieldT += (fl.tree_yield_t || 0) * c.share;
        by.set(c.name, a);
      }
    }
    for (const a of by.values()) {
      const age = round(5 + hash01(f.id, a.cultivar, 'age') * 24, 1);
      rows.push({
        farm_id: f.id, farm_uid: f.uid, cultivar: a.cultivar, palm_count: Math.round(a.palms), planted_area_du: round(a.du, 1), avg_age_years: age,
        maturity_stage: age < 8 ? 'Juvenile' : age < 20 ? 'Productive' : 'Mature', est_yield_t: round(a.yieldT, 1), vigor_score: round(clamp(a.chi + (hash01(f.id, a.cultivar, 'v') - 0.5) * 8, 30, 99), 0),
        weevil_risk: weightedPick([['low', 0.65], ['medium', 0.28], ['high', 0.07]]), irrigation: a.irrigation,
      });
    }
  }
  return rows;
}
function reportWater(zoneId) {
  return scopeFarms(zoneId).map((f) => {
    const consumed = Math.round(f.water.monthly * (0.9 + hash01(f.id, 'wu') * 0.28));
    return {
      farm_id: f.id, farm_uid: f.uid, zone_name: zoneName(f.zone_id), holding_area_du: round(f.du, 1), allocated_m3: f.water.allocation,
      consumed_m3: consumed, net_balance_m3: f.water.allocation - consumed, ier: f.ier,
    };
  });
}
const STRUCT_CATEGORY = {
  residential: 'Residential', labour_housing: 'Residential', animal_pens: 'Livestock', warehouse: 'Storage & Logistics', machine_storage: 'Storage & Logistics',
  water_storage: 'Irrigation & Utilities', irrigation_utilities: 'Irrigation & Utilities', commercial: 'Commercial', vehicle_road: 'Storage & Logistics',
  shade_house: 'Protected Agriculture', open_shed: 'Protected Agriculture', hydroponics: 'Protected Agriculture',
};
const STRUCT_TYPE_LABEL = {
  residential: 'Farm Residence', labour_housing: 'Labour Accommodation', animal_pens: 'Livestock Enclosure', warehouse: 'Storage Warehouse',
  machine_storage: 'Machinery Shed', water_storage: 'Water Tank / Reservoir', irrigation_utilities: 'Pump House & Utilities', commercial: 'Packing & Retail Unit',
  vehicle_road: 'Access Road', shade_house: 'Shade House', open_shed: 'Open Shed', hydroponics: 'Hydroponic Unit',
};
function reportStructures(zoneId) {
  return STRUCTS.filter((s) => zoneId == null || FARM_BY_ID.get(s.farm_id).zone_id === zoneId).map((s, idx) => {
    const farm = FARM_BY_ID.get(s.farm_id);
    return {
      structure_id: s.id, farm_id: s.farm_id, farm_uid: s.farm_uid, name: `${s.type} ${String.fromCharCode(65 + (idx % 4))}`, code: s.code,
      category: STRUCT_CATEGORY[s.key] || 'Other', structure_type: STRUCT_TYPE_LABEL[s.key] || s.type, area_du: round(s.du, 2), condition: s.condition,
      permit_status: s.permit, built_year: s.built_year, cadastre_code: `CAD-${String(farm.digits).slice(-4)}-${String(s.id).padStart(3, '0')}`,
    };
  });
}
function reportSummary(zoneId) {
  const lu = landUseSummary(zoneId);
  const arable = lu.classes.filter((c) => ['open_agriculture', 'protected_agriculture'].includes(c.class)).reduce((a, c) => a + c.area_du, 0);
  const yieldT = scopeFarms(zoneId).reduce((a, f) => a + f.yield_total * wa(f), 0);
  const adv = enterpriseKpi('advisories', zoneId).value;
  return { arable_area_du: round(arable, 0), forecast_yield_t: round(yieldT, 0), active_advisories: adv };
}

/* --- Misc --- */
function csv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
function featureCollection(farms) {
  return {
    type: 'FeatureCollection',
    features: farms.map((f) => ({
      type: 'Feature', id: f.id, geometry: { type: 'Polygon', coordinates: [f.ring.map(([x, y]) => fromMerc(x, y))] },
      properties: { uid: f.uid, name: f.name, area_dunum: round(f.du, 2), zone: zoneName(f.zone_id) },
    })),
  };
}
function miniPdf(title) {
  const text = `BT /F1 20 Tf 60 760 Td (${title.replace(/[()\\]/g, '')}) Tj ET\nBT /F1 11 Tf 60 730 Td (Generated by the RASAD local mock backend.) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/* ------------------------------------------------------------------------------------------------
 * Router
 * ---------------------------------------------------------------------------------------------- */

const routes = [];
function route(method, pattern, handler) {
  const re = pattern instanceof RegExp ? pattern : new RegExp('^' + pattern.replace(/:[a-zA-Z_]+/g, '([^/]+)') + '$');
  routes.push({ method, re, handler });
}
const ENVELOPE = (data, message = 'OK') => ({ status: 'success', message, status_code: 200, error_code: null, data, timestamp: isoNow() });
const qn = (v) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const zoneOf = (ctx) => qn(ctx.query.zone_id);
const farmOr404 = (ctx, id) => {
  const farm = FARM_BY_ID.get(Number(id));
  if (!farm) {
    ctx.json(404, { status: 'error', message: `Farm ${id} not found`, status_code: 404, error_code: 'NOT_FOUND' });
    return null;
  }
  return farm;
};
const farmFromQuery = (ctx) => {
  const field = ctx.query.field_id ? FIELD_BY_ID.get(Number(ctx.query.field_id)) : null;
  return (field && FARM_BY_ID.get(field.farm_id)) || FARM_BY_ID.get(Number(ctx.query.farm_id)) || FARMS[0];
};
const ok = (ctx, data, msg) => ctx.json(200, ENVELOPE(data, msg));

const API = '/api/v1';

/* ---- health ---- */
route('GET', '/farm-service/ready', (ctx) => ctx.json(200, { status: 'ready', checks: { database: true, cache: true } }));
route('GET', '/__mock/health', (ctx) => ctx.json(200, { status: 'ok', farms: FARMS.length, fields: FIELDS.length }));
route('GET', '/__mock/tokens', (ctx) => ctx.json(200, { access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN }));

/* ---- auth ---- */
const tokenData = () => ({ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN, token_type: 'bearer', expires_in: 31536000, user: { id: 1, name: PROFILE.name, role_name: PROFILE.role_name } });
route('POST', `${API}/auth/login`, (ctx) => ok(ctx, tokenData(), 'Login successful'));
route('POST', `${API}/auth/refresh`, (ctx) => ok(ctx, tokenData(), 'Token refreshed'));
route('POST', `${API}/auth/logout`, (ctx) => ok(ctx, null, 'Logged out'));
route('POST', `${API}/auth/signup`, (ctx) => ok(ctx, { id: 1 }, 'Registered'));
route('POST', `${API}/auth/activate`, (ctx) => ok(ctx, tokenData(), 'Activated'));
route('PUT', `${API}/auth/password-reset`, (ctx) => ok(ctx, null, 'Password reset'));
route('DELETE', `${API}/auth/delete-account`, (ctx) => ok(ctx, null, 'Account deleted'));
route('POST', `${API}/auth/send-otp`, (ctx) => ok(ctx, { sent: true }, 'OTP sent'));
route('POST', `${API}/otp/send`, (ctx) => ok(ctx, { sent: true }, 'OTP sent'));
route('POST', `${API}/otp/verify`, (ctx) => ok(ctx, { verification_token: 'mock-verification-token' }, 'Verified'));
route('GET', `${API}/profile`, (ctx) => ok(ctx, PROFILE));
route('PUT', `${API}/profile/update`, (ctx) => {
  const b = ctx.body || {};
  for (const k of ['name', 'unit', 'timezone', 'city', 'state', 'country', 'postcode']) if (typeof b[k] === 'string') PROFILE[k] = b[k];
  if (typeof b.is_notification_enabled === 'boolean') PROFILE.notification_active = b.is_notification_enabled;
  ok(ctx, PROFILE, 'Profile updated');
});
route('PUT', `${API}/profile/preferences`, (ctx) => {
  const b = ctx.body || {};
  for (const k of ['area_unit', 'coord_format', 'locale']) if (typeof b[k] === 'string') PROFILE.preferences[k] = b[k];
  ok(ctx, PROFILE.preferences, 'Preferences saved');
});
for (const p of ['email', 'phone', 'password']) route('PUT', `${API}/profile/${p}`, (ctx) => ok(ctx, null, 'Updated'));

/* ---- farm-service ---- */
route('GET', `${API}/zones`, (ctx) => ok(ctx, ZONES));
route('GET', `${API}/farms`, (ctx) => {
  const limit = qn(ctx.query.limit) ?? 100,
    offset = qn(ctx.query.offset) ?? 0;
  const zone = zoneOf(ctx);
  const list = FARMS.filter((f) => zone === null || f.zone_id === zone).map(farmRecord);
  ok(ctx, list.slice(offset, offset + limit));
});
route('GET', `${API}/fields`, (ctx) => {
  const limit = qn(ctx.query.limit) ?? 100,
    offset = qn(ctx.query.offset) ?? 0;
  const farmId = qn(ctx.query.farm_id);
  const list = FIELDS.filter((f) => farmId === null || f.farm_id === farmId).map(fieldRecord);
  ok(ctx, list.slice(offset, offset + limit));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)/fields/(\\d+)/monitoring$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (!farm) return;
  const field = farm.fields.find((f) => f.id === Number(ctx.params[1]));
  if (!field) return ctx.json(404, { status: 'error', message: 'Field not found', status_code: 404 });
  ok(ctx, fieldMonitoring(farm, field));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)/monitoring$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ok(ctx, farmMonitoring(farm));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)/tree-health/score$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ok(ctx, treeHealthScore(farm));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)/tree-health/monitoring$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ok(ctx, treeHealthMonitoring(farm, qn(ctx.query.page) || 1, qn(ctx.query.size) || 50));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)/ier$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ok(ctx, farmIer(farm));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)/dossier$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ctx.send(200, { 'Content-Type': 'application/pdf' }, miniPdf(`Farm dossier ${farm.uid}`));
});
route('GET', new RegExp(`^${API}/farms/(\\d+)$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ok(ctx, farmRecord(farm));
});
route('GET', `${API}/analytics/portfolio-summary`, (ctx) => ok(ctx, portfolioSummary(zoneOf(ctx))));
const MODEL_VERSIONS = (kind) => [
  { id: 3, model_name: `${kind}-detect`, version: 'v7.2', approval_status: 'approved', is_default: true, tree_count: 33210554, field_count: 131204 },
  { id: 2, model_name: `${kind}-detect`, version: 'v6.8', approval_status: 'approved', is_default: false, tree_count: 31984120, field_count: 128771 },
  { id: 1, model_name: `${kind}-detect`, version: 'v5.4', approval_status: 'superseded', is_default: false, tree_count: 29770031, field_count: 120433 },
];
route('GET', `${API}/analytics/field-model-versions`, (ctx) => ok(ctx, MODEL_VERSIONS('field')));
route('GET', `${API}/analytics/tree-model-versions`, (ctx) => ok(ctx, MODEL_VERSIONS('tree')));

/* ---- analytics ---- */
route('GET', `${API}/analytics/land-use`, (ctx) => ok(ctx, landUseSummary(zoneOf(ctx))));
route('GET', new RegExp(`^${API}/analytics/land-use/([a-z_]+)/breakdown$`), (ctx) => ok(ctx, landUseBreakdown(zoneOf(ctx), ctx.params[0])));
route('GET', new RegExp(`^${API}/analytics/domains/([a-z_]+)$`), (ctx) => {
  const d = domainSummary(zoneOf(ctx), ctx.params[0]);
  if (!d) return ctx.json(404, { status: 'error', message: 'Unknown domain', status_code: 404 });
  ok(ctx, d);
});
route('GET', `${API}/analytics/trees`, (ctx) => ok(ctx, treeSummary(zoneOf(ctx))));
route('GET', `${API}/analytics/trees/species`, (ctx) => ok(ctx, speciesSummary(zoneOf(ctx), ctx.query.category || null)));
route('GET', `${API}/analytics/crops`, (ctx) => ok(ctx, cropSummary(zoneOf(ctx), ctx.query.group_by)));
route('GET', `${API}/analytics/structures`, (ctx) => ok(ctx, structuresSummary(zoneOf(ctx))));
route('GET', `${API}/analytics/farm-rankings`, (ctx) =>
  ok(ctx, farmRankings(zoneOf(ctx), ctx.query.metric || 'ier', ctx.query.order || 'top', ctx.query.q, qn(ctx.query.limit) || 10)),
);
route('GET', `${API}/analytics/vegetation-status`, (ctx) => {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7) - 1);
  const start = new Date(end.getTime() - 6 * DAY);
  const lu = landUseSummary(null);
  const open = lu.classes.find((c) => c.class === 'open_agriculture').area_du;
  const fallow = lu.classes.find((c) => c.class === 'fallow_land').area_du;
  const assessed = open + fallow;
  const vegDu = open * 0.86;
  const fallowDu = assessed - vegDu;
  ok(ctx, {
    week_start: isoDate(start), week_end: isoDate(end),
    vegetated: { area_ha: du2ha(vegDu), area_du: round(vegDu, 1), pct: round((vegDu / assessed) * 100, 1) },
    fallow: { area_ha: du2ha(fallowDu), area_du: round(fallowDu, 1), pct: round((fallowDu / assessed) * 100, 1) },
  });
});
route('GET', new RegExp(`^${API}/analytics/([a-z-]+)/export$`), (ctx) => {
  const dataset = ctx.params[0];
  const zone = zoneOf(ctx);
  if (ctx.query.format === 'geojson') return ctx.json(200, featureCollection(scopeFarms(zone)));
  let rows;
  if (dataset === 'land-use') rows = landUseSummary(zone).classes;
  else if (dataset === 'crops') rows = cropSummary(zone, 'crop').crops;
  else if (dataset === 'trees' || dataset === 'species') rows = speciesSummary(zone, null).rows;
  else rows = [];
  ctx.send(200, { 'Content-Type': 'text/csv; charset=utf-8' }, csv(rows));
});

/* ---- Farm-page deep dives ---- */
route('GET', `${API}/advisories/summary`, (ctx) => ok(ctx, enterpriseKpi('advisories', zoneOf(ctx))));
route('GET', `${API}/ier/enterprise/summary`, (ctx) => ok(ctx, enterpriseKpi('ier', zoneOf(ctx))));
route('GET', `${API}/enterprise/yield-forecast`, (ctx) => ok(ctx, enterpriseKpi('yield', zoneOf(ctx))));
route('GET', `${API}/tree-health/enterprise-summary`, (ctx) => ok(ctx, enterpriseKpi('treeHealth', zoneOf(ctx))));
route('GET', `${API}/tree-health/distribution`, (ctx) => ok(ctx, canopyDistribution(zoneOf(ctx))));
route('GET', `${API}/tree-health/farm-health-rankings`, (ctx) => {
  const rows = scopeFarms(zoneOf(ctx)).filter((f) => f.has_palms).map((f) => ({
    farm_id: String(f.id), farm_uid: f.uid, zone_id: f.zone_id, average_canopy_health_index: f.chi, health_status: chiStatus(f.chi),
    trees_scored: Math.round(f.palm_count * 0.93), latest_capture_date: isoDate(daysAgo(2)),
  })).sort((a, b) => b.average_canopy_health_index - a.average_canopy_health_index);
  ok(ctx, { rows: rows.slice(0, qn(ctx.query.limit) || 500), calibration_status: 'calibrated' });
});
route('GET', `${API}/irrigation/water-calculator/summary`, (ctx) => ok(ctx, waterSummary(null)));
route('GET', `${API}/irrigation/water-calculator/farm-totals`, (ctx) =>
  ok(ctx, {
    rows: FARMS.map((f) => ({
      farm_id: f.uid, farm_name: f.name, region: zoneName(f.zone_id), area_dunums: round(f.du, 1), daily_demand_m3: f.water.daily,
      weekly_demand_m3: f.water.weekly, monthly_demand_m3: f.water.monthly, allocation_m3: f.water.allocation,
    })),
  }),
);
route('GET', new RegExp(`^${API}/irrigation/water-calculator/farms/([^/]+)$`), (ctx) => {
  const farm = FARM_BY_UID.get(decodeURIComponent(ctx.params[0]));
  if (!farm) return ctx.json(404, { status: 'error', message: 'Farm not found', status_code: 404 });
  ok(ctx, farmWater(farm));
});
route('GET', new RegExp(`^${API}/yield-forecast/farms/(\\d+)/fields$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ok(ctx, farmYieldFields(farm));
});
route('GET', `${API}/iot/sensors/summary`, (ctx) => {
  const z = zoneOf(ctx);
  const n = scopeFarms(z).reduce((a, f) => a + wc(f), 0);
  const installed = Math.round(n * 0.34);
  ok(ctx, { installed, online: Math.round(installed * 0.94), alerts: Math.round(installed * 0.03) });
});
route('GET', `${API}/search`, (ctx) => {
  const q = String(ctx.query.q || '').trim().toLowerCase();
  const results = [];
  if (q.length >= 2) {
    for (const f of FARMS) {
      if (`${f.name} ${f.uid} ${f.owner_name}`.toLowerCase().includes(q)) {
        results.push({ type: 'farm', id: f.id, uid: f.uid, owner_name: f.owner_name, zone_name: zoneName(f.zone_id), label: f.name, farm_id: null, centroid: f.centroid.map((v) => round(v, 6)) });
      }
    }
    for (const fl of FIELDS) {
      if (fl.uid.toLowerCase().includes(q)) {
        const f = FARM_BY_ID.get(fl.farm_id);
        results.push({ type: 'field', id: fl.id, uid: fl.uid, owner_name: f.owner_name, zone_name: zoneName(f.zone_id), label: `${fl.name} · ${f.name}`, farm_id: f.id, centroid: fl.centroid.map((v) => round(v, 6)) });
      }
    }
  }
  ok(ctx, { results: results.slice(0, 20) });
});

/* ---- Reports ---- */
route('GET', `${API}/reports/summary`, (ctx) => ok(ctx, reportSummary(zoneOf(ctx))));
route('GET', `${API}/reports/farms`, (ctx) => ok(ctx, { rows: reportFarms(zoneOf(ctx)) }));
route('GET', `${API}/reports/fields`, (ctx) => ok(ctx, { rows: reportFields(zoneOf(ctx)) }));
route('GET', `${API}/reports/crops`, (ctx) => ok(ctx, { rows: reportCrops(zoneOf(ctx)) }));
route('GET', `${API}/reports/date-cultivars`, (ctx) => ok(ctx, { rows: reportCultivars(zoneOf(ctx)) }));
route('GET', `${API}/reports/water-quota`, (ctx) => ok(ctx, { rows: reportWater(zoneOf(ctx)) }));
route('GET', `${API}/reports/structures`, (ctx) => ok(ctx, { rows: reportStructures(zoneOf(ctx)) }));
route('GET', new RegExp(`^${API}/reports/farms/(\\d+)/dossier$`), (ctx) => {
  const farm = farmOr404(ctx, ctx.params[0]);
  if (farm) ctx.send(200, { 'Content-Type': 'application/pdf' }, miniPdf(`Farm dossier ${farm.uid}`));
});
route('GET', new RegExp(`^${API}/reports/([a-z-]+)/export$`), (ctx) => {
  const type = ctx.params[0];
  const zone = zoneOf(ctx);
  if (ctx.query.format === 'geojson') return ctx.json(200, featureCollection(scopeFarms(zone)));
  const rows = { farms: reportFarms, fields: reportFields, crops: reportCrops, 'date-cultivars': reportCultivars, 'water-quota': reportWater, structures: reportStructures }[type];
  ctx.send(200, { 'Content-Type': 'text/csv; charset=utf-8' }, csv(rows ? rows(zone) : []));
});

/* ---- Weather ---- */
route('GET', `${API}`, (ctx) => ok(ctx, currentWeather(farmFromQuery(ctx))));
route('GET', `${API}/day-forecast`, (ctx) => ok(ctx, dayForecast(farmFromQuery(ctx))));
route('GET', `${API}/soil-water-content`, (ctx) => ok(ctx, soilWater(farmFromQuery(ctx))));
route('GET', `${API}/minutecast`, (ctx) => ok(ctx, minuteCast()));

/* ---- Satellite ---- */
route('GET', '/satellite', (ctx) => ok(ctx, satelliteCatalog(farmFromQuery(ctx))));
route('GET', '/satellite/indices', (ctx) => ok(ctx, satelliteIndices(ctx.query.satellite)));
route('GET', '/satellite/dates', (ctx) => {
  const farm = farmFromQuery(ctx);
  const start = ctx.query.start_date || isoDate(daysAgo(365));
  const end = ctx.query.end_date || isoDate(new Date());
  const cloud = qn(ctx.query.cloud_cover) ?? 100;
  const sats = ctx.query.satellite ? String(ctx.query.satellite).split(',') : Object.keys(SATELLITES);
  const items = [];
  for (const sat of sats) {
    if (!SATELLITES[sat]) continue;
    for (const p of passesFor(farm, sat)) {
      const day = p.datetime.slice(0, 10);
      if (day >= start && day <= end && p.cloud_cover <= cloud) items.push(p);
    }
  }
  items.sort((a, b) => b.datetime.localeCompare(a.datetime));
  ok(ctx, items);
});
route('GET', '/satellite/next-acquisition', (ctx) => {
  const farm = farmFromQuery(ctx);
  ok(ctx, Object.entries(SATELLITES).map(([sat, def]) => {
    const last = passesFor(farm, sat)[0];
    return {
      satellite: sat, last_pass_date: last.datetime.slice(0, 10),
      next_estimated_date: isoDate(new Date(new Date(last.datetime).getTime() + def.repeat * DAY)), repeat_cycle_days: def.repeat,
    };
  }));
});
route('GET', '/satellite/field-imagery', (ctx) => {
  const farm = farmFromQuery(ctx);
  ok(ctx, fieldImagery(farm, ctx.query.satellite || 'S1', ctx.query.index || 'NDVI', ctx.query.satellite_date || ''));
});

/* ---- legacy (apiRequest) backend: only the enterprise-farmers list is reachable from the UI ---- */
route('GET', '/enterprise/farmers', (ctx) => ctx.json(200, { items: [], total: 0, page: 1, size: 15, pages: 0 }));

/* ---- Geo proxy ---- */
route('GET', '/api/geo/wfs', handleWfs);
route('GET', '/api/geo/wms', handleWms);
route('POST', '/api/geo/wfs', handleWfs);

/* ------------------------------------------------------------------------------------------------
 * Request entry point (called by the service worker)
 * ---------------------------------------------------------------------------------------------- */

function parseBody(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

/** handle('GET', '/api/v1/profile/?x=1', bodyText) -> { status, headers, body } */
export function handle(method, pathAndQuery, bodyText) {
  const url = new URL(pathAndQuery, 'http://mock.local');
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  const query = {};
  for (const [k, v] of url.searchParams) query[k] = v;
  const m = method === 'HEAD' ? 'GET' : method;
  const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m) ? parseBody(bodyText) : null;
  let result = null;
  const ctx = {
    url, query, body, params: [],
    send(status, headers, payload) {
      result = { status, headers, body: payload };
    },
    json(status, data) {
      this.send(status, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(data));
    },
  };
  for (const r of routes) {
    if (r.method !== m) continue;
    const match = r.re.exec(path);
    if (!match) continue;
    ctx.params = match.slice(1);
    try {
      r.handler(ctx);
    } catch (err) {
      console.error('mock error', method, pathAndQuery, err);
      ctx.json(500, { status: 'error', message: 'Mock server error', status_code: 500, detail: String(err) });
    }
    return result;
  }
  console.warn('UNMOCKED', method, pathAndQuery);
  ctx.json(404, { status: 'error', message: `No mock for ${method} ${path}`, status_code: 404, error_code: 'UNMOCKED' });
  return result;
}

export { FARMS, WFS_LAYERS, CULTIVARS, localToMerc, ringExtent, hash01 };
