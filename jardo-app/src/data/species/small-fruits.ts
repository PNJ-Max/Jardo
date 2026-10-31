import type { Species } from '@/domain/species';

export const smallFruits: readonly Species[] = [
  {
    id: 'raspberry',
    name: 'Framboisier',
    aliases: ['Framboise'],
    scientificName: 'Rubus idaeus',
    category: 'SmallFruit',
    plant: [{ from: 'Oct2', to: 'Mar1' }],
    // Une plage par type de variété : framboisier d'été, puis framboisier d'automne.
    harvest: [
      { from: 'Jun2', to: 'Aug1' },
      { from: 'Aug2', to: 'Oct1' },
    ],
    prune: [
      { from: 'Aug1', to: 'Sep1' },
      { from: 'Nov1', to: 'Feb2' },
    ],
    spacingCm: { plants: 50, rows: 150 },
    exposure: 'Sun',
    wateringEveryDays: 7,
    quantityUnit: 'Plants',
    harvestUnit: 'Grams',
    tips: [
      "Framboisier d'été : après la récolte, couper au ras du sol les tiges qui ont donné.",
      "Framboisier d'automne : tout rabattre au ras du sol en fin d'automne ou en hiver.",
      'Pailler le pied : ses racines, superficielles, craignent le sec.',
    ],
  },
];
