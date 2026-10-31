// Modèle de scène « terraced-long » : maison mitoyenne, jardin en longueur
// (docs/etude-carte-potager.md). Le jardin occupe x de 0 à 8 m et y de 0 à 25 m ; la maison est
// devant (y négatif). Autour : la rangée de maisons et leurs jardins, la rue, l'allée du fond
// et les champs, en teintes passées.

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
import { depth } from './scene';

/** Le sol dessiné, en mètres. */
export const WORLD = { x0: -18, x1: 26, y0: -16, y1: 44 };
const BEDS: Record<'bed-1' | 'bed-2' | 'bed-3' | 'bed-4', [number, number]> = {
  'bed-1': [0.95, 17.3],
  'bed-2': [4.45, 17.3],
  'bed-3': [0.95, 20.0],
  'bed-4': [4.45, 20.0],
};
const GH = { x0: 4.7, y0: 12.4 };
const FIREWOOD = { x0: 0.3, y0: 23.35 };
const FIREFLIES: [number, number, number][] = [[2.2, 9.5, 1.2], [5.3, 6.2, 0.9], [3.0, 13.8, 1.4], [5.9, 11.0, 1.1], [1.6, 15.0, 0.8], [5.8, 20.2, 1.0], [2.6, 5.0, 1.3], [-4.2, 16.5, 1.1], [12.2, 9.0, 0.9]];

const bedSpec = ([x0, y0]: [number, number], tall = false): SlotSpec => ({
  footprint: rectFootprint(x0 - 0.12, y0 - 0.12, x0 + 2.72, y0 + 2.12),
  height: tall ? 1.6 : 0.6,
  surface: 0.4,
  anchor: [x0 + 1.3, y0 + 1, tall ? 1.75 : 0.9],
});

