import {
  decimalText,
  entryKindsFor,
  formatQuantity,
  parseDecimal,
  quantityUnits,
  targetHref,
  targetLabel,
  taskKindsFor,
} from '@/lib/garden';

describe('vocabulaire du jardin', () => {
  it('ne propose au bois de chauffage que les interventions de bois', () => {
    const kinds = entryKindsFor('Firewood');
    expect(kinds).toEqual(['WoodSupply', 'WoodConsumption', 'Observation', 'Other']);
  });

  it('ne propose pas de bois ailleurs que dans le bois de chauffage', () => {
    const kinds = entryKindsFor('Orchard');
    expect(kinds).toContain('Pruning');
    expect(kinds).not.toContain('WoodSupply');
  });

  it('exclut les tâches de bois, impossibles à faire sans volume', () => {
    expect(taskKindsFor('Firewood', null)).toEqual(['Observation', 'Other']);
    expect(taskKindsFor('Firewood', 'WoodPile')).toEqual(['Observation', 'Other']);
    expect(taskKindsFor('VegetableGarden', 'Plant')).toContain('Watering');
  });

  it('accorde les unités : le pluriel commence à 2', () => {
    expect(formatQuantity(1, quantityUnits.Plants)).toBe('1 pied');
    expect(formatQuantity(1.5, quantityUnits.Plants)).toBe('1,5 pied');
    expect(formatQuantity(2, quantityUnits.Plants)).toBe('2 pieds');
  });

  it('lit un nombre tapé avec une virgule ou un point', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal(' 2.5 ')).toBe(2.5);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(decimalText(2.5)).toBe('2,5');
  });

  it('nomme une cible du plus précis au plus large', () => {
    expect(targetLabel({ itemName: 'Tomates', zoneName: 'Carré 1', spaceName: 'Potager' })).toBe(
      'Tomates · Carré 1 · Potager',
    );
    expect(targetLabel({ itemName: null, zoneName: null, spaceName: 'Potager' })).toBe('Potager');
  });

  it('mène à la fiche la plus précise de la cible', () => {
    expect(targetHref({ spaceId: 1, zoneId: 2, itemId: 3, itemKind: 'Plant' })).toBe('/plant/3');
    expect(targetHref({ spaceId: 1, zoneId: null, itemId: 3, itemKind: 'WoodPile' })).toBe('/wood-pile/3');
    expect(targetHref({ spaceId: 1, zoneId: 2, itemId: null, itemKind: null })).toBe('/zone/2');
    expect(targetHref({ spaceId: 1, zoneId: null, itemId: null, itemKind: null })).toBe('/space/1');
  });
});
