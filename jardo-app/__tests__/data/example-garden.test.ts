import { addDays } from '@/domain/dates';
import { prepareDatabase } from '@/data/database';
import { seedExampleGarden } from '@/data/example-garden';

import { createTestDb } from '../../test/db';

const today = '2026-06-15';

async function seededDb() {
  const db = await createTestDb();
  await seedExampleGarden(db, today, '2026-06-15T08:00:00.000Z');
  return db;
}

const counts = (db: Awaited<ReturnType<typeof seededDb>>) =>
  db.first(`
    SELECT
      (SELECT count(*) FROM spaces) AS spaces,
      (SELECT count(*) FROM spaces WHERE is_archived = 1) AS archived_spaces,
      (SELECT count(*) FROM zones) AS zones,
      (SELECT count(*) FROM garden_items WHERE item_type = 'Plant') AS plants,
      (SELECT count(*) FROM garden_items WHERE item_type = 'WoodPile') AS wood_piles,
      (SELECT count(*) FROM garden_items WHERE is_archived = 1) AS archived_items,
      (SELECT count(*) FROM journal_entries) AS journal_entries,
      (SELECT count(*) FROM garden_tasks) AS tasks,
      (SELECT count(*) FROM garden_map_slots) AS map_slots`);

describe("jardin d'exemple", () => {
  it('reprend le contenu de DbSeeder, carte comprise', async () => {
    const db = await seededDb();

    expect(await db.first('SELECT name, map_layout FROM gardens')).toEqual({
      name: 'Jardin des Tilleuls',
      map_layout: 'terraced-long',
    });
    expect(await counts(db)).toEqual({
      spaces: 6,
      archived_spaces: 1,
      zones: 8,
      plants: 18,
      wood_piles: 3,
      archived_items: 2,
      journal_entries: 53,
      tasks: 17,
      map_slots: 9,
    });
    expect(
      await db.all(`
        SELECT slot_key, spaces.name AS space, zones.name AS zone
        FROM garden_map_slots
        JOIN spaces ON spaces.id = garden_map_slots.space_id
        LEFT JOIN zones ON zones.id = garden_map_slots.zone_id
        WHERE slot_key IN ('bed-1', 'firewood')
        ORDER BY slot_key`),
    ).toEqual([
      { slot_key: 'bed-1', space: 'Potager', zone: 'Carré 1' },
      { slot_key: 'firewood', space: 'Bois de chauffage', zone: null },
    ]);
  });

  it('date tout par rapport au jour donné', async () => {
    const db = await seededDb();

    expect(await db.first("SELECT sown_date, planted_date FROM garden_items WHERE name = 'Tomates'")).toEqual({
      sown_date: addDays(today, -100),
      planted_date: addDays(today, -45),
    });
    expect(await db.first("SELECT start_date FROM garden_tasks WHERE title = 'Taille d''hiver'")).toEqual({
      start_date: '2026-02-01',
    });
    expect(await db.first("SELECT created_at FROM garden_tasks WHERE title = 'Planter les groseilliers'")).toEqual({
      created_at: '2026-06-05T08:00:00.000Z',
    });
  });

  it("note l'intervention sur un élément dans sa zone", async () => {
    const db = await seededDb();

    expect(
      await db.first(`
        SELECT zones.name AS zone
        FROM journal_entries
        JOIN garden_items ON garden_items.id = journal_entries.item_id
        JOIN zones ON zones.id = journal_entries.zone_id
        WHERE garden_items.name = 'Basilic'`),
    ).toEqual({ zone: 'Carré 1' });
  });

  it('laisse au chêne 4,5 stères', async () => {
    const db = await seededDb();

    const stock = await db.first<{ steres: number }>(`
      SELECT initial_steres
        + coalesce(sum(CASE journal_entries.kind WHEN 'WoodSupply' THEN journal_entries.quantity END), 0)
        - coalesce(sum(CASE journal_entries.kind WHEN 'WoodConsumption' THEN journal_entries.quantity END), 0)
        AS steres
      FROM garden_items
      JOIN journal_entries ON journal_entries.item_id = garden_items.id
      WHERE garden_items.name = 'Chêne du fond'`);

    expect(stock?.steres).toBeCloseTo(4.5);
  });

  it('ne se rajoute pas à un jardin qui a déjà des espaces', async () => {
    const db = await seededDb();
    const before = await counts(db);

    await seedExampleGarden(db, today, '2026-06-16T08:00:00.000Z');

    expect(await counts(db)).toEqual(before);
  });

  it("ne remplit pas une installation neuve hors développement", async () => {
    const db = await createTestDb();
    await prepareDatabase(db, { exampleGarden: false });

    expect(await db.first('SELECT name FROM gardens')).toEqual({ name: 'Mon jardin' });
    expect(await db.first('SELECT 1 FROM spaces')).toBeNull();
  });
});
