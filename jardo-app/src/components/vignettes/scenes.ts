// Scènes des vignettes d'espace, dessinées avec le pinceau de la carte : un pan de jardin posé
// sur sa tranche de terre, de jour en mode clair et de nuit en mode sombre. Chaque scène place
// son socle en x de 0 à w et en y de 0 à d, en mètres.

import type { SpaceKind } from '@/domain/types';
import {
  createKit,
  drawBed,
  drawBush,
  drawFirewood,
  drawGreenhouse,
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
    drawGround(kit, 6.4, 5.6);
    drawTree(kit, kit.pal, 1.9, 2.7, { r: 1.25, trunk: 1.4, fruit: kit.pal.apple });
    drawTree(kit, kit.pal, 4.5, 3.9, { r: 1.15, trunk: 1.3, fruit: kit.pal.apple });
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
    drawGround(kit, 5.6, 4.6);
    drawFirewood(kit, 0.6, 1.4);
    drawWheelbarrow(kit, 4.55, 3.4);
  },
};

export function vignetteDrawing(kind: SpaceKind, scheme: VignetteScheme): VignetteDrawing {
  const kit = createKit(scheme === 'dark');
  scenes[kind](kit);
  return kit.p.shapes();
}

const palettes: Record<VignetteScheme, Palette> = {
  light: createKit(false).pal,
  dark: createKit(true).pal,
};

/** Les teintes du décor de la carte, de jour ou de nuit : bois, terre, feuillage, fruits. */
export const decorPalette = (scheme: VignetteScheme) => palettes[scheme];
