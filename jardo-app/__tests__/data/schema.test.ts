import type { Db, SqlValue } from '@/data/db';

import { createTestDb } from '../../test/db';

const now = '2026-06-15T08:00:00.000Z';
let sequence = 0;

async function insert(db: Db, table: string, row: Record<string, SqlValue>): Promise<string> {
  const values = { id: `${table}-${++sequence}`, ...row };
  const columns = Object.keys(values);
  await db.run(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    Object.values(values),
  );
  return values.id;
}

async function gardenDb() {
  const db = await createTestDb();
  const gardenId = (await db.first<{ id: string }>('SELECT id FROM gardens'))!.id;

  const space = (name: string, kind = 'VegetableGarden') =>
    insert(db, 'spaces', { garden_id: gardenId, name, kind, created_at: now });
  const zone = (spaceId: string, name: string) => insert(db, 'zones', { space_id: spaceId, name, created_at: now });
  const plant = (spaceId: string, zoneId: string | null = null) =>
    insert(db, 'garden_items', {
      item_type: 'Plant',
      space_id: spaceId,
      zone_id: zoneId,
      name: 'Tomates',
      quantity: 6,
      quantity_unit: 'Plants',
      created_at: now,
    });
  const entry = (spaceId: string, zoneId: string | null, itemId: string | null) =>
    insert(db, 'journal_entries', {
      kind: 'Watering',
      date: '2026-06-15',
      space_id: spaceId,
      zone_id: zoneId,
      item_id: itemId,
      created_at: now,
    });
  const task = (spaceId: string, zoneId: string | null, itemId: string | null) =>
    insert(db, 'garden_tasks', {
      kind: 'Watering',
      recurrence: 'EveryNDays',
      start_date: '2026-06-01',
      interval_days: 2,
      space_id: spaceId,
      zone_id: zoneId,
      item_id: itemId,
      created_at: now,
    });
  const slot = (slotKey: string, spaceId: string, zoneId: string | null = null) =>
    insert(db, 'garden_map_slots', { garden_id: gardenId, slot_key: slotKey, space_id: spaceId, zone_id: zoneId });
  const count = async (table: string) => (await db.first<{ n: number }>(`SELECT count(*) AS n FROM ${table}`))!.n;

  return { db, gardenId, space, zone, plant, entry, task, slot, count };
}

describe('schéma', () => {
  it("refuse deux espaces du même nom dans un jardin", async () => {
    const { space } = await gardenDb();
    await space('Potager');

    await expect(space('Potager')).rejects.toThrow(/UNIQUE/);
  });

  it('refuse deux zones du même nom dans un espace, pas dans deux espaces', async () => {
    const { space, zone } = await gardenDb();
    const potager = await space('Potager');
    const serre = await space('Serre', 'Greenhouse');
    await zone(potager, 'Carré 1');

    await expect(zone(potager, 'Carré 1')).rejects.toThrow(/UNIQUE/);
    await expect(zone(serre, 'Carré 1')).resolves.toBeDefined();
  });

  it('refuse deux espaces sur le même emplacement de la carte', async () => {
    const { space, slot } = await gardenDb();
    await slot('orchard', await space('Verger', 'Orchard'));

    await expect(slot('orchard', await space('Potager'))).rejects.toThrow(/UNIQUE/);
  });

  it('refuse une référence vers une ligne qui n\'existe pas', async () => {
    const { db, zone } = await gardenDb();

    await expect(zone('missing', 'Carré 1')).rejects.toThrow(/FOREIGN KEY/);
    await expect(
      insert(db, 'spaces', { garden_id: 'missing', name: 'Potager', kind: 'Orchard', created_at: now }),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it("refuse de supprimer un espace ou une zone qui contient un élément", async () => {
    const { db, space, zone, plant, count } = await gardenDb();
    const potager = await space('Potager');
    const carre = await zone(potager, 'Carré 1');
    await plant(potager, carre);

    await expect(db.run('DELETE FROM zones WHERE id = ?', [carre])).rejects.toThrow(/FOREIGN KEY/);
    await expect(db.run('DELETE FROM spaces WHERE id = ?', [potager])).rejects.toThrow(/FOREIGN KEY/);
    expect(await count('garden_items')).toBe(1);
  });

  it('emporte avec un espace vide ses zones, son journal, ses tâches et ses emplacements', async () => {
    const { db, space, zone, entry, task, slot, count } = await gardenDb();
    const potager = await space('Potager');
    const carre = await zone(potager, 'Carré 1');
    await entry(potager, carre, null);
    await task(potager, null, null);
    await slot('vegetable', potager);
    await slot('bed-1', potager, carre);
    await space('Verger', 'Orchard');

    await db.run('DELETE FROM spaces WHERE id = ?', [potager]);

    expect(await count('zones')).toBe(0);
    expect(await count('journal_entries')).toBe(0);
    expect(await count('garden_tasks')).toBe(0);
    expect(await count('garden_map_slots')).toBe(0);
    expect(await count('spaces')).toBe(1);
  });

  it('libère l\'emplacement d\'une zone supprimée, sans toucher à son espace', async () => {
    const { db, space, zone, slot, count } = await gardenDb();
    const potager = await space('Potager');
    const carre = await zone(potager, 'Carré 1');
    await slot('vegetable', potager);
    await slot('bed-1', potager, carre);

    await db.run('DELETE FROM zones WHERE id = ?', [carre]);

    expect(await db.all('SELECT slot_key FROM garden_map_slots')).toEqual([{ slot_key: 'vegetable' }]);
    expect(await count('spaces')).toBe(1);
  });

  it('emporte avec un élément son journal et ses tâches', async () => {
    const { db, space, plant, entry, task, count } = await gardenDb();
    const potager = await space('Potager');
    const tomates = await plant(potager);
    await entry(potager, null, tomates);
    await task(potager, null, tomates);
    await entry(potager, null, null);

    await db.run('DELETE FROM garden_items WHERE id = ?', [tomates]);

    expect(await count('journal_entries')).toBe(1);
    expect(await count('garden_tasks')).toBe(0);
  });

  it('emporte tout le contenu avec le jardin', async () => {
    const { db, gardenId, space, zone, slot, count } = await gardenDb();
    const potager = await space('Potager');
    await slot('bed-1', potager, await zone(potager, 'Carré 1'));

    await db.run('DELETE FROM gardens WHERE id = ?', [gardenId]);

    expect(await count('spaces')).toBe(0);
    expect(await count('zones')).toBe(0);
    expect(await count('garden_map_slots')).toBe(0);
  });

  it('refuse une valeur du mauvais type', async () => {
    const { db, gardenId } = await gardenDb();

    await expect(
      insert(db, 'spaces', { garden_id: gardenId, name: 'Potager', kind: 'VegetableGarden', is_archived: 'non', created_at: now }),
    ).rejects.toThrow(/cannot store TEXT value in INTEGER column/);
  });
});
