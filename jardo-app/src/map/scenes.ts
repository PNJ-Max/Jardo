import { countryHouseScene } from './country-house';
import type { MapScheme, Scene } from './layouts';
import { terracedLongScene } from './terraced-long';

// Sous la clé du modèle que stocke l'API (catalogue GardenLayouts).
const scenes = {
  'country-house': countryHouseScene,
  'terraced-long': terracedLongScene,
} satisfies Record<string, (scheme: MapScheme) => Scene>;

export type DrawnLayout = keyof typeof scenes;

/** Vrai si le front sait dessiner ce modèle. */
export function isDrawn(layout: string | null): layout is DrawnLayout {
  return layout !== null && Object.hasOwn(scenes, layout);
}

export const sceneOf = (layout: DrawnLayout, scheme: MapScheme): Scene => scenes[layout](scheme);
