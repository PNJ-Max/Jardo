// Modèle de scène « terraced-long » : maison mitoyenne, jardin en longueur
// (docs/etude-carte-potager.md). Le jardin occupe x de 0 à 8 m et y de 0 à 25 m ; la maison est
// devant (y négatif). Autour, le décor des voisins est dessiné en teintes passées, comme le
// contexte d'une maquette d'architecte, pour que le jardin reste au premier plan.

import {
  contains,
  depth,
  desaturate,
  mix,
  Painter,
  SHADOW_DIRECTION,
  project,
  silhouette,
  solid as solidFaces,
  type Bounds,
  type Point,
  type Shape,
} from './scene';

export const SLOT_KEYS = [
  'orchard',
  'small-fruit',
  'vegetable',
  'bed-1',
  'bed-2',
  'bed-3',
  'bed-4',
  'greenhouse',
  'firewood',
] as const;

export type SlotKey = (typeof SLOT_KEYS)[number];

export type MapScheme = 'light' | 'dark';

export type SceneSlot = {
  /** Contour du dessus de l'emplacement, à l'écran : ce que la sélection met en évidence. */
  outline: Point[];
  /** Silhouette à l'écran : la zone qui répond au toucher. */
  hit: Point[];
};

export type Scene = { shapes: Shape[]; bounds: Bounds; slots: Record<SlotKey, SceneSlot>; background: string };

const DAY = {
  baseTop: '#E4ECE2', baseSide: '#C9D5C6', baseLine: '#B0BFAC',
  lawnA: '#B3D6A9', lawnB: '#A9CF9F', terrace: '#E8E3D4', terraceLine: '#D3CBB6',
  gravel: '#E5DFD0', plot: '#DCD2BA', edging: '#A68D68', mulch: '#B39B76', stone: '#D9D3C3', stoneEdge: '#BBB29E',
  wall: '#F4F0E3', plinth: '#DAD3BF', roof: '#BA7149', roofLine: '#955634', pipe: '#8A8E86',
  frame: '#FBFAF5', glass: '#A6C3CE', glassHi: '#E0ECF0', lampBox: '#3C4842',
  brick: '#BD8360', brickTop: '#D3A483', mortar: '#E2C5A8',
  wood: '#B4895A', woodDark: '#78593B', soilBed: '#694B34',
  leaf: '#5EA864', leafDark: '#3E8A4B', leafLight: '#A5D6A7', lettuce: '#C6E5B5', trunk: '#76573B',
  apple: '#C3473A', berry: '#B3313F', tomato: '#D1533B', pepper: '#C0402F', flower: '#E8BD48', aubergine: '#5A3C69',
  shed: '#8EB899', shedPlank: '#76A483', shedRoof: '#4E6358', door: '#5D8C6D',
  ghGlass: '#E3F1F1', ghFrame: '#F8F9F4', ghFloor: '#D2C8AD',
  pot: '#CF8E5B', potRim: '#AE6F3E', sprout: '#2E7D32', sprout2: '#81C784',
  fence: '#C7A87E', fenceTop: '#D8BD96', fenceLine: '#A3845B',
  bark: '#8B694A', logSide: '#A37C56', logEnd: '#E1C094', logRing: '#A7774A',
  metal: '#ECEAE2', can: '#6E9F94', canDark: '#557F76', barrow: '#4F8A5C', tyre: '#3A3F3B',
  water: '#9CC9D6', shadow: '#1E3A24',
};

type Palette = typeof DAY;

const WINDOW_LIT = '#F6C76E';
const GLOW = '#F4C76F';
const FIREFLY = '#F7E39A';

const night = (c: string) => mix(desaturate(c, 0.35), '#0A2B31', 0.55);
const context = (c: string) => mix(desaturate(c, 0.6), '#EDF3EB', 0.42);
const contextNight = (c: string) => mix(night(desaturate(c, 0.55)), '#0B272C', 0.3);

const mapPalette = (convert: (c: string) => string) =>
  Object.fromEntries(Object.entries(DAY).map(([k, v]) => [k, convert(v)])) as Palette;

const BEDS: Record<'bed-1' | 'bed-2' | 'bed-3' | 'bed-4', [number, number, number, number]> = {
  'bed-1': [0.95, 17.3, 3.55, 19.3],
  'bed-2': [4.45, 17.3, 7.05, 19.3],
  'bed-3': [0.95, 20.0, 3.55, 22.0],
  'bed-4': [4.45, 20.0, 7.05, 22.0],
};
const GH = { x0: 4.7, y0: 12.4, x1: 7.45, y1: 16.0, h: 2.05, hr: 2.95 };

const rectFootprint = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0], [x1, y0], [x1, y1], [x0, y1],
];

