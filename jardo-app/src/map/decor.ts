// Éléments dessinés communs aux modèles de scène, dans la palette de la charte. Chaque fonction
// dessine un élément à une position donnée, en mètres. Le jardin est dessiné avec `pal` ; le
// décor autour (voisins, champs) avec `ctx`, des teintes passées qui laissent le jardin au
// premier plan.

import { depth, desaturate, mix, Painter, SHADOW_DIRECTION, solid, type Face, type Point } from './scene';

const DAY = {
  lawnA: '#B3D6A9', lawnB: '#A9CF9F', meadow: '#B5D7A8', meadowDark: '#9CC58F', terrace: '#E8E3D4', terraceLine: '#D3CBB6',
  gravel: '#E5DFD0', plot: '#DCD2BA', edging: '#A68D68', mulch: '#B39B76', stone: '#D9D3C3', stoneEdge: '#BBB29E',
  road: '#A9AEA7', roadLine: '#EDEDE6',
  wall: '#F4F0E3', plinth: '#DAD3BF', roof: '#BA7149', roofLine: '#955634', pipe: '#8A8E86',
  frame: '#FBFAF5', glass: '#A6C3CE', glassHi: '#E0ECF0', lampBox: '#3C4842', door: '#5D8C6D',
  brick: '#BD8360', brickTop: '#D3A483', mortar: '#E2C5A8',
  wood: '#B4895A', woodDark: '#78593B', soilBed: '#694B34', crop: '#7FB36F',
  leaf: '#5EA864', leafDark: '#3E8A4B', leafLight: '#A5D6A7', lettuce: '#C6E5B5', trunk: '#76573B',
  apple: '#C3473A', berry: '#B3313F', tomato: '#D1533B', pepper: '#C0402F', flower: '#E8BD48', aubergine: '#5A3C69',
  shed: '#8EB899', shedPlank: '#76A483', shedRoof: '#4E6358',
  ghGlass: '#E3F1F1', ghFrame: '#F8F9F4', ghFloor: '#D2C8AD',
  pot: '#CF8E5B', potRim: '#AE6F3E', sprout: '#2E7D32', sprout2: '#81C784',
  fence: '#C7A87E', fenceTop: '#D8BD96', fenceLine: '#A3845B',
  bark: '#8B694A', logSide: '#A37C56', logEnd: '#E1C094', logRing: '#A7774A',
  metal: '#ECEAE2', can: '#6E9F94', canDark: '#557F76', barrow: '#4F8A5C', tyre: '#3A3F3B',
  water: '#9CC9D6', waterNight: '#123B45', shadow: '#1E3A24',
};

export type Palette = typeof DAY;

export const WINDOW_LIT = '#F6C76E';
export const GLOW = '#F4C76F';
const FIREFLY = '#F7E39A';

const night = (c: string) => mix(desaturate(c, 0.35), '#0A2B31', 0.55);
const context = (c: string) => mix(desaturate(c, 0.45), '#EEF4EC', 0.3);
const contextNight = (c: string) => mix(night(desaturate(c, 0.45)), '#08222A', 0.45);

const mapPalette = (convert: (c: string) => string) =>
  Object.fromEntries(Object.entries(DAY).map(([k, v]) => [k, convert(v)])) as Palette;

export type Kit = { p: Painter; pal: Palette; ctx: Palette; isNight: boolean };

export function createKit(isNight: boolean): Kit {
  return {
    p: new Painter(isNight ? '#04161A' : '#24321F', isNight ? '#031013' : '#1F2A1A'),
    pal: mapPalette(isNight ? night : (c) => c),
    ctx: mapPalette(isNight ? contextNight : context),
    isNight,
  };
}

export const rectFootprint = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0], [x1, y0], [x1, y1], [x0, y1],
];

type Vec3 = [number, number, number];

/** Pseudo-hasard reproductible : la scène est identique d'un lancement à l'autre. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------- Maisons ----------

/** Fenêtre d'une façade : début et fin le long du mur, bas et haut, allumée la nuit. */
export type HouseWindow = [number, number, number, number, boolean];

type House = {
  x0: number; x1: number; y0: number; y1: number;
  /** Hauteur des murs et du faîtage. */
  h: number; ridge: number;
  /** Pignon : faîtage sur toute la longueur ; croupe : toit à quatre pans. */
  roof?: 'gable' | 'hip';
  /** Fenêtres de la façade côté jardin (y1) et du pignon gauche (x0). */
  windows: HouseWindow[];
  sideWindows?: HouseWindow[];
  door?: [number, number];
  chimney?: [number, number];
};

