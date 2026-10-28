// Scènes des vignettes d'espace, dessinées avec le pinceau de la carte : un pan de jardin posé
// sur sa tranche de terre, de jour en mode clair et de nuit en mode sombre. Chaque scène place
// son socle en x de 0 à w et en y de 0 à d, en mètres. L'horizon du ciel d'Aujourd'hui suit.

import type { SpaceKind } from '@/domain/types';
import {
  createKit,
  drawBed,
  drawBush,
  drawConifer,
  drawFireflies,
  drawFirewood,
  drawGreenhouse,
  drawHouse,
  drawPot,
  drawTree,
  drawWateringCan,
  drawWheelbarrow,
  type Kit,
  type Palette,
} from '@/map/decor';
import type { Bounds, Shape } from '@/map/scene';

export type VignetteScheme = 'light' | 'dark';

export type VignetteDrawing = { shapes: Shape[]; bounds: Bounds };

/** Le socle : la pelouse tondue en bandes, sur une tranche de terre. */
function drawGround(kit: Kit, w: number, d: number) {
  const { p, pal } = kit;
  p.layer(p.ground, () => {
    p.box(0, 0, -0.75, w, d, -0.16, pal.soilBed);
    p.box(0, 0, -0.16, w, d, 0, { top: pal.lawnA, side: pal.lawnB });
    for (let x = 0.8; x < w; x += 1.6) p.rect(x, 0, Math.min(x + 0.8, w), d, 0.001, pal.lawnB);
  });
}

/** Une bande de terre paillée sous un rang. */
function drawRowStrip({ p, pal }: Kit, x0: number, x1: number, y: number) {
  p.layer(p.ground, () => p.rect(x0, y - 0.45, x1, y + 0.45, 0.002, pal.mulch));
}

const scenes: Record<SpaceKind, (kit: Kit) => void> = {
  VegetableGarden: (kit) => {
    drawGround(kit, 6.9, 5.4);
    drawBed(kit, 0.55, 0.5, 'summer');
    drawBed(kit, 3.75, 0.5, 'leek');
    drawBed(kit, 0.55, 2.95, 'lettuce');
    drawBed(kit, 3.75, 2.95, 'seedlings');
  },
  Orchard: (kit) => {
    drawGround(kit, 6, 5.4);
    drawTree(kit, kit.pal, 1.8, 2.6, { r: 1.45, trunk: 1.4, fruit: kit.pal.apple });
    drawTree(kit, kit.pal, 4.3, 3.7, { r: 1.3, trunk: 1.3, fruit: kit.pal.apple });
  },
  SmallFruit: (kit) => {
    drawGround(kit, 6, 5);
    for (const [y, berry] of [[1.7, kit.pal.berry], [3.6, kit.pal.tomato]] as const) {
      drawRowStrip(kit, 0.5, 5.5, y);
      for (const x of [1.25, 3, 4.75]) drawBush(kit, kit.pal, x, y, 0.62, berry);
    }
  },
  Greenhouse: (kit) => {
    drawGround(kit, 5.4, 6.6);
    drawGreenhouse(kit, 0.7, 1.6);
    for (const x of [1.0, 1.65, 2.3]) drawPot(kit, x, 5.9);
    drawWateringCan(kit, 4.3, 5.2);
  },
  Firewood: (kit) => {
    drawGround(kit, 5, 4.3);
    drawFirewood(kit, 0.5, 1.3);
    drawWheelbarrow(kit, 4.1, 3.2);
  },
};

export function vignetteDrawing(kind: SpaceKind, scheme: VignetteScheme): VignetteDrawing {
  const kit = createKit(scheme === 'dark');
  scenes[kind](kit);
  return kit.p.shapes();
}

// L'horizon du ciel d'Aujourd'hui court en travers de l'écran : on pose ses éléments le long de
// y = x · tan 20°, la ligne que la projection rend horizontale.
const along = (x: number) => x * Math.tan((20 * Math.PI) / 180);
const horizonLength = 19;
const horizonDepth = 4.6;

/**
 * L'horizon du jardin : haie basse, fruitier, serre, maison et conifères, sur une bande de pelouse.
 * Les lucioles sont à part, pour clignoter par-dessus l'image fixe ; null de jour.
 */
export function horizonDrawing(scheme: VignetteScheme): { scene: VignetteDrawing; fireflies: VignetteDrawing | null } {
  const kit = createKit(scheme === 'dark');
  const { p, pal } = kit;
  p.layer(p.ground, () => {
    p.polygon(
      [[0, along(0), 0], [horizonLength, along(horizonLength), 0], [horizonLength, along(horizonLength) + horizonDepth, 0], [0, horizonDepth, 0]],
      pal.lawnA,
    );
    p.polygon(
      [[0, 2.6, 0], [horizonLength, along(horizonLength) + 2.6, 0], [horizonLength, along(horizonLength) + horizonDepth, 0], [0, horizonDepth, 0]],
      pal.lawnB,
    );
  });
  for (const x of [0.8, 2.3, 3.8, 5.3]) drawBush(kit, pal, x, along(x) + 0.9, 0.62);
  drawTree(kit, pal, 7.6, along(7.6) + 2.2, { r: 1.25, trunk: 1.3, fruit: pal.apple });
  drawGreenhouse(kit, 9.6, along(12.35) + 0.5);
  drawHouse(kit, pal, {
    x0: 13.2, x1: 16.6, y0: along(16.6) + 0.3, y1: along(16.6) + 2.9, h: 2.9, ridge: 4.6,
    windows: [[13.6, 14.6, 0.8, 2.0, true], [15.2, 16.2, 0.8, 2.0, false]],
    door: [14.75, 15.1],
    chimney: [15.6, 16.0],
  });
  drawConifer(kit, pal, 17.6, along(17.6) + 1.1, 3.6);
  drawConifer(kit, pal, 18.5, along(18.5) + 2.4, 2.8);

  if (scheme === 'light') return { scene: p.shapes(), fireflies: null };
  const lights = createKit(true);
  drawFireflies(lights, [[2.8, along(2.8) + 2.2, 1.2], [6.2, along(6.2) + 3.1, 1.8], [9.1, along(9.1) + 4.1, 0.9], [12.6, along(12.6) + 4.2, 1.5]]);
  return { scene: p.shapes(), fireflies: lights.p.shapes() };
}

const palettes: Record<VignetteScheme, Palette> = {
  light: createKit(false).pal,
  dark: createKit(true).pal,
};

/** Les teintes du décor de la carte, de jour ou de nuit : bois, terre, feuillage, fruits. */
export const decorPalette = (scheme: VignetteScheme) => palettes[scheme];