// surface : hauteur du dessus de l'emplacement, où se dessine la mise en évidence.
const SLOTS: Record<SlotKey, { footprint: Point[]; height: number; surface?: number }> = {
  orchard: { footprint: rectFootprint(0.25, 4.9, 3.05, 9.3), height: 4.2 },
  'small-fruit': { footprint: rectFootprint(6.35, 4.7, 7.75, 11.1), height: 1.3 },
  vegetable: { footprint: rectFootprint(0.25, 16.6, 7.75, 22.6), height: 0 },
  'bed-1': { footprint: rectFootprint(0.83, 17.18, 3.67, 19.42), height: 1.6, surface: 0.4 },
  'bed-2': { footprint: rectFootprint(4.33, 17.18, 7.17, 19.42), height: 0.6, surface: 0.4 },
  'bed-3': { footprint: rectFootprint(0.83, 19.88, 3.67, 22.12), height: 0.6, surface: 0.4 },
  'bed-4': { footprint: rectFootprint(4.33, 19.88, 7.17, 22.12), height: 0.6, surface: 0.4 },
  greenhouse: { footprint: rectFootprint(GH.x0 - 0.1, GH.y0 - 0.1, GH.x1 + 0.1, GH.y1 + 0.1), height: GH.hr },
  firewood: { footprint: rectFootprint(0.3, 23.35, 3.0, 24.8), height: 1.4, surface: 1.4 },
};

/** Ordre de recherche au toucher : les zones avant l'espace qui les contient. */
const HIT_ORDER: SlotKey[] = ['bed-1', 'bed-2', 'bed-3', 'bed-4', 'greenhouse', 'firewood', 'orchard', 'small-fruit', 'vegetable'];

// Emprise du socle : le jardin, une tranche des jardins voisins et l'allée du fond.
const BASE = { x0: -2.8, x1: 10.8, y0: -6.6, y1: 28.2 };

/** L'emplacement sous un point de la scène, ou null sur le décor. */
export function slotAt(scene: Scene, point: Point): SlotKey | null {
  return HIT_ORDER.find((key) => contains(scene.slots[key].hit, point)) ?? null;
}

const scenes: Partial<Record<MapScheme, Scene>> = {};

export function terracedLongScene(scheme: MapScheme): Scene {
  return (scenes[scheme] ??= buildScene(scheme === 'dark'));
}

function buildScene(isNight: boolean): Scene {
  const pal = mapPalette(isNight ? night : (c) => c);
  const ctx = mapPalette(isNight ? contextNight : context);
  const p = new Painter(isNight ? '#04161A' : '#24321F', isNight ? '#031013' : '#1F2A1A');

  drawBase(p, pal, isNight);
  drawGround(p, pal, ctx);
  drawHouses(p, pal, ctx, isNight);
  drawWalls(p, pal, ctx);
  drawTerrace(p, pal);
  drawOrchardAndBerries(p, pal);
  drawGreenhouse(p, pal, isNight);
  drawBeds(p, pal);
  drawBackOfGarden(p, pal, isNight);
  drawNeighbours(p, ctx, isNight);
  drawLane(p, pal, ctx, isNight);
  drawDetails(p, pal);
  if (isNight) drawFireflies(p);

  const { shapes, bounds } = p.shapes();
  const slots = Object.fromEntries(
    SLOT_KEYS.map((key) => {
      const { footprint, height, surface = 0 } = SLOTS[key];
      return [key, { outline: footprint.map(([x, y]) => project(x, y, surface)), hit: silhouette(footprint, height) }];
    }),
  ) as Record<SlotKey, SceneSlot>;

  return { shapes, bounds, slots, background: isNight ? '#092328' : '#F6FAF6' };
}

function drawBase(p: Painter, pal: Palette, isNight: boolean) {
  const { x0, x1, y0, y1 } = BASE;
  p.layer(p.ground, () => {
    p.glow(x0 + (x1 - x0) * 0.55, y1 + 1.2, -0.8, 13, isNight ? '#000000' : '#1E3A24', isNight ? 0.5 : 0.14, 0.18);
    p.box(x0, y0, -0.8, x1, y1, 0, isNight
      ? { top: mix('#123F3E', '#0F3A3C', 0.5), side: '#0C3133' }
      : { top: pal.baseTop, side: pal.baseSide });
    const strata = isNight ? '#164744' : pal.baseLine;
    p.line([x0, y1, -0.5], [x1, y1, -0.5], strata, 0.8, 0.6);
    p.line([x0, y0, -0.5], [x0, y1, -0.5], strata, 0.8, 0.6);
  });
}