export function drawHouse({ p, isNight }: Kit, pal: Palette, house: House) {
  const { x0, x1, y0, y1, h, ridge: zr, roof = 'gable' } = house;
  const ym = (y0 + y1) / 2;
  const center: Vec3 = [(x0 + x1) / 2, ym, h / 2];
  const wall = pal.wall;
  const o = 0.35;
  // Croupe : les pans des pignons montent à 45° jusqu'au faîtage.
  const inset = roof === 'hip' ? Math.min((y1 - y0) / 2, (x1 - x0) / 2 - 0.2) : 0;
  const walls: Face[] = roof === 'hip'
    ? [
      { points: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], color: wall },
      { points: [[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], color: wall },
      { points: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], color: wall },
      { points: [[x1, y0, 0], [x1, y0, h], [x1, y1, h], [x1, y1, 0]], color: wall },
    ]
    : [
      { points: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], color: wall },
      { points: [[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], color: wall },
      { points: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, ym, zr], [x0, y0, h]], color: wall },
      { points: [[x1, y0, 0], [x1, y0, h], [x1, ym, zr], [x1, y1, h], [x1, y1, 0]], color: wall },
    ];
  const e = h - 0.25;
  const roofFaces: Face[] = roof === 'hip'
    ? [
      { points: [[x0 + inset, ym, zr], [x1 - inset, ym, zr], [x1 + o, y1 + o, e], [x0 - o, y1 + o, e]], color: pal.roof },
      { points: [[x0 - o, y0 - o, e], [x1 + o, y0 - o, e], [x1 - inset, ym, zr], [x0 + inset, ym, zr]], color: pal.roof },
      { points: [[x0 - o, y0 - o, e], [x0 + inset, ym, zr], [x0 - o, y1 + o, e]], color: pal.roof },
      { points: [[x1 + o, y0 - o, e], [x1 + o, y1 + o, e], [x1 - inset, ym, zr]], color: pal.roof },
    ]
    : [
      { points: [[x0, ym, zr], [x1, ym, zr], [x1, y1 + o, e], [x0, y1 + o, e]], color: pal.roof },
      { points: [[x0, y0 - o, e], [x1, y0 - o, e], [x1, ym, zr], [x0, ym, zr]], color: pal.roof },
    ];

  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), zr * 0.8, pal.shadow, 0.12));
  p.object(depth((x0 + x1) / 2, ym), () => {
    p.faces(solid(walls, center));
    const front = (xa: number, xb: number, za: number, zb: number, fill: string, extra?: { stroke?: string; strokeWidth?: number }) =>
      p.polygon([[xa, y1 + 0.01, za], [xb, y1 + 0.01, za], [xb, y1 + 0.01, zb], [xa, y1 + 0.01, zb]], fill, extra);
    const side = (ya: number, yb: number, za: number, zb: number, fill: string, extra?: { stroke?: string; strokeWidth?: number }) =>
      p.polygon([[x0 - 0.01, ya, za], [x0 - 0.01, yb, za], [x0 - 0.01, yb, zb], [x0 - 0.01, ya, zb]], fill, extra);
    front(x0, x1, 0, 0.35, p.shadeFace(pal.plinth, [0, 1, 0]));
    if (roof === 'hip') side(y0, y1, 0, 0.35, p.shadeFace(pal.plinth, [-1, 0, 0]));

    const glazing = (draw: typeof front, normal: Vec3, [a, b, za, zb, lit]: HouseWindow) => {
      draw(a, b, za, zb, p.shadeFace(pal.frame, normal), { stroke: p.edgeOf(pal.frame), strokeWidth: 0.6 });
      const pw = (b - a - 0.3) / 2;
      for (let i = 0; i < 2; i++) {
        const pa = a + 0.1 + i * (pw + 0.1);
        draw(pa, pa + pw, za + 0.1, zb - 0.1, isNight && lit ? WINDOW_LIT : pal.glass);
      }
    };
    for (const w of house.windows) {
      glazing(front, [0, 1, 0], w);
      if (!isNight) {
        const pw = (w[1] - w[0] - 0.3) / 2;
        p.line([w[0] + 0.2, y1 + 0.01, w[2] + 0.35], [w[0] + 0.1 + pw * 0.6, y1 + 0.01, w[3] - 0.2], pal.glassHi, 1.1, 0.8);
      }
    }
    for (const w of house.sideWindows ?? []) glazing(side, [-1, 0, 0], w);
    if (house.door) {
      const [a, b] = house.door;
      front(a, b, 0, 2.1, p.shadeFace(pal.door, [0, 1, 0]), { stroke: p.edgeOf(pal.door), strokeWidth: 0.7 });
    }

    p.faces(solid(roofFaces, center));
    if (roof === 'gable') {
      for (let t = 0.12; t < 1; t += 0.13) {
        const y = ym + (y1 + o - ym) * t;
        const z = zr + (e - zr) * t;
        p.line([x0, y, z], [x1, y, z], pal.roofLine, 0.7, 0.55);
      }
    } else {
      for (let t = 0.15; t < 1; t += 0.15) {
        const y = ym + (y1 + o - ym) * t;
        const z = zr + (e - zr) * t;
        p.line([x0 + inset - (inset + o) * t, y, z], [x1 - inset + (inset + o) * t, y, z], pal.roofLine, 0.7, 0.55);
      }
    }
    p.line([x0 + inset, ym, zr], [x1 - inset, ym, zr], pal.roofLine, 1.4);
    if (house.chimney) {
      const [cx0, cx1] = house.chimney;
      p.box(cx0, ym - 0.9, zr - 0.35, cx1, ym - 0.3, zr + 0.85, { top: pal.brickTop, side: pal.brick });
    }
  });

  if (isNight) {
    p.layer(p.lights, () => {
      for (const [a, b, za, zb, lit] of house.windows) if (lit) p.glow((a + b) / 2, y1 + 0.05, (za + zb) / 2, 1.5, GLOW, 0.85);
      for (const [a, b, za, zb, lit] of house.sideWindows ?? []) if (lit) p.glow(x0 - 0.05, (a + b) / 2, (za + zb) / 2, 1.5, GLOW, 0.85);
    });
  }
}

