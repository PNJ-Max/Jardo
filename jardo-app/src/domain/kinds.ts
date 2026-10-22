import type { JournalEntryKind, SpaceKind } from './types';

// Ce que chaque type d'espace accueille : le type d'un espace décide de ce qu'on peut y ajouter.

export const acceptsPlants = (spaceKind: SpaceKind) => spaceKind !== 'Firewood';

export const acceptsWoodPiles = (spaceKind: SpaceKind) => spaceKind === 'Firewood';

export const isWoodKind = (kind: JournalEntryKind) => kind === 'WoodSupply' || kind === 'WoodConsumption';

/** Une quantité accompagne une récolte et les mouvements de bois, pas les autres interventions. */
export const acceptsQuantity = (kind: JournalEntryKind) => kind === 'Harvest' || isWoodKind(kind);

/**
 * Le bois ne se note que dans un espace bois de chauffage, les soins aux plantes que là où l'on
 * peut en avoir ; une observation ou une autre intervention se note partout.
 */
export function isEntryKindAllowedIn(kind: JournalEntryKind, spaceKind: SpaceKind): boolean {
  if (isWoodKind(kind)) return acceptsWoodPiles(spaceKind);
  if (kind === 'Observation' || kind === 'Other') return true;
  return acceptsPlants(spaceKind);
}

const spaceKindLabels: Record<SpaceKind, string> = {
  VegetableGarden: 'potager',
  Orchard: 'verger',
  SmallFruit: 'petits fruits',
  Firewood: 'bois de chauffage',
  Greenhouse: 'serre',
};

const entryKindLabels: Record<JournalEntryKind, string> = {
  Watering: 'arrosage',
  Sowing: 'semis',
  Planting: 'plantation',
  Pruning: 'taille',
  Treatment: 'traitement',
  Fertilizing: 'fertilisation',
  Harvest: 'récolte',
  Observation: 'observation',
  WoodSupply: 'apport de bois',
  WoodConsumption: 'consommation de bois',
  Other: 'autre',
};

/** Libellés pour les messages d'erreur : « un espace potager n'accueille pas… ». */
export const spaceKindLabel = (kind: SpaceKind) => spaceKindLabels[kind];

export const entryKindLabel = (kind: JournalEntryKind) => entryKindLabels[kind];