function drawGround(p: Painter, pal: Palette, ctx: Palette) {
  p.layer(p.ground, () => {
    // Jardins voisins
    for (const [xa, xb] of [[BASE.x0, 0], [8, BASE.x1]]) {
      p.rect(xa, 0, xb, 24.92, 0, ctx.lawnA);
      p.rect(xa, 0, xb, 2.4, 0, ctx.terrace);
    }
    p.rect(BASE.x0, 24.92, BASE.x1, BASE.y1, 0, ctx.lawnB);

    // Terrasse en dalles
    p.rect(0.25, 0, 7.75, 3.2, 0, pal.terrace);
    for (let y = 0.8; y < 3.2; y += 0.8) p.line([0.25, y, 0], [7.75, y, 0], pal.terraceLine, 0.7);
    for (let x = 1.05; x < 7.75; x += 0.8) p.line([x, 0, 0], [x, 3.2, 0], pal.terraceLine, 0.7);

    // Pelouse tondue en bandes
    for (let i = 0; i < 10; i++) {
      const xa = 0.25 + i * 0.75;
      p.rect(xa, 3.2, Math.min(7.75, xa + 0.75), 16.6, 0, i % 2 ? pal.lawnB : pal.lawnA);
    }
    p.line([0.25, 3.2, 0], [7.75, 3.2, 0], pal.terraceLine, 1.2);

    // Fond du jardin : gravier et parcelle du potager
    p.rect(0.25, 16.6, 7.75, 25, 0, pal.gravel);
    p.rect(0.25, 16.6, 7.75, 22.6, 0, pal.plot);
    p.line([0.25, 16.6, 0], [7.75, 16.6, 0], pal.edging, 1.4);
    p.line([0.25, 22.6, 0], [7.75, 22.6, 0], pal.edging, 1.0, 0.7);

    // Pas japonais
    for (let y = 3.55; y < 16.1; y += 0.95) {
      p.rect(3.65, y, 4.35, y + 0.5, 0, pal.stone, { stroke: pal.stoneEdge, strokeWidth: 0.7 });
    }

    // Bandes paillées du verger et des petits fruits
    for (const key of ['orchard', 'small-fruit'] as const) {
      p.polygon(SLOTS[key].footprint.map(([x, y]) => [x, y, 0]), pal.mulch, { stroke: pal.mulch, strokeWidth: 6 });
    }
  });
}

type HouseWindow = [number, number, number, number, boolean];

function drawHouse(
  p: Painter,
  pal: Palette,
  isNight: boolean,
  house: { x0: number; x1: number; h: number; ridge: number; windows: HouseWindow[]; chimney?: [number, number] },
) {
  const { x0, x1, h, ridge: zr, windows } = house;
  const y0 = -6;
  const y1 = 0;
  const ym = -3;
  const center: [number, number, number] = [(x0 + x1) / 2, ym, 3.4];

  p.object(depth((x0 + x1) / 2, ym), () => {
    p.faces(
      solidHouse(x0, x1, y0, y1, ym, h, zr, pal.wall, center),
    );
    const fy = y1 + 0.01;
    const quad = (xa: number, xb: number, za: number, zb: number, fill: string, extra?: { stroke?: string; strokeWidth?: number }) =>
      p.polygon([[xa, fy, za], [xb, fy, za], [xb, fy, zb], [xa, fy, zb]], fill, extra);
    quad(x0, x1, 0, 0.35, p.shadeFace(pal.plinth, [0, 1, 0]));
    for (const [xa, xb, za, zb, lit] of windows) {
      const frame = p.shadeFace(pal.frame, [0, 1, 0]);
      quad(xa, xb, za, zb, frame, { stroke: p.edgeOf(pal.frame), strokeWidth: 0.6 });
      const pw = (xb - xa - 0.3) / 2;
      for (let i = 0; i < 2; i++) {
        const pa = xa + 0.1 + i * (pw + 0.1);
        quad(pa, pa + pw, za + 0.1, zb - 0.1, isNight && lit ? WINDOW_LIT : pal.glass);
        if (!isNight) p.line([pa + 0.1, fy, za + 0.35], [pa + pw * 0.6, fy, zb - 0.2], pal.glassHi, 1.1, 0.8);
      }
    }
    const roof = solidRoof(x0, x1, y0, y1, ym, h, zr, pal.roof, center);
    p.faces(roof);
    for (let t = 0.12; t < 1; t += 0.13) {
      const y = ym + (y1 + 0.35 - ym) * t;
      const z = zr + (h - 0.25 - zr) * t;
      p.line([x0, y, z], [x1, y, z], pal.roofLine, 0.7, 0.55);
    }
    p.line([x0, ym, zr], [x1, ym, zr], pal.roofLine, 1.4);
    if (house.chimney) {
      const [cx0, cx1] = house.chimney;
      p.box(cx0, -3.9, zr - 0.35, cx1, -3.3, zr + 0.85, { top: pal.brickTop, side: pal.brick });
    }
  });

  if (isNight) {
    p.layer(p.lights, () => {
      for (const [xa, xb, za, zb, lit] of windows) {
        if (lit) p.glow((xa + xb) / 2, 0.05, (za + zb) / 2, 1.5, GLOW, 0.85);
      }
    });
  }
}

function solidHouse(x0: number, x1: number, y0: number, y1: number, ym: number, h: number, zr: number, color: string, center: [number, number, number]) {
  return solidFaces([
    { points: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], color },
    { points: [[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], color },
    { points: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, ym, zr], [x0, y0, h]], color },
    { points: [[x1, y0, 0], [x1, y0, h], [x1, ym, zr], [x1, y1, h], [x1, y1, 0]], color },
  ], center);
}

