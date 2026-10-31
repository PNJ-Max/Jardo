// Modèle de scène « country-house » : maison quatre façades au milieu d'un grand terrain
// clôturé. Le terrain occupe x de 0 à 18 m et y de 0 à 30 m ; la route passe devant (y négatif).
// Autour : la campagne, en teintes passées.

import {
  createKit,
  drawBed,
  drawBush,
  drawConifer,
  drawFence,
  drawField,
  drawFirewood,
  drawGreenhouse,
  drawHedge,
  drawHouse,
  drawLamp,
  drawOutbuilding,
  drawPatioSet,
  drawPot,
  drawShed,
  drawTree,
  drawWateringCan,
  drawWheelbarrow,
  GLOW,
  GREENHOUSE_SIZE,
  rectFootprint,
  type Kit,
} from './decor';
import { finishScene, type MapScheme, type Scene, type SlotKey, type SlotSpec } from './layouts';

/** Le sol dessiné, en mètres. */
export const WORLD = { x0: -22, x1: 40, y0: -20, y1: 50 };
const HOUSE = { x0: 4.5, x1: 13.5, y0: 2, y1: 9 };
const ORCHARD_TREES: [number, number][] = [[2.6, 13.2], [6.2, 15.4], [2.9, 18.2]];
const BEDS: Record<'bed-1' | 'bed-2' | 'bed-3' | 'bed-4', [number, number]> = {
  'bed-1': [2.0, 23.0],
  'bed-2': [5.6, 23.0],
  'bed-3': [2.0, 25.8],
  'bed-4': [5.6, 25.8],
};
const GH = { x0: 11.2, y0: 23.2 };
const FIREWOOD = { x0: 14.5, y0: 10.2 };
const FIREFLIES: [number, number, number][] = [[4, 21, 1.1], [12.5, 16, 0.9], [8, 19, 1.3], [14, 21.5, 1.0], [2, 10.5, 1.2], [15.5, 12, 0.8], [-2, 16, 1.0], [20, 24, 1.1]];

const bedSpec = ([x0, y0]: [number, number], tall = false): SlotSpec => ({
  footprint: rectFootprint(x0 - 0.12, y0 - 0.12, x0 + 2.72, y0 + 2.12),
  height: tall ? 1.6 : 0.6,
  surface: 0.4,
  anchor: [x0 + 1.3, y0 + 1, tall ? 1.75 : 0.9],
});

const SLOTS: Record<SlotKey, SlotSpec> = {
  orchard: { footprint: rectFootprint(0.8, 11.4, 8.2, 20.2), height: 4.2, anchor: [4.2, 15.6, 5.2] },
  'small-fruit': { footprint: rectFootprint(16.2, 12.6, 17.6, 21.4), height: 1.3, anchor: [16.9, 17, 1.75] },
  vegetable: { footprint: rectFootprint(1.2, 22.3, 9.4, 28.5), height: 0, anchor: [5.3, 22.45, 0.1] },
  'bed-1': bedSpec(BEDS['bed-1'], true),
  'bed-2': bedSpec(BEDS['bed-2']),
  'bed-3': bedSpec(BEDS['bed-3']),
  'bed-4': bedSpec(BEDS['bed-4']),
  greenhouse: {
    footprint: rectFootprint(GH.x0 - 0.1, GH.y0 - 0.1, GH.x0 + GREENHOUSE_SIZE.w + 0.1, GH.y0 + GREENHOUSE_SIZE.d + 0.1),
    height: GREENHOUSE_SIZE.ridge,
    anchor: [GH.x0 + GREENHOUSE_SIZE.w / 2, GH.y0 + GREENHOUSE_SIZE.d / 2, 3.35],
  },
  firewood: {
    footprint: rectFootprint(FIREWOOD.x0, FIREWOOD.y0, FIREWOOD.x0 + 2.7, FIREWOOD.y0 + 1.45),
    height: 1.4,
    surface: 1.4,
    anchor: [FIREWOOD.x0 + 1.35, FIREWOOD.y0 + 0.7, 1.9],
  },
};

const scenes: Partial<Record<MapScheme, Scene>> = {};