// ---------- Végétation ----------

export function drawTree(
  { p }: Kit,
  pal: Palette,
  x: number,
  y: number,
  options: { r?: number; trunk?: number; fruit?: string } = {},
) {
  const r = options.r ?? 1.45;
  const trunkH = options.trunk ?? 1.7;
  const cz = trunkH + r * 0.75;
  p.layer(p.shadows, () =>
    p.ellipseGround(x + SHADOW_DIRECTION[0] * cz * 0.6, y + SHADOW_DIRECTION[1] * cz * 0.6, 0, r * 1.05, r * 0.85, pal.shadow, { opacity: 0.17 }),
  );
  p.object(depth(x, y), () => {
    p.box(x - 0.12, y - 0.12, 0, x + 0.12, y + 0.12, trunkH + 0.4, pal.trunk);
    const lumps: [number, number, number, number, string][] = [
      [-0.55, -0.15, -0.12, 0.62, pal.leafDark],
      [0.55, -0.1, -0.16, 0.6, pal.leafDark],
      [0, 0, 0, 1, pal.leaf],
      [-0.32, 0.28, 0.28, 0.55, pal.leaf],
      [0.36, 0.3, -0.05, 0.5, pal.leaf],
    ];
    lumps
      .sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]))
      .forEach(([dx, dy, dz, rr, col]) => p.leafBall(x + dx * r, y + dy * r, cz + dz * r, rr * r, col));
    p.sphere(x - 0.35 * r, y + 0.1 * r, cz + 0.38 * r, 0.4 * r, pal.leafLight, { opacity: 0.5 });
    if (options.fruit) {
      for (const [dx, dy, dz] of [[0.45, 0.6, -0.2], [-0.5, 0.55, 0.1], [0.1, 0.8, 0.35], [0.7, 0.4, 0.3], [-0.2, 0.75, -0.45], [0.3, 0.7, -0.55], [-0.65, 0.35, -0.3]]) {
        p.sphere(x + dx * r, y + dy * r, cz + dz * r, Math.max(0.07, 0.06 * r), options.fruit);
      }
    }
  });
}

/** Conifère : trois étages de feuillage. */
export function drawConifer({ p }: Kit, pal: Palette, x: number, y: number, h = 4) {
  p.layer(p.shadows, () => p.ellipseGround(x - 0.4, y - 1.0, 0, 0.9, 0.7, pal.shadow, { opacity: 0.15 }));
  p.object(depth(x, y), () => {
    p.box(x - 0.1, y - 0.1, 0, x + 0.1, y + 0.1, h * 0.3, pal.trunk);
    for (const [k, rr, col] of [[0.35, 0.95, pal.leafDark], [0.6, 0.72, pal.leafDark], [0.82, 0.48, pal.leaf]] as const) {
      p.leafBall(x, y, h * k, rr * (h / 4), col);
    }
  });
}

export function drawBush({ p }: Kit, pal: Palette, x: number, y: number, r: number, berry?: string) {
  p.layer(p.shadows, () => p.ellipseGround(x + 0.25, y - 0.45, 0, r * 1.05, r * 0.85, pal.shadow, { opacity: 0.15 }));
  p.object(depth(x, y), () => {
    const cz = r * 0.85;
    for (const [dx, dy, dz, rr, col] of [
      [-0.45, -0.1, -0.1, 0.7, pal.leafDark],
      [0.45, -0.05, -0.12, 0.68, pal.leafDark],
      [0, 0.15, 0.05, 0.85, pal.leaf],
      [-0.15, 0.3, 0.35, 0.5, pal.leafLight],
    ] as const) {
      p.leafBall(x + dx * r, y + dy * r, cz + dz * r, rr * r, col);
    }
    if (berry) {
      for (const [dx, dy, dz] of [[0.3, 0.75, 0], [-0.35, 0.7, 0.2], [0.05, 0.85, -0.3], [0.55, 0.5, 0.25], [-0.6, 0.45, -0.2]]) {
        p.sphere(x + dx * r, y + dy * r, cz + dz * r, 0.06, berry);
      }
    }
  });
}

