import type { SpaceKind } from '@/domain/types';

/** Un emplacement d'un modèle de carte et ce qu'il accepte. */
export type MapSlotDefinition = {
  /** Clé partagée avec la carte, qui dessine l'emplacement sous la même clé (`src/map/layouts.ts`). */
  key: string;
  /** Type de l'espace accueilli, ou de l'espace dont on accueille une zone. */
  kind: SpaceKind;
  /** Vrai si l'emplacement accueille une zone de l'espace plutôt que l'espace. */
  acceptsZone: boolean;
};

export type GardenLayout = {
  /** Clé stockée dans `gardens.map_layout`. */
  key: string;
  slots: readonly MapSlotDefinition[];
};

const space = (key: string, kind: SpaceKind): MapSlotDefinition => ({ key, kind, acceptsZone: false });
const zoneOf = (key: string, kind: SpaceKind): MapSlotDefinition => ({ key, kind, acceptsZone: true });

// Les deux modèles dessinés posent les mêmes emplacements aux mêmes règles : seuls le dessin et
// l'emprise de chacun diffèrent, et ils vivent côté carte, sous la même clé. Renommer une clé
// casse le contrat avec elle.
const slots: readonly MapSlotDefinition[] = [
  space('orchard', 'Orchard'),
  space('small-fruit', 'SmallFruit'),
  space('vegetable', 'VegetableGarden'),
  zoneOf('bed-1', 'VegetableGarden'),
  zoneOf('bed-2', 'VegetableGarden'),
  zoneOf('bed-3', 'VegetableGarden'),
  zoneOf('bed-4', 'VegetableGarden'),
  space('greenhouse', 'Greenhouse'),
  space('firewood', 'Firewood'),
];

export const terracedLong = 'terraced-long';
export const countryHouse = 'country-house';

/** Catalogue des modèles de carte (`GardenLayouts`). */
export const gardenLayouts: readonly GardenLayout[] = [
  // Maison mitoyenne, jardin en longueur.
  { key: terracedLong, slots },
  // Maison de campagne au milieu d'un grand terrain, retenue pour le MVP.
  { key: countryHouse, slots },
];

export const findLayout = (key: string) => gardenLayouts.find((layout) => layout.key === key);

export const findSlot = (layout: GardenLayout, slotKey: string) => layout.slots.find((slot) => slot.key === slotKey);
