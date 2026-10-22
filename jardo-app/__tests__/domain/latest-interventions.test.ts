// Jardo.Api n'a pas de test direct de LatestInterventions : la règle est couverte par les trois
// premiers cas de TaskServiceTests.cs, repris ici au niveau de la recherche de date.
import { addDays } from '@/domain/dates';
import { latestInterventions, type InterventionRow } from '@/domain/latest-interventions';
import type { JournalEntryKind } from '@/domain/types';

const today = '2026-06-15';
const ago = (days: number) => addDays(today, -days);

const potager = 'space-potager';
const verger = 'space-verger';
const carre = 'zone-carre-1';
const carre2 = 'zone-carre-2';
const rang = 'zone-rang-1';
const tomate = 'item-tomate';
const pommier = 'item-pommier';

const entry = (
  kind: JournalEntryKind,
  date: string,
  spaceId: string,
  { zoneId = null, itemId = null }: { zoneId?: string | null; itemId?: string | null } = {},
): InterventionRow => ({ kind, date, spaceId, zoneId, itemId });

describe('dernière intervention qui vaut pour une cible', () => {
  // TaskServiceTests.Une_tache_dun_element_compte_les_interventions_sur_sa_zone_et_son_espace
  it('une tâche d\'un élément compte les interventions sur sa zone et son espace', () => {
    const rows = [entry('Watering', ago(6), potager, { itemId: tomate })];
    const dateFor = () => latestInterventions(rows, 'Watering').forTarget(potager, carre, tomate);

    expect(dateFor()).toBe(ago(6));

    rows.push(entry('Watering', ago(3), potager, { zoneId: carre }));
    expect(dateFor()).toBe(ago(3));

    rows.push(entry('Watering', ago(1), potager), entry('Observation', today, potager, { itemId: tomate }));
    expect(dateFor()).toBe(ago(1));
  });

  // TaskServiceTests.Une_tache_de_zone_compte_lespace_mais_pas_les_elements_ni_les_autres_zones
  it('une tâche de zone compte l\'espace mais pas les éléments ni les autres zones', () => {
    const rows = [
      entry('Watering', ago(5), potager),
      entry('Watering', today, potager, { itemId: tomate }),
      entry('Watering', today, potager, { zoneId: carre2 }),
    ];

    expect(latestInterventions(rows, 'Watering').forTarget(potager, carre, null)).toBe(ago(5));
  });

  // TaskServiceTests.Une_tache_despace_ne_compte_que_les_interventions_sur_tout_lespace
  it('une tâche d\'espace ne compte que les interventions sur tout l\'espace', () => {
    const rows = [
      entry('Pruning', '2026-02-03', verger, { zoneId: rang }),
      entry('Pruning', '2026-02-03', verger, { itemId: pommier }),
    ];

    expect(latestInterventions(rows, 'Pruning').forTarget(verger, null, null)).toBeNull();

    rows.push(entry('Pruning', '2026-01-25', verger));

    expect(latestInterventions(rows, 'Pruning').forTarget(verger, null, null)).toBe('2026-01-25');
  });

  it('ne compte que le type d\'intervention demandé', () => {
    const rows = [entry('Observation', today, potager), entry('Watering', ago(2), potager)];

    expect(latestInterventions(rows, 'Watering').forTarget(potager, null, null)).toBe(ago(2));
    expect(latestInterventions(rows, 'Pruning').forTarget(potager, null, null)).toBeNull();
  });

  it('garde la plus récente des interventions d\'une même cible, quel que soit l\'ordre des lignes', () => {
    const rows = [
      entry('Watering', ago(2), potager, { zoneId: carre }),
      entry('Watering', ago(9), potager, { zoneId: carre }),
      entry('Watering', ago(4), potager, { zoneId: carre }),
    ];

    expect(latestInterventions(rows, 'Watering').forTarget(potager, carre, null)).toBe(ago(2));
  });

  it('une intervention sur un élément ne vaut pas pour un autre élément de la même zone', () => {
    const rows = [entry('Watering', today, potager, { zoneId: carre, itemId: 'item-courgette' })];

    expect(latestInterventions(rows, 'Watering').forTarget(potager, carre, tomate)).toBeNull();
  });

  it('sans journal, aucune cible n\'a de date', () => {
    expect(latestInterventions([], 'Watering').forTarget(potager, carre, tomate)).toBeNull();
  });
});