function solidRoof(x0: number, x1: number, y0: number, y1: number, ym: number, h: number, zr: number, color: string, center: [number, number, number]) {
  return solidFaces([
    { points: [[x0, ym, zr], [x1, ym, zr], [x1, y1 + 0.35, h - 0.25], [x0, y1 + 0.35, h - 0.25]], color },
    { points: [[x0, y0 - 0.35, h - 0.25], [x1, y0 - 0.35, h - 0.25], [x1, ym, zr], [x0, ym, zr]], color },
  ], center);
}

function drawHouses(p: Painter, pal: Palette, ctx: Palette, isNight: boolean) {
  drawHouse(p, pal, isNight, {
    x0: 0, x1: 8, h: 5.6, ridge: 8.1, chimney: [6.5, 7.1],
    windows: [[1.0, 3.0, 0, 2.35, true], [4.7, 7.0, 0.9, 2.35, true], [1.25, 2.75, 3.3, 4.8, true], [5.1, 6.6, 3.3, 4.8, false]],
  });
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(2.0, 1.4, 0, 1.9, GLOW, 0.7, 0.75);
      p.glow(5.85, 1.0, 0, 1.6, GLOW, 0.5, 0.7);
      p.glow(3.35, 0.05, 2.45, 1.1, GLOW, 0.9);
    });
  }
  p.object(depth(3.35, 0.05), () => {
    p.polygon([[3.27, 0.02, 2.3], [3.43, 0.02, 2.3], [3.43, 0.02, 2.62], [3.27, 0.02, 2.62]], pal.lampBox);
    p.line([7.85, 0.02, 5.5], [7.85, 0.02, 0.05], pal.pipe, 1.4);
  }, 1);

  drawHouse(p, ctx, isNight, {
    x0: BASE.x0, x1: 0, h: 5.2, ridge: 7.6,
    windows: [[-2.3, -0.8, 0, 2.2, true], [-2.3, -0.8, 3.0, 4.4, false]],
  });
  drawHouse(p, ctx, isNight, {
    x0: 8, x1: BASE.x1, h: 5.9, ridge: 8.5, chimney: [9.6, 10.1],
    windows: [[8.6, 10.2, 0.9, 2.35, false], [8.6, 10.2, 3.4, 4.9, true]],
  });
}

function drawWalls(p: Painter, pal: Palette, ctx: Palette) {
  // Murs mitoyens en brique, découpés en segments pour l'ordre d'affichage.
  for (const [xa, xb] of [[0, 0.25], [7.75, 8]]) {
    for (let y = 0; y < 25 - 1e-6; y += 1.25) {
      const ya = y;
      const yb = Math.min(25, y + 1.25);
      p.object(depth((xa + xb) / 2, (ya + yb) / 2), () => {
        p.box(xa, ya, 0, xb, yb, 1.8, { top: pal.brickTop, side: pal.brick });
        for (const z of [0.45, 0.9, 1.35]) p.line([xa, ya, z], [xa, yb, z], pal.mortar, 0.6, 0.7);
      });
    }
  }
  // Clôture du fond, et celles des voisins en teintes passées.
  p.object(depth(4, 24.96), () => {
    p.box(0.25, 24.92, 0, 7.75, 25.0, 0.95, { top: pal.fenceTop, side: pal.fence });
    for (let x = 0.47; x < 7.75; x += 0.22) p.line([x, 25.005, 0.03], [x, 25.005, 0.93], pal.fenceLine, 0.6, 0.65);
  }, 1);
  for (const [xa, xb] of [[BASE.x0, 0], [8, BASE.x1]]) {
    p.object(depth((xa + xb) / 2, 24.96), () => {
      p.box(xa, 24.92, 0, xb, 25.0, 0.95, { top: ctx.fenceTop, side: ctx.fence });
    }, 1);
  }
}

function drawPot(p: Painter, pal: Palette, x: number, y: number) {
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x - 0.22, y - 0.22, x + 0.22, y + 0.22), 0.45, pal.shadow, 0.14));
  p.object(depth(x, y), () => {
    p.box(x - 0.22, y - 0.22, 0, x + 0.22, y + 0.22, 0.42, { top: pal.potRim, side: pal.pot });
    p.rect(x - 0.16, y - 0.16, x + 0.16, y + 0.16, 0.425, pal.soilBed);
    p.line([x, y, 0.43], [x, y, 0.66], pal.sprout, 1.2);
    p.leafBall(x - 0.09, y, 0.64, 0.09, pal.sprout);
    p.leafBall(x + 0.1, y, 0.72, 0.12, pal.sprout2);
  });
}