export function countryHouseScene(scheme: MapScheme): Scene {
  return (scenes[scheme] ??= buildScene(createKit(scheme === 'dark')));
}

function buildScene(kit: Kit): Scene {
  drawCountryside(kit);
  drawGarden(kit);
  return finishScene(
    kit,
    SLOTS,
    {
      focus: { x0: 0, x1: 18, y0: 1, y1: 30, z: 2 },
      limits: { x0: -7, x1: 25, y0: -8, y1: 37, z: 0 },
      fireflies: kit.isNight ? FIREFLIES : [],
    },
    kit.ctx.meadow,
  );
}

function drawCountryside(kit: Kit) {
  const { p, ctx } = kit;
  const { x0, x1, y0, y1 } = WORLD;

  p.layer(p.ground, () => {
    p.rect(x0, y0, x1, y1, 0, ctx.meadow);
    // Route de campagne devant le terrain, et l'entrée gravillonnée
    p.rect(x0, -6.5, x1, -2.5, 0, ctx.road);
    for (let x = x0 + 0.5; x < x1; x += 3) p.rect(x, -4.58, x + 1.5, -4.42, 0, ctx.roadLine);
    p.rect(14.2, -2.5, 17.4, 0, 0, ctx.gravel);
    // Prés voisins
    p.rect(19.5, 4, 34, 24, 0, ctx.meadowDark);
    p.rect(-18, 31, -2, 44, 0, ctx.meadowDark);
  });
  drawField(kit, ctx, -18, -18, 12, -8.5, 'y');
  drawField(kit, ctx, 15, -18, 38, -8.5, 'x');
  drawField(kit, ctx, -19, 2, -5, 27, 'y');
  drawField(kit, ctx, 2, 33, 30, 46, 'x');

  // Haies bocagères
  drawHedge(kit, ctx, -4.6, 0, -3.8, 30, 1.2);
  drawHedge(kit, ctx, 20.6, 0, 21.4, 30, 1.2);
  drawHedge(kit, ctx, -18, 30.6, 34, 31.4, 1.0);

  // Arbres isolés et bosquets
  for (const [tx, ty, r] of [[-7, 8, 1.6], [-9, 20, 1.3], [-2, 33.5, 1.4], [24, 9, 1.5], [27, 17, 1.8], [23.5, 27, 1.2], [9, 34, 1.3], [18, 35.5, 1.6], [-7, -12, 1.3], [30, -12, 1.5]] as const) {
    drawTree(kit, ctx, tx, ty, { r, trunk: 1.7 });
  }
  for (const [cx, cy] of [[-8.5, 13], [25.5, 21], [-6, 28], [30, 30]] as const) drawConifer(kit, ctx, cx, cy, 4.2);
  for (const [bx, by, r] of [[-2.5, 6, 0.6], [22.5, 14, 0.5], [12, 32.5, 0.55]] as const) drawBush(kit, ctx, bx, by, r);

  // Une ferme au loin, à droite
  drawHouse(kit, ctx, {
    x0: 26, x1: 34, y0: -1, y1: 4, h: 4.6, ridge: 7.4, roof: 'hip',
    windows: [[27, 28.4, 0.9, 2.3, true], [31, 32.4, 0.9, 2.3, false]],
    sideWindows: [[0.2, 1.6, 0.9, 2.3, false]],
  });
  drawOutbuilding(kit, ctx, 26.5, 6, 31, 9.5, 3);
}

