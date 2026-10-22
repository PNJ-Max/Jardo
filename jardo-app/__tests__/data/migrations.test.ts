import type { Db } from '@/data/db';
import { migrate, migrations } from '@/data/migrations';

import { createMemoryDb, createTestDb } from '../../test/db';

const version = async (db: Db) => (await db.first<{ user_version: number }>('PRAGMA user_version'))?.user_version;

const schema = (db: Db) =>
  db.all<{ type: string; name: string; sql: string | null }>(
    "SELECT type, name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name",
  );

describe('migrations', () => {
  it('amènent une base neuve à la dernière version, avec toutes les tables', async () => {
    const db = await createTestDb();

    expect(await version(db)).toBe(migrations.length);
    const tables = (await schema(db)).filter((entry) => entry.type === 'table').map((entry) => entry.name);
    expect(tables).toEqual([
      'garden_items',
      'garden_map_slots',
      'garden_tasks',
      'gardens',
      'journal_entries',
      'spaces',
      'zones',
    ]);
  });

  it('créent le jardin unique, vide, avec un UUID tiré au hasard', async () => {
    const [first, second] = await Promise.all([createTestDb(), createTestDb()]);

    const garden = await first.first<{ id: string; name: string; map_layout: string | null; created_at: string }>(
      'SELECT * FROM gardens',
    );
    expect(garden).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
      name: 'Mon jardin',
      map_layout: null,
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
    expect(await first.first('SELECT 1 FROM spaces')).toBeNull();
    expect((await second.first<{ id: string }>('SELECT id FROM gardens'))?.id).not.toBe(garden?.id);
  });

  it("migrent une base de chaque version précédente vers le schéma d'une base neuve", async () => {
    const expected = await schema(await createTestDb());

    for (let previous = 0; previous < migrations.length; previous++) {
      const db = createMemoryDb();
      await migrate(db, migrations.slice(0, previous));
      expect(await version(db)).toBe(previous);

      await migrate(db);

      expect(await version(db)).toBe(migrations.length);
      expect(await schema(db)).toEqual(expected);
    }
  });

  it('ne refont rien sur une base à jour', async () => {
    const db = await createTestDb();
    const garden = await db.first('SELECT * FROM gardens');

    await migrate(db);

    expect(await db.all('SELECT * FROM gardens')).toEqual([garden]);
  });

  it('gardent les données de la version précédente', async () => {
    const db = await createTestDb({ exampleGarden: true });
    const spaces = await db.all('SELECT id, name FROM spaces ORDER BY name');

    await migrate(db, [...migrations, 'ALTER TABLE spaces ADD COLUMN color TEXT;']);

    expect(await version(db)).toBe(migrations.length + 1);
    expect(await db.all('SELECT id, name FROM spaces ORDER BY name')).toEqual(spaces);
    expect(await db.first('SELECT color FROM spaces')).toEqual({ color: null });
  });

  it('annulent en entier une migration qui échoue, version comprise', async () => {
    const db = await createTestDb();
    const failing = 'CREATE TABLE photos (id TEXT PRIMARY KEY NOT NULL) STRICT; INSERT INTO missing VALUES (1);';

    await expect(migrate(db, [...migrations, failing])).rejects.toThrow(/missing/);

    expect(await version(db)).toBe(migrations.length);
    expect(await db.first("SELECT 1 FROM sqlite_schema WHERE name = 'photos'")).toBeNull();
  });

  it("refusent une base plus récente que l'app", async () => {
    const db = await createTestDb();
    await db.exec(`PRAGMA user_version = ${migrations.length + 1}`);

    await expect(migrate(db)).rejects.toThrow(/plus récente/);
  });
});