/** Haie taillée le long de x ou de y, découpée en tronçons pour l'ordre d'affichage. */
export function drawHedge({ p }: Kit, pal: Palette, x0: number, y0: number, x1: number, y1: number, h = 1.1) {
  const alongX = x1 - x0 > y1 - y0;
  const length = alongX ? x1 - x0 : y1 - y0;
  const n = Math.max(1, Math.round(length / 1.5));
  for (let i = 0; i < n; i++) {
    const a = (alongX ? x0 : y0) + (length * i) / n;
    const b = (alongX ? x0 : y0) + (length * (i + 1)) / n;
    const [xa, xb, ya, yb] = alongX ? [a, b, y0, y1] : [x0, x1, a, b];
    p.object(depth((xa + xb) / 2, (ya + yb) / 2), () => {
      p.box(xa, ya, 0, xb, yb, h, { top: pal.leaf, side: pal.leafDark });
      const cx = (xa + xb) / 2;
      const cy = (ya + yb) / 2;
      const r = Math.min(xb - xa, yb - ya) * 0.42;
      for (const t of [-0.3, 0.3]) {
        p.leafBall(alongX ? cx + t * (xb - xa) : cx, alongX ? cy : cy + t * (yb - ya), h + r * 0.15, r, pal.leaf);
      }
    });
  }
}

export function drawField({ p }: Kit, pal: Palette, x0: number, y0: number, x1: number, y1: number, rows: 'x' | 'y') {
  p.layer(p.ground, () => {
    p.rect(x0, y0, x1, y1, 0, pal.plot);
    if (rows === 'x') for (let y = y0 + 0.5; y < y1 - 0.2; y += 0.9) p.line([x0 + 0.3, y, 0.02], [x1 - 0.3, y, 0.02], pal.crop, 2.2);
    else for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.9) p.line([x, y0 + 0.3, 0.02], [x, y1 - 0.3, 0.02], pal.crop, 2.2);
  });
}

// ---------- Jardin ----------

export function drawPot({ p, pal }: Kit, x: number, y: number) {
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x - 0.22, y - 0.22, x + 0.22, y + 0.22), 0.45, pal.shadow, 0.14));
  p.object(depth(x, y), () => {
    p.box(x - 0.22, y - 0.22, 0, x + 0.22, y + 0.22, 0.42, { top: pal.potRim, side: pal.pot });
    p.rect(x - 0.16, y - 0.16, x + 0.16, y + 0.16, 0.425, pal.soilBed);
    p.line([x, y, 0.43], [x, y, 0.66], pal.sprout, 1.2);
    p.leafBall(x - 0.09, y, 0.64, 0.09, pal.sprout);
    p.leafBall(x + 0.1, y, 0.72, 0.12, pal.sprout2);
  });
}

/** Table ronde et deux chaises ; (x, y) est le pied de la table. */
export function drawPatioSet({ p, pal }: Kit, x: number, y: number) {
  p.layer(p.shadows, () => p.ellipseGround(x + 0.3, y - 0.6, 0, 0.6, 0.45, pal.shadow, { opacity: 0.12 }));
  p.object(depth(x, y), () => {
    p.box(x - 0.03, y - 0.03, 0, x + 0.03, y + 0.03, 0.72, pal.woodDark);
    p.ellipseGround(x, y, 0.74, 0.42, 0.42, pal.metal, { stroke: p.edgeOf(pal.metal), strokeWidth: 0.7 });
  }, 0.5);
  const chair = (cx: number, cy: number, back: number) =>
    p.object(depth(cx + 0.18, cy + 0.18), () => {
      p.box(cx + 0.15, cy + 0.15, 0, cx + 0.21, cy + 0.21, 0.42, pal.woodDark);
      p.box(cx, cy, 0.42, cx + 0.36, cy + 0.36, 0.47, pal.wood);
      if (back > 0) p.box(cx + 0.3, cy, 0.47, cx + 0.36, cy + 0.36, 0.9, pal.wood);
      else p.box(cx, cy, 0.47, cx + 0.06, cy + 0.36, 0.9, pal.wood);
    });
  chair(x - 0.85, y - 0.18, -1);
  chair(x + 0.5, y - 0.18, 1);
}

/** Banc de jardin le long de x, dossier côté fond ; (x0, y0) est son coin arrière gauche. */
export function drawBench({ p, pal }: Kit, x0: number, y0: number, length = 1.5) {
  const x1 = x0 + length;
  const y1 = y0 + 0.45;
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), 0.6, pal.shadow, 0.13));
  p.object(depth((x0 + x1) / 2, (y0 + y1) / 2), () => {
    for (const x of [x0 + 0.08, x1 - 0.14]) {
      p.box(x, y0, 0, x + 0.06, y0 + 0.06, 0.95, pal.woodDark);
      p.box(x, y1 - 0.1, 0, x + 0.06, y1 - 0.04, 0.42, pal.woodDark);
    }
    p.box(x0, y0 + 0.02, 0.42, x1, y1, 0.47, { top: pal.fenceTop, side: pal.wood });
    for (const z of [0.6, 0.8]) p.box(x0, y0 - 0.02, z, x1, y0 + 0.04, z + 0.12, { top: pal.fenceTop, side: pal.wood });
  });
}

