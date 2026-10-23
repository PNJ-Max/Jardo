import { findLayout, findSlot, gardenLayouts } from '@/data/garden-layouts';
import { SLOT_KEYS, ZONE_SLOTS } from '@/map/layouts';

describe('Catalogue des modèles de carte', () => {
  it('Contient les modèles terraced-long et country-house', () => {
    expect(gardenLayouts.map((layout) => layout.key)).toEqual(['terraced-long', 'country-house']);
    expect(findLayout('loft')).toBeUndefined();
  });

  it.each(gardenLayouts.map((layout) => layout.key))('%s pose les mêmes emplacements que la carte dessine', (key) => {
    const layout = findLayout(key)!;

    expect(layout.slots.map((slot) => slot.key)).toEqual([...SLOT_KEYS]);
    expect(layout.slots.filter((slot) => slot.acceptsZone).map((slot) => slot.key)).toEqual([...ZONE_SLOTS]);
  });

  it('Chaque emplacement accueille le type d\'espace de sa clé', () => {
    const layout = findLayout('country-house')!;

    expect(findSlot(layout, 'orchard')).toEqual({ key: 'orchard', kind: 'Orchard', acceptsZone: false });
    expect(findSlot(layout, 'bed-3')).toEqual({ key: 'bed-3', kind: 'VegetableGarden', acceptsZone: true });
    expect(findSlot(layout, 'firewood')?.kind).toBe('Firewood');
    expect(findSlot(layout, 'bed-5')).toBeUndefined();
  });
});
