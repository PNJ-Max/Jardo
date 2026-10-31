import type { Species } from '@/domain/species';

export const fruitTrees: readonly Species[] = [
  {
    id: 'apple-tree',
    name: 'Pommier',
    aliases: ['Pomme'],
    scientificName: 'Malus domestica',
    category: 'FruitTree',
    plant: [{ from: 'Nov1', to: 'Mar1' }],
    harvest: [{ from: 'Aug2', to: 'Nov1' }],
    prune: [{ from: 'Dec2', to: 'Mar1' }],
    spacingCm: { plants: 400 },
    exposure: 'Sun',
    quantityUnit: 'Plants',
    harvestUnit: 'Kilograms',
    tips: [
      'Compter 3 à 4 m entre deux basses tiges, 8 à 10 m entre deux hautes tiges.',
      'Tailler hors gel ; arroser la première année par temps sec.',
      'Planter deux variétés qui fleurissent en même temps : la plupart en ont besoin.',
    ],
  },
];