function drawTerrace(p: Painter, pal: Palette) {
  drawPot(p, pal, 0.7, 0.6);
  drawPot(p, pal, 0.7, 2.6);
  drawPot(p, pal, 7.25, 0.65);
  drawPot(p, pal, 7.25, 1.2);

  p.layer(p.shadows, () => p.ellipseGround(5.9, 1.0, 0, 0.6, 0.45, pal.shadow, { opacity: 0.12 }));
  p.object(depth(5.6, 1.6), () => {
    p.box(5.57, 1.57, 0, 5.63, 1.63, 0.72, pal.woodDark);
    p.ellipseGround(5.6, 1.6, 0.74, 0.42, 0.42, pal.metal, { stroke: p.edgeOf(pal.metal), strokeWidth: 0.7 });
  }, 0.5);
  const chair = (x: number, y: number, back: number) =>
    p.object(depth(x + 0.18, y + 0.18), () => {
      p.box(x + 0.15, y + 0.15, 0, x + 0.21, y + 0.21, 0.42, pal.woodDark);
      p.box(x, y, 0.42, x + 0.36, y + 0.36, 0.47, pal.wood);
      if (back > 0) p.box(x + 0.3, y, 0.47, x + 0.36, y + 0.36, 0.9, pal.wood);
      else p.box(x, y, 0.47, x + 0.06, y + 0.36, 0.9, pal.wood);
    });
  chair(4.75, 1.42, -1);
  chair(6.1, 1.42, 1);
}

function drawTree(
  p: Painter,
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
        p.sphere(x + dx * r, y + dy * r, cz + dz * r, 0.09, options.fruit);
      }
    }
  });
}

function drawBush(p: Painter, pal: Palette, x: number, y: number, r: number, berry?: string) {
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

function drawOrchardAndBerries(p: Painter, pal: Palette) {
  drawTree(p, pal, 1.7, 7.0, { fruit: pal.apple });
  [5.4, 6.6, 7.8, 9.0].forEach((y) => drawBush(p, pal, 7.05, y, 0.44, pal.berry));
  drawBush(p, pal, 6.95, 10.35, 0.58, pal.berry);
}

function drawGreenhouse(p: Painter, pal: Palette, isNight: boolean) {
  const { x0, y0, x1, y1, h, hr } = GH;
  const xm = (x0 + x1) / 2;
  const faces = solidFaces([
    { points: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], color: pal.ghGlass, tag: 'wall-l' },
    { points: [[x1, y0, 0], [x1, y0, h], [x1, y1, h], [x1, y1, 0]], color: pal.ghGlass, tag: 'wall-r' },
    { points: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [xm, y1, hr], [x0, y1, h]], color: pal.ghGlass, tag: 'front' },
    { points: [[x0, y0, 0], [x0, y0, h], [xm, y0, hr], [x1, y0, h], [x1, y0, 0]], color: pal.ghGlass, tag: 'back' },
    { points: [[x0, y0, h], [x0, y1, h], [xm, y1, hr], [xm, y0, hr]], color: pal.ghGlass, tag: 'roof-l' },
    { points: [[x1, y0, h], [xm, y0, hr], [xm, y1, hr], [x1, y1, h]], color: pal.ghGlass, tag: 'roof-r' },
  ], [xm, (y0 + y1) / 2, 1.2]);

  p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), h, pal.shadow, 0.08));
  p.object(depth(xm, (y0 + y1) / 2), () => {
    const frame = (points: [number, number, number][], width = 1.1, opacity = 1) =>
      p.polygon(points, undefined, { stroke: pal.ghFrame, strokeWidth: width, opacity });
    p.rect(x0, y0, x1, y1, 0.01, pal.ghFloor);
    for (const f of faces.filter((f) => !f.visible)) {
      p.polygon(f.points, pal.ghGlass, { opacity: 0.2 });
      frame(f.points, 0.8, 0.6);
    }
    for (const y of [13.3, 14.2]) {
      p.line([5.35, y, 0.05], [5.35, y, 1.95], pal.woodDark, 0.6, 0.7);
      [0.45, 0.85, 1.25, 1.6].forEach((z, i) => p.leafBall(5.35 + (i % 2 ? 0.1 : -0.1), y, z, 0.17, pal.leaf));
    }
    p.leafBall(6.55, 14.9, 0.42, 0.3, pal.leafDark);
    p.leafBall(6.75, 15.1, 0.55, 0.22, pal.leaf);
    p.sphere(6.72, 15.25, 0.32, 0.08, pal.aubergine);
    for (const f of faces.filter((f) => f.visible)) {
      p.polygon(f.points, pal.ghGlass, { opacity: isNight ? 0.28 : 0.4 });
      frame(f.points);
      if (f.tag === 'wall-l' || f.tag === 'wall-r') {
        const x = f.tag === 'wall-l' ? x0 : x1;
        for (let i = 1; i < 6; i++) {
          const y = y0 + ((y1 - y0) * i) / 6;
          p.line([x, y, 0], [x, y, h], pal.ghFrame, 0.9);
        }
        p.line([x, y0, 1.0], [x, y1, 1.0], pal.ghFrame, 0.9);
      }
      if (f.tag === 'front') {
        for (let i = 1; i < 5; i++) {
          const x = x0 + ((x1 - x0) * i) / 5;
          const zt = h + (hr - h) * (1 - Math.abs(x - xm) / (xm - x0));
          p.line([x, y1, 0], [x, y1, zt], pal.ghFrame, 0.9);
        }
        p.line([x0, y1, 1.0], [x1, y1, 1.0], pal.ghFrame, 0.9);
        if (!isNight) {
          p.polygon([[x0 + 0.25, y1, 0.2], [x0 + 0.6, y1, 0.2], [x0 + 1.3, y1, 1.9], [x0 + 0.95, y1, 1.9]], '#FFFFFF', { opacity: 0.35 });
        }
      }
      if (f.tag === 'roof-l' || f.tag === 'roof-r') {
        const x = f.tag === 'roof-l' ? x0 : x1;
        for (let i = 1; i < 6; i++) {
          const y = y0 + ((y1 - y0) * i) / 6;
          p.line([x, y, h], [xm, y, hr], pal.ghFrame, 0.9);
        }
      }
    }
  });
}

