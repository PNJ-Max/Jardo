// Contrat entre les modèles de scène et la carte : clés d'emplacement (partagées avec l'API,
// docs/etude-carte-potager.md), emprises, étiquettes et toucher.

import type { Kit } from './decor';
import { contains, project, silhouette, type Bounds, type Point, type Shape } from './scene';

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

export const ZONE_SLOTS: readonly SlotKey[] = ['bed-1', 'bed-2', 'bed-3', 'bed-4'];

export type MapScheme = 'light' | 'dark';

export type SceneSlot = {
  /** Contour du dessus de l'emplacement, à l'écran : ce que la sélection met en évidence. */
  outline: Point[];
  /** Silhouette à l'écran : la zone qui répond au toucher. */
  hit: Point[];
  /** Pointe de l'étiquette, à l'écran. */
  anchor: Point;
};

export type Scene = {
  shapes: Shape[];
  /** Tout le dessin. */
  bounds: Bounds;
  /** Le jardin : le cadrage de départ. */
  focus: Bounds;
  /** Le déplacement et le dézoom s'arrêtent à ces bords, couverts par le décor. */
  limits: Bounds;
  slots: Record<SlotKey, SceneSlot>;
  /** Couleur du sol au-delà du dessin. */
  background: string;
};

export type SlotSpec = {
  footprint: Point[];
  /** Hauteur du volume, pour la zone de toucher. */
  height: number;
  /** Hauteur du dessus, où se dessine la mise en évidence. */
  surface?: number;
  /** Pointe de l'étiquette, en mètres. */
  anchor: [number, number, number];
};

/** Ordre de recherche au toucher : les zones avant l'espace qui les contient. */
const HIT_ORDER: SlotKey[] = ['bed-1', 'bed-2', 'bed-3', 'bed-4', 'greenhouse', 'firewood', 'orchard', 'small-fruit', 'vegetable'];

/** L'emplacement sous un point de la scène, ou null sur le décor. */
export function slotAt(scene: Scene, point: Point): SlotKey | null {
  return HIT_ORDER.find((key) => contains(scene.slots[key].hit, point)) ?? null;
}

type Box = { x0: number; y0: number; x1: number; y1: number; z: number };

/** Emprise à l'écran d'une boîte en mètres. */
function screenBounds(box: Box): Bounds {
  const corners = [box.x0, box.x1].flatMap((x) =>
    [box.y0, box.y1].flatMap((y) => [project(x, y, 0), project(x, y, box.z)]),
  );
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/**
 * Assemble la scène dessinée. `focus` est la boîte du jardin, en mètres ; `limits`, celle
 * jusqu'où l'on peut se déplacer : le décor doit couvrir son emprise à l'écran.
 */
export function finishScene(
  { p }: Kit,
  specs: Record<SlotKey, SlotSpec>,
  { focus, limits }: { focus: Box; limits: Box },
  background: string,
): Scene {
  const { shapes, bounds } = p.shapes();
  const slots = Object.fromEntries(
    SLOT_KEYS.map((key) => {
      const { footprint, height, surface = 0, anchor } = specs[key];
      return [
        key,
        {
          outline: footprint.map(([x, y]) => project(x, y, surface)),
          hit: silhouette(footprint, height),
          anchor: project(...anchor),
        },
      ];
    }),
  ) as Record<SlotKey, SceneSlot>;
  return { shapes, bounds, focus: screenBounds(focus), limits: screenBounds(limits), slots, background };
}