export const GREENHOUSE_SIZE = { w: 2.75, d: 3.6, h: 2.05, ridge: 2.95 };

export function drawGreenhouse({ p, pal, isNight }: Kit, x0: number, y0: number) {
  const { w, d, h, ridge: hr } = GREENHOUSE_SIZE;
  const x1 = x0 + w;
  const y1 = y0 + d;
  const xm = (x0 + x1) / 2;
  const faces = solid([
    { points: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], color: pal.ghGlass, tag: 'wall-l' },
    { points: [[x1, y0, 0], [x1, y0, h], [x1, y1, h], [x1, y1, 0]], color: pal.ghGlass, tag: 'wall-r' },
    { points: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [xm, y1, hr], [x0, y1, h]], color: pal.ghGlass, tag: 'front' },
    { points: [[x0, y0, 0], [x0, y0, h], [xm, y0, hr], [x1, y0, h], [x1, y0, 0]], color: pal.ghGlass, tag: 'back' },
    { points: [[x0, y0, h], [x0, y1, h], [xm, y1, hr], [xm, y0, hr]], color: pal.ghGlass, tag: 'roof-l' },
    { points: [[x1, y0, h], [xm, y0, hr], [xm, y1, hr], [x1, y1, h]], color: pal.ghGlass, tag: 'roof-r' },
  ], [xm, (y0 + y1) / 2, 1.2]);

  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), h, pal.shadow, 0.08));
  p.object(depth(xm, (y0 + y1) / 2), () => {
    const frame = (points: Vec3[], width = 1.1, opacity = 1) =>
      p.polygon(points, undefined, { stroke: pal.ghFrame, strokeWidth: width, opacity });
    p.rect(x0, y0, x1, y1, 0.01, pal.ghFloor);
    for (const f of faces.filter((f) => !f.visible)) {
      p.polygon(f.points, pal.ghGlass, { opacity: 0.2 });
      frame(f.points, 0.8, 0.6);
    }
    for (const y of [y0 + 0.9, y0 + 1.8]) {
      p.line([x0 + 0.65, y, 0.05], [x0 + 0.65, y, 1.95], pal.woodDark, 0.6, 0.7);
      [0.45, 0.85, 1.25, 1.6].forEach((z, i) => p.leafBall(x0 + 0.65 + (i % 2 ? 0.1 : -0.1), y, z, 0.17, pal.leaf));
    }
    p.leafBall(x0 + 1.85, y0 + 2.5, 0.42, 0.3, pal.leafDark);
    p.leafBall(x0 + 2.05, y0 + 2.7, 0.55, 0.22, pal.leaf);
    p.sphere(x0 + 2.02, y0 + 2.85, 0.32, 0.08, pal.aubergine);
    for (const f of faces.filter((f) => f.visible)) {
      p.polygon(f.points, pal.ghGlass, { opacity: isNight ? 0.28 : 0.4 });
      frame(f.points);
      if (f.tag === 'wall-l' || f.tag === 'wall-r') {
        const x = f.tag === 'wall-l' ? x0 : x1;
        for (let i = 1; i < 6; i++) p.line([x, y0 + (d * i) / 6, 0], [x, y0 + (d * i) / 6, h], pal.ghFrame, 0.9);
        p.line([x, y0, 1.0], [x, y1, 1.0], pal.ghFrame, 0.9);
      }
      if (f.tag === 'front') {
        for (let i = 1; i < 5; i++) {
          const x = x0 + (w * i) / 5;
          p.line([x, y1, 0], [x, y1, h + (hr - h) * (1 - Math.abs(x - xm) / (xm - x0))], pal.ghFrame, 0.9);
        }
        p.line([x0, y1, 1.0], [x1, y1, 1.0], pal.ghFrame, 0.9);
        if (!isNight) {
          p.polygon([[x0 + 0.25, y1, 0.2], [x0 + 0.6, y1, 0.2], [x0 + 1.3, y1, 1.9], [x0 + 0.95, y1, 1.9]], '#FFFFFF', { opacity: 0.35 });
        }
      }
      if (f.tag === 'roof-l' || f.tag === 'roof-r') {
        const x = f.tag === 'roof-l' ? x0 : x1;
        for (let i = 1; i < 6; i++) p.line([x, y0 + (d * i) / 6, h], [xm, y0 + (d * i) / 6, hr], pal.ghFrame, 0.9);
      }
    }
  });
}

export type BedPlanting = 'summer' | 'lettuce' | 'leek' | 'seedlings';

