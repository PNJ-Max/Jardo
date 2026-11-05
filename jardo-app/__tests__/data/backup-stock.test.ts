import { randomUUID } from 'node:crypto';

import { checkBackupRules } from '@/data/backup-rules';
import { createBackupService } from '@/data/backup';

import { createTestDb } from '../../test/db';
import { fixedClock } from '../../test/garden-data';

const clock = fixedClock('2026-11-05');

async function exampleFile(): Promise<any> {
  const db = await createTestDb({ exampleGarden: true });
  return JSON.parse(JSON.stringify(await createBackupService(db, clock).export()));
}

describe('contrôle du stock de bois à la lecture d’un fichier', () => {
  it('ne relit pas tout le journal pour chaque tas', async () => {
    const file = await exampleFile();
    const pile = file.tables.garden_items.find((item: any) => item.item_type === 'WoodPile');
    const supply = file.tables.journal_entries.find((entry: any) => entry.item_id === pile.id && entry.kind === 'WoodSupply');
    for (let index = 0; index < 300; index++) {
      const id = randomUUID();
      file.tables.garden_items.push({ ...pile, id, name: `Tas ${index}` });
      file.tables.journal_entries.push({ ...supply, id: randomUUID(), item_id: id });
    }

    let reads = 0;
    const journal = new Proxy(file.tables.journal_entries, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
        return Reflect.get(target, key, receiver);
      },
    });

    checkBackupRules({ ...file.tables, journal_entries: journal });

    expect(reads).toBeLessThan(5 * file.tables.journal_entries.length);
  });

  it('compte encore les mouvements de chaque tas', async () => {
    const file = await exampleFile();
    const pile = file.tables.garden_items.find((item: any) => item.item_type === 'WoodPile');
    pile.initial_steres = 0.01;

    expect(() => checkBackupRules(file.tables)).toThrow(/stock sous zéro/);
  });
});