function drawGarden(kit: Kit) {
  const { p, pal, isNight } = kit;
  p.layer(p.ground, () => {
    // Pelouse tondue en bandes
    for (let i = 0; i < 12; i++) {
      p.rect(i * 1.5, 0, (i + 1) * 1.5, 30, 0, i % 2 ? pal.lawnB : pal.lawnA);
    }
    // Allée et stationnement gravillonnés le long de la maison
    p.rect(14.2, 0, 17.4, 9.5, 0, pal.gravel);
    // Terrasse en dalles derrière la maison
    p.rect(5, HOUSE.y1, 13, 12, 0, pal.terrace);
    for (let y = HOUSE.y1 + 0.75; y < 12; y += 0.75) p.line([5, y, 0], [13, y, 0], pal.terraceLine, 0.7);
    for (let x = 5.8; x < 13; x += 0.8) p.line([x, HOUSE.y1, 0], [x, 12, 0], pal.terraceLine, 0.7);
    // Pas japonais de la terrasse au potager
    for (let y = 12.4; y < 22; y += 0.95) {
      p.rect(9.8, y, 10.5, y + 0.5, 0, pal.stone, { stroke: pal.stoneEdge, strokeWidth: 0.7 });
    }
    // Potager
    p.rect(1.2, 22.3, 9.4, 28.5, 0, pal.plot);
    p.polygon(rectFootprint(1.2, 22.3, 9.4, 28.5).map(([x, y]) => [x, y, 0]), undefined, { stroke: pal.edging, strokeWidth: 1.4 });
    // Paillage au pied des fruitiers et le long des petits fruits
    for (const [tx, ty] of ORCHARD_TREES) p.ellipseGround(tx, ty, 0, 1.3, 1.3, pal.mulch);
    p.polygon(SLOTS['small-fruit'].footprint.map(([x, y]) => [x, y, 0]), pal.mulch, { stroke: pal.mulch, strokeWidth: 6 });
  });

  drawHouse(kit, pal, {
    ...HOUSE, h: 5.4, ridge: 8.4, roof: 'hip', chimney: [10.4, 11],
    windows: [[5.4, 6.9, 0.9, 2.35, true], [8.3, 9.8, 0, 2.35, true], [11.2, 12.7, 0.9, 2.35, false], [5.4, 6.9, 3.3, 4.7, false], [11.2, 12.7, 3.3, 4.7, true]],
    sideWindows: [[3, 4.4, 0.9, 2.35, true], [6.3, 7.7, 0.9, 2.35, false], [3, 4.4, 3.3, 4.7, false], [6.3, 7.7, 3.3, 4.7, true]],
  });
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(9, 10.4, 0, 2.2, GLOW, 0.6, 0.75);
      p.glow(15.8, 4, 0, 1.4, GLOW, 0.35, 0.7);
    });
  }

  // Clôtures en bois sur les côtés et devant, portail à l'entrée ; haie au fond.
  drawFence(kit, pal, -0.05, 0, 0.05, 30);
  drawFence(kit, pal, 17.95, 0, 18.05, 30);
  drawFence(kit, pal, 0, -0.05, 14.2, 0.05);
  drawHedge(kit, pal, 0, 30, 18, 30.8, 1.2);
  drawLamp(kit, 13.8, -0.6);

  drawPot(kit, 5.5, 9.6);
  drawPot(kit, 12.5, 9.6);
  drawPot(kit, 12.5, 11.4);
  drawPatioSet(kit, 8.2, 10.6);

  // Chaque emplacement étiquette ses objets : ils rebondissent quand on le touche.
  p.within('orchard', () => {
    for (const [tx, ty] of ORCHARD_TREES) drawTree(kit, pal, tx, ty, { r: 1.3, trunk: 1.6, fruit: pal.apple });
  });
  p.within('small-fruit', () => {
    for (let y = 13.2; y < 21; y += 1.25) drawBush(kit, pal, 16.9, y, 0.44, pal.berry);
  });

  p.within('greenhouse', () => drawGreenhouse(kit, GH.x0, GH.y0));
  p.within('vegetable', () => {
    p.within('bed-1', () => drawBed(kit, ...BEDS['bed-1'], 'summer'));
    p.within('bed-2', () => drawBed(kit, ...BEDS['bed-2'], 'lettuce'));
    p.within('bed-3', () => drawBed(kit, ...BEDS['bed-3'], 'leek'));
    p.within('bed-4', () => drawBed(kit, ...BEDS['bed-4'], 'seedlings'));
  });
  p.within('firewood', () => drawFirewood(kit, FIREWOOD.x0, FIREWOOD.y0));
  drawShed(kit, 14.6, 26.2);
  drawWateringCan(kit, 9.9, 22.6);
  drawWheelbarrow(kit, 13.6, 27.2);
  drawBush(kit, pal, 1.2, 9.5, 0.55);
  drawBush(kit, pal, 2.4, 4.8, 0.6);
  drawBush(kit, pal, 16.8, 24.2, 0.5);
}