/** Carré en bois de 2,6 × 2 m, posé en (x0, y0). */
export function drawBed({ p, pal }: Kit, x0: number, y0: number, planting: BedPlanting) {
  const x1 = x0 + 2.6;
  const y1 = y0 + 2;
  const h = 0.38;
  const rim = 0.09;
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), h, pal.shadow, 0.13));
  p.object(depth((x0 + x1) / 2, (y0 + y1) / 2), () => {
    p.box(x0, y0, 0, x1, y1, h, { top: pal.wood, side: pal.wood });
    p.line([x0, y1, h / 2], [x1, y1, h / 2], pal.woodDark, 0.6, 0.6);
    p.rect(x0 + rim, y0 + rim, x1 - rim, y1 - rim, h + 0.005, pal.soilBed);
    drawPlanting(p, pal, planting, x0, y0, x1, y1);
  });
}

function drawPlanting(p: Painter, pal: Palette, planting: BedPlanting, x0: number, y0: number, x1: number, y1: number) {
  const z0 = 0.38;
  if (planting === 'summer') {
    for (const dx of [0.45, 1.3, 2.15]) {
      const x = x0 + dx;
      const y = y0 + 0.35;
      p.line([x, y, z0], [x, y, 1.55], pal.woodDark, 1.1);
      p.leafBall(x - 0.1, y, 0.75, 0.2, pal.leafDark);
      p.leafBall(x + 0.1, y, 1.0, 0.2, pal.leaf);
      p.leafBall(x - 0.08, y, 1.25, 0.18, pal.leafDark);
      p.leafBall(x + 0.05, y, 1.45, 0.14, pal.leaf);
      for (const [ex, ey, z] of [[0.16, 0.08, 0.85], [-0.15, 0.08, 1.1], [0.14, 0.08, 1.32]]) {
        p.sphere(x + ex, y + ey, z, 0.055, pal.tomato);
      }
    }
    for (const dx of [0.6, 2.0]) {
      const x = x0 + dx;
      const y = y0 + 0.9;
      p.leafBall(x - 0.18, y, 0.55, 0.3, pal.leafDark);
      p.leafBall(x + 0.18, y + 0.02, 0.55, 0.3, pal.leafDark);
      p.leafBall(x, y + 0.12, 0.62, 0.32, pal.leaf);
      p.sphere(x + 0.05, y + 0.25, 0.68, 0.06, pal.flower);
    }
    for (const dx of [0.4, 1.05]) {
      p.leafBall(x0 + dx, y0 + 1.4, 0.62, 0.2, pal.leaf);
      p.sphere(x0 + dx + 0.08, y0 + 1.52, 0.55, 0.07, pal.pepper);
    }
    for (const dx of [1.7, 2.2]) {
      p.leafBall(x0 + dx, y0 + 1.4, 0.5, 0.14, pal.leafDark);
      p.sphere(x0 + dx - 0.04, y0 + 1.42, 0.56, 0.06, pal.leafLight);
    }
    for (const dx of [0.3, 0.8, 1.3, 1.8, 2.3]) {
      p.leafBall(x0 + dx, y0 + 1.75, 0.45, 0.17, pal.leafLight);
      p.sphere(x0 + dx, y0 + 1.78, 0.5, 0.075, pal.lettuce);
    }
  } else if (planting === 'lettuce') {
    for (let row = 0, y = y0 + 0.4; y < y1 - 0.2; y += 0.45, row++) {
      for (let x = x0 + 0.35 + (row % 2) * 0.22; x < x1 - 0.2; x += 0.45) {
        p.leafBall(x, y, 0.47, 0.15, row % 2 ? pal.leafLight : pal.lettuce);
      }
    }
  } else if (planting === 'leek') {
    for (let y = y0 + 0.4; y < y1 - 0.2; y += 0.5) {
      for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.24) {
        p.line([x, y, z0], [x - 0.05, y, 0.85], pal.leafDark, 1.2);
        p.line([x, y, z0], [x + 0.06, y, 0.78], pal.leaf, 1.0);
      }
    }
  } else {
    for (let y = y0 + 0.35; y < y1 - 0.2; y += 0.42) {
      for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.36) p.sphere(x, y, 0.42, 0.06, pal.leafLight);
    }
  }
}