function drawBeds(p: Painter, pal: Palette) {
  for (const [key, [x0, y0, x1, y1]] of Object.entries(BEDS)) {
    const h = 0.38;
    const rim = 0.09;
    p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), h, pal.shadow, 0.13));
    p.object(depth((x0 + x1) / 2, (y0 + y1) / 2), () => {
      p.box(x0, y0, 0, x1, y1, h, { top: pal.wood, side: pal.wood });
      p.line([x0, y1, h / 2], [x1, y1, h / 2], pal.woodDark, 0.6, 0.6);
      p.rect(x0 + rim, y0 + rim, x1 - rim, y1 - rim, h + 0.005, pal.soilBed);
      drawBedPlants(p, pal, key, x0, y0, x1, y1);
    });
  }
}

function drawBedPlants(p: Painter, pal: Palette, key: string, x0: number, y0: number, x1: number, y1: number) {
  const z0 = 0.38;
  if (key === 'bed-1') {
    for (const x of [1.4, 2.25, 3.1]) {
      const y = 17.65;
      p.line([x, y, z0], [x, y, 1.55], pal.woodDark, 1.1);
      p.leafBall(x - 0.1, y, 0.75, 0.2, pal.leafDark);
      p.leafBall(x + 0.1, y, 1.0, 0.2, pal.leaf);
      p.leafBall(x - 0.08, y, 1.25, 0.18, pal.leafDark);
      p.leafBall(x + 0.05, y, 1.45, 0.14, pal.leaf);
      for (const [dx, dy, z] of [[0.16, 0.08, 0.85], [-0.15, 0.08, 1.1], [0.14, 0.08, 1.32]]) {
        p.sphere(x + dx, y + dy, z, 0.055, pal.tomato);
      }
    }
    for (const x of [1.55, 2.95]) {
      const y = 18.2;
      p.leafBall(x - 0.18, y, 0.55, 0.3, pal.leafDark);
      p.leafBall(x + 0.18, y + 0.02, 0.55, 0.3, pal.leafDark);
      p.leafBall(x, y + 0.12, 0.62, 0.32, pal.leaf);
      p.sphere(x + 0.05, y + 0.25, 0.68, 0.06, pal.flower);
    }
    for (const x of [1.35, 2.0]) {
      p.leafBall(x, 18.7, 0.62, 0.2, pal.leaf);
      p.sphere(x + 0.08, 18.82, 0.55, 0.07, pal.pepper);
    }
    for (const x of [2.65, 3.15]) {
      p.leafBall(x, 18.7, 0.5, 0.14, pal.leafDark);
      p.sphere(x - 0.04, 18.72, 0.56, 0.06, pal.leafLight);
    }
    for (const x of [1.25, 1.75, 2.25, 2.75, 3.25]) {
      p.leafBall(x, 19.05, 0.45, 0.17, pal.leafLight);
      p.sphere(x, 19.08, 0.5, 0.075, pal.lettuce);
    }
  } else if (key === 'bed-2') {
    // Salades en quinconce.
    for (let row = 0, y = y0 + 0.4; y < y1 - 0.2; y += 0.45, row++) {
      for (let x = x0 + 0.35 + (row % 2) * 0.22; x < x1 - 0.2; x += 0.45) {
        p.leafBall(x, y, 0.47, 0.15, row % 2 ? pal.leafLight : pal.lettuce);
      }
    }
  } else if (key === 'bed-3') {
    // Poireaux en rangs.
    for (let y = y0 + 0.4; y < y1 - 0.2; y += 0.5) {
      for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.24) {
        p.line([x, y, z0], [x - 0.05, y, 0.85], pal.leafDark, 1.2);
        p.line([x, y, z0], [x + 0.06, y, 0.78], pal.leaf, 1.0);
      }
    }
  } else {
    // Semis qui lèvent.
    for (let y = y0 + 0.35; y < y1 - 0.2; y += 0.42) {
      for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.36) p.sphere(x, y, 0.42, 0.06, pal.leafLight);
    }
  }
}