const SLOTS: Record<SlotKey, SlotSpec> = {
  orchard: { footprint: rectFootprint(0.25, 4.9, 3.05, 9.3), height: 4.2, anchor: [1.7, 7.0, 5.1] },
  'small-fruit': { footprint: rectFootprint(6.35, 4.7, 7.75, 11.1), height: 1.3, anchor: [7.05, 8.0, 1.75] },
  vegetable: { footprint: rectFootprint(0.25, 16.6, 7.75, 22.6), height: 0, anchor: [4.0, 16.75, 0.1] },
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

export function terracedLongScene(scheme: MapScheme): Scene {
  return (scenes[scheme] ??= buildScene(createKit(scheme === 'dark')));
}

function buildScene(kit: Kit): Scene {
  drawSurroundings(kit);
  drawGarden(kit);
  return finishScene(
    kit,
    SLOTS,
    {
      focus: { x0: 0, x1: 8, y0: -2, y1: 25.5, z: 3 },
      limits: { x0: -5, x1: 13, y0: -9, y1: 30, z: 0 },
      fireflies: kit.isNight ? FIREFLIES : [],
    },
    kit.ctx.meadow,
  );
}

function drawSurroundings(kit: Kit) {
  const { p, ctx, isNight } = kit;
  const { x0, x1, y0, y1 } = WORLD;
  const plots: [number, number][] = [[-16, -8], [-8, 0], [8, 16], [16, 24]];

  p.layer(p.ground, () => {
    p.rect(x0, y0, x1, y1, 0, ctx.meadow);
    // Rue devant les maisons
    p.rect(x0, -12.6, x1, -11.6, 0, ctx.gravel);
    p.rect(x0, -11.6, x1, -7.6, 0, ctx.road);
    for (let x = x0 + 0.5; x < x1; x += 3) p.rect(x, -9.68, x + 1.5, -9.52, 0, ctx.roadLine);
    p.rect(x0, -7.6, x1, -6, 0, ctx.gravel);
    // Jardins voisins
    for (const [xa, xb] of plots) {
      p.rect(xa, 0, xb, 24.92, 0, ctx.lawnA);
      p.rect(xa, 0, xb, 2.4, 0, ctx.terrace);
    }
    // Allée commune derrière les jardins
    p.rect(x0, 25.25, x1, 26.75, 0, ctx.gravel);
    p.line([x0, 25.25, 0], [x1, 25.25, 0], ctx.edging, 0.8, 0.6);
    p.line([x0, 26.75, 0], [x1, 26.75, 0], ctx.edging, 0.8, 0.6);
    // Pré au-delà des champs
    p.rect(6, 29, 24, 38, 0, ctx.meadowDark);
  });
  drawField(kit, ctx, -16, 29, 3.5, 40, 'y');

  // La rangée de maisons
  drawHouse(kit, ctx, { x0: -16, x1: -8, y0: -6, y1: 0, h: 5.4, ridge: 7.9, windows: [[-14.5, -13, 0.9, 2.35, false], [-11, -9.5, 0.9, 2.35, true], [-14.5, -13, 3.3, 4.8, true], [-11, -9.5, 3.3, 4.8, false]] });
  drawHouse(kit, ctx, { x0: -8, x1: 0, y0: -6, y1: 0, h: 5.2, ridge: 7.6, windows: [[-6.5, -5, 0, 2.2, true], [-3, -1.5, 0.9, 2.2, false], [-6.5, -5, 3.0, 4.4, false], [-3, -1.5, 3.0, 4.4, true]] });
  drawHouse(kit, ctx, { x0: 8, x1: 16, y0: -6, y1: 0, h: 5.9, ridge: 8.5, chimney: [9.6, 10.1], windows: [[9, 10.5, 0.9, 2.35, false], [12.5, 14.5, 0, 2.35, true], [9, 10.5, 3.4, 4.9, true], [12.5, 14, 3.4, 4.9, false]] });
  drawHouse(kit, ctx, { x0: 16, x1: 24, y0: -6, y1: 0, h: 5.5, ridge: 8.0, windows: [[17, 18.5, 0.9, 2.35, true], [20.5, 22, 0.9, 2.35, false], [17, 18.5, 3.3, 4.8, false], [20.5, 22, 3.3, 4.8, false]] });
  for (const tx of [-14, -6, 2, 10, 18]) drawTree(kit, ctx, tx, -13.3, { r: 1.05, trunk: 1.4 });

  // Séparations et clôtures du fond des voisins
  drawFence(kit, ctx, -8.05, 0, -7.95, 24.92, 1.1);
  drawFence(kit, ctx, 15.95, 0, 16.05, 24.92, 1.1);
  for (const [xa, xb] of plots) drawFence(kit, ctx, xa, 24.92, xb, 25.0);

  // Jardin voisin, à gauche
  drawTree(kit, ctx, -4.5, 12.5, { r: 1.3, trunk: 1.5 });
  drawBush(kit, ctx, -1.0, 4.2, 0.5);
  drawBush(kit, ctx, -6.8, 5.0, 0.42);
  drawOutbuilding(kit, ctx, -7.4, 19.4, -5.6, 21.2);
  p.layer(p.ground, () => {
    for (let y = 3.0; y < 18.5; y += 1.1) p.rect(-4.25, y, -3.75, y + 0.45, 0, ctx.stone);
  });
  // Plus loin à gauche
  drawTree(kit, ctx, -12.5, 8, { r: 1.2, fruit: ctx.apple });
  drawConifer(kit, ctx, -15, 3.5, 3.5);
  drawBush(kit, ctx, -9, 14, 0.5);
  drawField(kit, ctx, -15.2, 17, -10.5, 22, 'x');

  // Jardin voisin, à droite
  drawTree(kit, ctx, 12.5, 6.5, { r: 1.3, trunk: 1.6 });
  p.layer(p.ground, () => {
    p.ellipseGround(13.4, 13, 0, 1.0, 1.4, ctx.stoneEdge);
    p.ellipseGround(13.4, 13, 0.01, 0.82, 1.2, isNight ? ctx.waterNight : ctx.water);
  });
  drawBush(kit, ctx, 15.2, 10.6, 0.48);
  drawBush(kit, ctx, 9.4, 14.6, 0.36);
  for (const [bx, by] of [[9, 17.6], [9, 20]]) {
    p.layer(p.ground, () => p.rect(bx, by, bx + 1.8, by + 1.6, 0, ctx.plot));
    p.object(depth(bx + 0.9, by + 0.8), () => {
      p.box(bx, by, 0, bx + 1.8, by + 1.6, 0.3, ctx.wood);
      p.rect(bx + 0.08, by + 0.08, bx + 1.72, by + 1.52, 0.305, ctx.soilBed);
      for (let y = by + 0.35; y < by + 1.4; y += 0.4) {
        for (let x = bx + 0.3; x < bx + 1.6; x += 0.4) p.sphere(x, y, 0.36, 0.09, ctx.leafLight);
      }
    });
  }
  // Plus loin à droite
  drawTree(kit, ctx, 20, 14, { r: 1.6, trunk: 1.8 });
  drawOutbuilding(kit, ctx, 21.5, 21, 23.4, 23);
  drawBush(kit, ctx, 17, 5, 0.5);
  drawConifer(kit, ctx, 23, 4, 3.8);
  p.layer(p.ground, () => {
    for (let y = 3.0; y < 20; y += 1.1) p.rect(19.75, y, 20.25, y + 0.45, 0, ctx.stone);
  });

  // L'allée, sa haie et les champs
  drawHedge(kit, ctx, x0, 27, x1, 27.85, 0.8);
  for (const lx of [-8.5, 7.3, 19.5]) drawLamp(kit, lx, 25.55);
  for (const [tx, ty, r] of [[9, 31, 1.4], [16, 33.5, 1.7], [22, 30.5, 1.2], [-17, 6, 1.2], [25, 18, 1.3]] as const) {
    drawTree(kit, ctx, tx, ty, { r, trunk: 1.6 });
  }
  for (const [cx, cy] of [[-17.2, 15], [25, 5], [12.5, 36]] as const) drawConifer(kit, ctx, cx, cy, 4);
}

function drawGarden(kit: Kit) {
  const { p, pal, isNight } = kit;
  p.layer(p.ground, () => {
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

  drawHouse(kit, pal, {
    x0: 0, x1: 8, y0: -6, y1: 0, h: 5.6, ridge: 8.1, chimney: [6.5, 7.1],
    windows: [[1.0, 3.0, 0, 2.35, true], [4.7, 7.0, 0.9, 2.35, true], [1.25, 2.75, 3.3, 4.8, true], [5.1, 6.6, 3.3, 4.8, false]],
  });
  p.object(depth(3.35, 0.05), () => {
    p.polygon([[3.27, 0.02, 2.3], [3.43, 0.02, 2.3], [3.43, 0.02, 2.62], [3.27, 0.02, 2.62]], pal.lampBox);
    p.line([7.85, 0.02, 5.5], [7.85, 0.02, 0.05], pal.pipe, 1.4);
  }, 1);
  if (isNight) {
    p.layer(p.lights, () => {
      p.glow(2.0, 1.4, 0, 1.9, GLOW, 0.7, 0.75);
      p.glow(5.85, 1.0, 0, 1.6, GLOW, 0.5, 0.7);
      p.glow(3.35, 0.05, 2.45, 1.1, GLOW, 0.9);
    });
  }

  // Murs mitoyens en brique, découpés en segments pour l'ordre d'affichage.
  for (const [xa, xb] of [[0, 0.25], [7.75, 8]]) {
    for (let y = 0; y < 25 - 1e-6; y += 1.25) {
      const yb = Math.min(25, y + 1.25);
      p.object(depth((xa + xb) / 2, (y + yb) / 2), () => {
        p.box(xa, y, 0, xb, yb, 1.8, { top: pal.brickTop, side: pal.brick });
        for (const z of [0.45, 0.9, 1.35]) p.line([xa, y, z], [xa, yb, z], pal.mortar, 0.6, 0.7);
      });
    }
  }
  drawFence(kit, pal, 0.25, 24.92, 7.75, 25.0);

  drawPot(kit, 0.7, 0.6);
  drawPot(kit, 0.7, 2.6);
  drawPot(kit, 7.25, 0.65);
  drawPot(kit, 7.25, 1.2);
  drawPatioSet(kit, 5.6, 1.6);

  // Chaque emplacement étiquette ses objets : ils rebondissent quand on le touche.
  p.within('orchard', () => drawTree(kit, pal, 1.7, 7.0, { fruit: pal.apple }));
  p.within('small-fruit', () => {
    [5.4, 6.6, 7.8, 9.0].forEach((y) => drawBush(kit, pal, 7.05, y, 0.44, pal.berry));
    drawBush(kit, pal, 6.95, 10.35, 0.58, pal.berry);
  });

  p.within('greenhouse', () => drawGreenhouse(kit, GH.x0, GH.y0));
  p.within('vegetable', () => {
    p.within('bed-1', () => drawBed(kit, ...BEDS['bed-1'], 'summer'));
    p.within('bed-2', () => drawBed(kit, ...BEDS['bed-2'], 'lettuce'));
    p.within('bed-3', () => drawBed(kit, ...BEDS['bed-3'], 'leek'));
    p.within('bed-4', () => drawBed(kit, ...BEDS['bed-4'], 'seedlings'));
  });
  p.within('firewood', () => drawFirewood(kit, FIREWOOD.x0, FIREWOOD.y0));
  drawShed(kit, 5.0, 22.7);
  drawWateringCan(kit, 4.75, 16.25);
  drawWheelbarrow(kit, 4.0, 23.9);
}