/** Abri à bois de 2,7 × 1,45 m, bûches vers l'observateur ; (x0, y0) est le coin du fond. */
export function drawFirewood({ p, pal }: Kit, x0: number, y0: number) {
  const front = y0 + 1.21;
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x0 + 2.7, y0 + 1.45), 1.4, pal.shadow, 0.15));
  p.object(depth(x0 + 1.35, y0 + 0.7), () => {
    p.box(x0 + 0.15, y0 + 0.15, 0, x0 + 2.55, front, 1.15, { top: pal.bark, side: pal.logSide });
    for (const z of [0.19, 0.53, 0.87]) {
      for (let k = 0; k < 6; k++) {
        const x = x0 + 0.52 + k * 0.37 + (z > 0.5 && z < 0.6 ? 0.06 : 0);
        p.ellipseFront(x, front + 0.01, z, 0.165, pal.logEnd, { stroke: pal.logRing, strokeWidth: 0.8 });
        p.ellipseFront(x, front + 0.015, z, 0.05, pal.logRing, { opacity: 0.7 });
      }
    }
    p.box(x0 + 0.1, y0 + 1.27, 0, x0 + 0.16, y0 + 1.33, 1.32, pal.woodDark);
    p.box(x0 + 2.54, y0 + 1.27, 0, x0 + 2.6, y0 + 1.33, 1.32, pal.woodDark);
    p.box(x0, y0, 1.32, x0 + 2.7, y0 + 1.45, 1.4, { top: pal.shedRoof, side: pal.shedRoof });
  });
}

/** Cabanon de 2,6 × 1,9 m, porte sur le côté gauche. */
export function drawShed({ p, pal, isNight }: Kit, x0: number, y0: number) {
  const x1 = x0 + 2.6;
  const y1 = y0 + 1.9;
  const h = 2.0;
  const xm = x0 + 1.3;
  const hr = 2.75;
  const center: Vec3 = [xm, (y0 + y1) / 2, 1.1];
  const walls = solid([
    { points: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], color: pal.shed, tag: 'l' },
    { points: [[x1, y0, 0], [x1, y0, h], [x1, y1, h], [x1, y1, 0]], color: pal.shed, tag: 'r' },
    { points: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [xm, y1, hr], [x0, y1, h]], color: pal.shed, tag: 'f' },
    { points: [[x0, y0, 0], [x0, y0, h], [xm, y0, hr], [x1, y0, h], [x1, y0, 0]], color: pal.shed, tag: 'b' },
  ], center);
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), h, pal.shadow, 0.15));
  p.object(depth(xm, (y0 + y1) / 2), () => {
    p.faces(walls);
    for (const f of walls.filter((f) => f.visible)) {
      if (f.tag === 'f') {
        for (let x = x0 + 0.26; x < x1; x += 0.26) {
          const zt = h + (hr - h) * (1 - Math.abs(x - xm) / (xm - x0));
          p.line([x, y1 + 0.005, 0], [x, y1 + 0.005, zt], pal.shedPlank, 0.6, 0.6);
        }
      }
      if (f.tag === 'l') {
        for (let y = y0 + 0.26; y < y1; y += 0.26) p.line([x0 - 0.005, y, 0], [x0 - 0.005, y, h], pal.shedPlank, 0.6, 0.6);
        p.polygon([[x0 - 0.01, y0 + 0.45, 0], [x0 - 0.01, y0 + 1.3, 0], [x0 - 0.01, y0 + 1.3, 1.75], [x0 - 0.01, y0 + 0.45, 1.75]],
          p.shadeFace(pal.door, f.normal), { stroke: p.edgeOf(pal.door), strokeWidth: 0.7 });
        p.sphere(x0 - 0.02, y0 + 1.15, 0.9, 0.04, pal.metal);
        p.polygon([[x0 - 0.01, y0 + 1.43, 1.88], [x0 - 0.01, y0 + 1.55, 1.88], [x0 - 0.01, y0 + 1.55, 2.05], [x0 - 0.01, y0 + 1.43, 2.05]],
          isNight ? WINDOW_LIT : pal.lampBox);
      }
    }
    p.polygon([[x0 + 1.0, y1 + 0.01, 1.0], [x0 + 1.75, y1 + 0.01, 1.0], [x0 + 1.75, y1 + 0.01, 1.55], [x0 + 1.0, y1 + 0.01, 1.55]], pal.glass,
      { stroke: pal.frame, strokeWidth: 1.2 });
    p.faces(solid([
      { points: [[x0 - 0.15, y0 - 0.12, h - 0.08], [x0 - 0.15, y1 + 0.12, h - 0.08], [xm, y1 + 0.12, hr], [xm, y0 - 0.12, hr]], color: pal.shedRoof },
      { points: [[x1 + 0.15, y0 - 0.12, h - 0.08], [xm, y0 - 0.12, hr], [xm, y1 + 0.12, hr], [x1 + 0.15, y1 + 0.12, h - 0.08]], color: pal.shedRoof },
    ], center));
  });
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(x0 - 0.05, y0 + 1.49, 1.96, 1.0, GLOW, 0.9);
      p.glow(x0 - 0.6, y0 + 0.9, 0, 1.0, GLOW, 0.6, 0.75);
    });
  }
}

/** Abri simple du décor : un volume et un toit plat. */
export function drawOutbuilding({ p }: Kit, pal: Palette, x0: number, y0: number, x1: number, y1: number, h = 1.8) {
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), h, pal.shadow, 0.1));
  p.object(depth((x0 + x1) / 2, (y0 + y1) / 2), () => {
    p.box(x0, y0, 0, x1, y1, h, pal.shed);
    p.box(x0 - 0.1, y0 - 0.1, h, x1 + 0.1, y1 + 0.1, h + 0.15, pal.shedRoof);
  });
}