function drawBackOfGarden(p: Painter, pal: Palette, isNight: boolean) {
  p.layer(p.shadows, () => p.shadowHull(rectFootprint(0.3, 23.35, 3.0, 24.8), 1.4, pal.shadow, 0.15));
  p.object(depth(1.65, 24.05), () => {
    p.box(0.45, 23.5, 0, 2.85, 24.55, 1.15, { top: pal.bark, side: pal.logSide });
    for (const z of [0.19, 0.53, 0.87]) {
      for (let k = 0; k < 6; k++) {
        const x = 0.82 + k * 0.37 + (z > 0.5 && z < 0.6 ? 0.06 : 0);
        p.ellipseFront(x, 24.56, z, 0.165, pal.logEnd, { stroke: pal.logRing, strokeWidth: 0.8 });
        p.ellipseFront(x, 24.565, z, 0.05, pal.logRing, { opacity: 0.7 });
      }
    }
    p.box(0.4, 24.62, 0, 0.46, 24.68, 1.32, pal.woodDark);
    p.box(2.84, 24.62, 0, 2.9, 24.68, 1.32, pal.woodDark);
    p.box(0.3, 23.35, 1.32, 3.0, 24.8, 1.4, { top: pal.shedRoof, side: pal.shedRoof });
  });

  // Cabanon
  const x0 = 5.0;
  const x1 = 7.6;
  const y0 = 22.7;
  const y1 = 24.6;
  const h = 2.0;
  const xm = 6.3;
  const hr = 2.75;
  const center: [number, number, number] = [xm, (y0 + y1) / 2, 1.1];
  const walls = solidFaces([
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
        p.polygon([[x0 - 0.01, 23.15, 0], [x0 - 0.01, 24.0, 0], [x0 - 0.01, 24.0, 1.75], [x0 - 0.01, 23.15, 1.75]],
          p.shadeFace(pal.door, f.normal), { stroke: p.edgeOf(pal.door), strokeWidth: 0.7 });
        p.sphere(x0 - 0.02, 23.85, 0.9, 0.04, pal.metal);
        p.polygon([[x0 - 0.01, 24.13, 1.88], [x0 - 0.01, 24.25, 1.88], [x0 - 0.01, 24.25, 2.05], [x0 - 0.01, 24.13, 2.05]],
          isNight ? WINDOW_LIT : pal.lampBox);
      }
    }
    p.polygon([[6.0, y1 + 0.01, 1.0], [6.75, y1 + 0.01, 1.0], [6.75, y1 + 0.01, 1.55], [6.0, y1 + 0.01, 1.55]], pal.glass,
      { stroke: pal.frame, strokeWidth: 1.2 });
    p.faces(solidFaces([
      { points: [[x0 - 0.15, y0 - 0.12, h - 0.08], [x0 - 0.15, y1 + 0.12, h - 0.08], [xm, y1 + 0.12, hr], [xm, y0 - 0.12, hr]], color: pal.shedRoof },
      { points: [[x1 + 0.15, y0 - 0.12, h - 0.08], [xm, y0 - 0.12, hr], [xm, y1 + 0.12, hr], [x1 + 0.15, y1 + 0.12, h - 0.08]], color: pal.shedRoof },
    ], center));
  });
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(x0 - 0.05, 24.19, 1.96, 1.0, GLOW, 0.9);
      p.glow(4.4, 23.6, 0, 1.0, GLOW, 0.6, 0.75);
    });
  }
}

function drawNeighbours(p: Painter, ctx: Palette, isNight: boolean) {
  // À gauche : un arbre, deux arbustes et un abri de jardin.
  drawTree(p, ctx, -1.6, 13.2, { r: 1.25, trunk: 1.5 });
  drawBush(p, ctx, -0.9, 4.2, 0.5);
  drawBush(p, ctx, -2.1, 5.0, 0.42);
  {
    const x0 = -2.6;
    const x1 = -1.0;
    const y0 = 19.4;
    const y1 = 21.2;
    p.layer(p.shadows, () => p.shadowHull(rectFootprint(x0, y0, x1, y1), 1.8, ctx.shadow, 0.1));
    p.object(depth((x0 + x1) / 2, (y0 + y1) / 2), () => {
      p.box(x0, y0, 0, x1, y1, 1.8, ctx.shed);
      p.box(x0 - 0.1, y0 - 0.1, 1.8, x1 + 0.1, y1 + 0.1, 1.95, ctx.shedRoof);
    });
  }
  for (let y = 3.0; y < 18.5; y += 1.1) p.layer(p.ground, () => p.rect(-1.75, y, -1.25, y + 0.45, 0, ctx.stone));

  // À droite : un arbre, une mare et deux carrés.
  drawTree(p, ctx, 9.7, 6.4, { r: 1.2, trunk: 1.6 });
  p.layer(p.ground, () => {
    p.ellipseGround(9.4, 12.6, 0, 0.95, 1.35, ctx.stoneEdge);
    p.ellipseGround(9.4, 12.6, 0.01, 0.78, 1.15, isNight ? '#123B45' : ctx.water);
    for (const [x0, y0] of [[8.6, 17.6], [8.6, 20.0]]) {
      p.rect(x0, y0, x0 + 1.8, y0 + 1.6, 0, ctx.plot);
    }
  });
  drawBush(p, ctx, 10.2, 10.6, 0.48);
  drawBush(p, ctx, 8.75, 14.6, 0.36);
  for (const [x0, y0] of [[8.6, 17.6], [8.6, 20.0]]) {
    p.object(depth(x0 + 0.9, y0 + 0.8), () => {
      p.box(x0, y0, 0, x0 + 1.8, y0 + 1.6, 0.3, ctx.wood);
      p.rect(x0 + 0.08, y0 + 0.08, x0 + 1.72, y0 + 1.52, 0.305, ctx.soilBed);
      for (let y = y0 + 0.35; y < y0 + 1.4; y += 0.4) {
        for (let x = x0 + 0.3; x < x0 + 1.6; x += 0.4) p.sphere(x, y, 0.36, 0.09, ctx.leafLight);
      }
    });
  }
}

