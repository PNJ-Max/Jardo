import {
  acceptsPlants,
  acceptsQuantity,
  acceptsWoodPiles,
  entryKindLabel,
  isEntryKindAllowedIn,
  isWoodKind,
  spaceKindLabel,
} from '@/domain/kinds';
import { journalEntryKinds, spaceKinds, type JournalEntryKind, type SpaceKind } from '@/domain/types';

const plantCare: JournalEntryKind[] = [
  'Watering',
  'Sowing',
  'Planting',
  'Pruning',
  'Treatment',
  'Fertilizing',
  'Harvest',
];
const wood: JournalEntryKind[] = ['WoodSupply', 'WoodConsumption'];
const growingSpaces = spaceKinds.filter((kind) => kind !== 'Firewood');

describe('ce que chaque type d\'espace accueille', () => {
  it('seul le bois de chauffage refuse les plantes et accueille les tas de bois', () => {
    expect(spaceKinds.filter(acceptsPlants)).toEqual(['VegetableGarden', 'Orchard', 'SmallFruit', 'Greenhouse']);
    expect(spaceKinds.filter(acceptsWoodPiles)).toEqual(['Firewood']);
  });

  it.each(growingSpaces)('un espace %s accepte les soins aux plantes, pas le bois', (spaceKind: SpaceKind) => {
    expect(journalEntryKinds.filter((kind) => isEntryKindAllowedIn(kind, spaceKind))).toEqual([
      ...plantCare,
      'Observation',
      'Other',
    ]);
  });

  it('un espace bois de chauffage n\'accepte que le bois, l\'observation et l\'autre intervention', () => {
    expect(journalEntryKinds.filter((kind) => isEntryKindAllowedIn(kind, 'Firewood'))).toEqual([
      'Observation',
      ...wood,
      'Other',
    ]);
  });

  it('seules la récolte et les mouvements de bois portent une quantité', () => {
    expect(journalEntryKinds.filter(acceptsQuantity)).toEqual(['Harvest', ...wood]);
    expect(journalEntryKinds.filter(isWoodKind)).toEqual(wood);
  });

  it('chaque type a un libellé pour les messages', () => {
    expect(spaceKindLabel('Firewood')).toBe('bois de chauffage');
    expect(spaceKindLabel('SmallFruit')).toBe('petits fruits');
    expect(entryKindLabel('WoodConsumption')).toBe('consommation de bois');
    expect(spaceKinds.every((kind) => spaceKindLabel(kind) !== '')).toBe(true);
    expect(journalEntryKinds.every((kind) => entryKindLabel(kind) !== '')).toBe(true);
  });
});