export function drawWateringCan({ p, pal }: Kit, x: number, y: number) {
  p.layer(p.shadows, () => p.ellipseGround(x, y - 0.1, 0, 0.25, 0.18, pal.shadow, { opacity: 0.15 }));
  p.object(depth(x, y), () => {
    p.box(x - 0.15, y - 0.1, 0, x + 0.15, y + 0.1, 0.28, { top: pal.canDark, side: pal.can });
    p.line([x + 0.15, y, 0.08], [x + 0.42, y, 0.36], pal.canDark, 1.6);
    p.line([x - 0.12, y, 0.28], [x - 0.05, y, 0.42], pal.canDark, 1.2);
    p.line([x - 0.05, y, 0.42], [x + 0.08, y, 0.42], pal.canDark, 1.2);
    p.line([x + 0.08, y, 0.42], [x + 0.12, y, 0.28], pal.canDark, 1.2);
  });
}

export function drawWheelbarrow({ p, pal }: Kit, x: number, y: number) {
  p.layer(p.shadows, () => p.ellipseGround(x, y - 0.2, 0, 0.5, 0.35, pal.shadow, { opacity: 0.14 }));
  p.object(depth(x, y), () => {
    p.line([x - 0.25, y + 0.55, 0.12], [x - 0.2, y - 0.6, 0.55], pal.woodDark, 1.4);
    p.line([x + 0.25, y + 0.55, 0.12], [x + 0.2, y - 0.6, 0.55], pal.woodDark, 1.4);
    p.polygon([[x - 0.3, y - 0.35, 0.55], [x + 0.3, y - 0.35, 0.55], [x + 0.3, y + 0.4, 0.55], [x - 0.3, y + 0.4, 0.55]], pal.barrow,
      { stroke: p.edgeOf(pal.barrow), strokeWidth: 0.7 });
    p.polygon([[x - 0.3, y + 0.4, 0.55], [x + 0.3, y + 0.4, 0.55], [x + 0.2, y + 0.3, 0.25], [x - 0.2, y + 0.3, 0.25]],
      p.shadeFace(pal.barrow, [0, 1, 0]), { stroke: p.edgeOf(pal.barrow), strokeWidth: 0.7 });
    p.ellipseFront(x, y + 0.62, 0.14, 0.14, pal.tyre);
  });
}

/** Lampadaire, allumé la nuit. */
export function drawLamp({ p, pal, isNight }: Kit, x: number, y: number) {
  p.object(depth(x, y), () => {
    p.box(x - 0.05, y - 0.05, 0, x + 0.05, y + 0.05, 2.6, pal.lampBox);
    p.box(x - 0.16, y - 0.16, 2.6, x + 0.16, y + 0.16, 2.85, isNight ? WINDOW_LIT : pal.glassHi);
    p.box(x - 0.2, y - 0.2, 2.85, x + 0.2, y + 0.2, 2.92, pal.lampBox);
  });
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(x, y, 2.72, 0.9, GLOW, 0.9);
      p.glow(x, y, 0, 1.6, GLOW, 0.45, 0.6);
    });
  }
}

/** Clôture en planches le long de x ou de y. */
export function drawFence({ p }: Kit, pal: Palette, x0: number, y0: number, x1: number, y1: number, h = 0.95) {
  const alongX = x1 - x0 > y1 - y0;
  const length = alongX ? x1 - x0 : y1 - y0;
  const n = Math.max(1, Math.round(length / 1.25));
  for (let i = 0; i < n; i++) {
    const a = (alongX ? x0 : y0) + (length * i) / n;
    const b = (alongX ? x0 : y0) + (length * (i + 1)) / n;
    const [xa, xb, ya, yb] = alongX ? [a, b, y0, y1] : [x0, x1, a, b];
    p.object(depth((xa + xb) / 2, (ya + yb) / 2), () => {
      p.box(xa, ya, 0, xb, yb, h, { top: pal.fenceTop, side: pal.fence });
      if (alongX) for (let x = xa + 0.22; x < xb; x += 0.22) p.line([x, yb + 0.005, 0.03], [x, yb + 0.005, h - 0.02], pal.fenceLine, 0.6, 0.65);
      else for (let y = ya + 0.22; y < yb; y += 0.22) p.line([xa - 0.005, y, 0.03], [xa - 0.005, y, h - 0.02], pal.fenceLine, 0.6, 0.65);
    }, 1);
  }
}

export function drawFireflies({ p }: Kit, points: Vec3[]) {
  p.layer(p.lights, () => {
    for (const [x, y, z] of points) {
      p.glow(x, y, z, 0.28, FIREFLY, 0.7);
      p.sphere(x, y, z, 0.05, FIREFLY, { opacity: 0.9 });
    }
  });
}