function drawLane(p: Painter, pal: Palette, ctx: Palette, isNight: boolean) {
  // Allée commune derrière les jardins, puis une haie basse au bord du socle.
  p.layer(p.ground, () => {
    p.rect(BASE.x0, 25.25, BASE.x1, 26.75, 0, ctx.gravel);
    p.line([BASE.x0, 25.25, 0], [BASE.x1, 25.25, 0], ctx.edging, 0.8, 0.6);
    p.line([BASE.x0, 26.75, 0], [BASE.x1, 26.75, 0], ctx.edging, 0.8, 0.6);
  });
  for (let x = BASE.x0 + 0.1; x < BASE.x1 - 0.5; x += 1.5) {
    const xb = Math.min(BASE.x1 - 0.1, x + 1.5);
    p.object(depth((x + xb) / 2, 27.4), () => {
      p.box(x, 27.0, 0, xb, 27.85, 0.75, { top: ctx.leaf, side: ctx.leafDark });
      for (let k = x + 0.3; k < xb; k += 0.6) p.leafBall(k, 27.45, 0.78, 0.3, ctx.leaf);
    });
  }

  // Lampadaire de l'allée, allumé la nuit.
  const lx = 7.3;
  const ly = 25.55;
  p.object(depth(lx, ly), () => {
    p.box(lx - 0.05, ly - 0.05, 0, lx + 0.05, ly + 0.05, 2.6, pal.lampBox);
    p.box(lx - 0.16, ly - 0.16, 2.6, lx + 0.16, ly + 0.16, 2.85, isNight ? WINDOW_LIT : pal.glassHi);
    p.box(lx - 0.2, ly - 0.2, 2.85, lx + 0.2, ly + 0.2, 2.92, pal.lampBox);
  });
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(lx, ly, 2.72, 0.9, GLOW, 0.9);
      p.glow(lx, ly, 0, 1.6, GLOW, 0.45, 0.6);
    });
  }
}

function drawDetails(p: Painter, pal: Palette) {
  // Arrosoir au bord du potager.
  {
    const x = 4.75;
    const y = 16.25;
    p.layer(p.shadows, () => p.ellipseGround(x, y - 0.1, 0, 0.25, 0.18, pal.shadow, { opacity: 0.15 }));
    p.object(depth(x, y), () => {
      p.box(x - 0.15, y - 0.1, 0, x + 0.15, y + 0.1, 0.28, { top: pal.canDark, side: pal.can });
      p.line([x + 0.15, y, 0.08], [x + 0.42, y, 0.36], pal.canDark, 1.6);
      p.line([x - 0.12, y, 0.28], [x - 0.05, y, 0.42], pal.canDark, 1.2);
      p.line([x - 0.05, y, 0.42], [x + 0.08, y, 0.42], pal.canDark, 1.2);
      p.line([x + 0.08, y, 0.42], [x + 0.12, y, 0.28], pal.canDark, 1.2);
    });
  }
  // Brouette entre le bois et le cabanon.
  {
    const x = 4.0;
    const y = 23.9;
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
}

function drawFireflies(p: Painter) {
  p.layer(p.lights, () => {
    for (const [x, y, z] of [[2.2, 9.5, 1.2], [5.3, 6.2, 0.9], [3.0, 13.8, 1.4], [5.9, 11.0, 1.1], [1.6, 15.0, 0.8], [5.8, 20.2, 1.0], [2.6, 5.0, 1.3], [-1.2, 16.5, 1.1], [9.2, 9.0, 0.9]]) {
      p.glow(x, y, z, 0.28, FIREFLY, 0.7);
      p.sphere(x, y, z, 0.05, FIREFLY, { opacity: 0.9 });
    }
  });
}
