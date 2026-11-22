import type { GardenMap, GardenTask } from '@/api/types';
import { waitingBySlot } from '@/lib/garden-map';

const task = (spaceId: string, zoneId: string | null = null) => ({ spaceId, zoneId }) as GardenTask;

describe('waitingBySlot', () => {
  it("compte tout l'espace sur son emplacement, et la seule parcelle sur la sienne", () => {
    const map: GardenMap = {
      layout: 'country-house',
      slots: [
        { slotKey: 'vegetable', spaceId: 'potager', spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: null, zoneName: null },
        { slotKey: 'bed-1', spaceId: 'potager', spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: 'p1', zoneName: 'Parcelle 1' },
        { slotKey: 'bed-2', spaceId: 'potager', spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: 'p2', zoneName: 'Parcelle 2' },
        { slotKey: 'orchard', spaceId: 'verger', spaceName: 'Verger', spaceKind: 'Orchard', zoneId: null, zoneName: null },
      ],
    };

    const counts = waitingBySlot(map, [task('potager'), task('potager', 'p1'), task('potager', 'p1'), task('serre')]);

    expect(Object.fromEntries(counts)).toEqual({ vegetable: 3, 'bed-1': 2 });
  });
});
