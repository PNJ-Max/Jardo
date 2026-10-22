import { createMemoryDb } from '../../test/db';

async function counterDb() {
  const db = createMemoryDb();
  await db.exec('CREATE TABLE counters (name TEXT PRIMARY KEY NOT NULL, value INTEGER NOT NULL) STRICT;');
  await db.run('INSERT INTO counters VALUES (?, ?)', ['done', 0]);
  return db;
}

const value = async (db: Awaited<ReturnType<typeof counterDb>>) =>
  (await db.first<{ value: number }>('SELECT value FROM counters'))?.value;

describe("l'accès à la base", () => {
  it('valide une transaction et renvoie le résultat du travail', async () => {
    const db = await counterDb();

    const result = await db.transaction(async () => {
      await db.run('UPDATE counters SET value = value + 1');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(await value(db)).toBe(1);
  });

  it("annule toute la transaction si le travail échoue, et laisse passer l'erreur", async () => {
    const db = await counterDb();

    await expect(
      db.transaction(async () => {
        await db.run('UPDATE counters SET value = value + 1');
        throw new Error('refusé');
      }),
    ).rejects.toThrow('refusé');

    expect(await value(db)).toBe(0);
  });

  it("passe les transactions lancées ensemble l'une après l'autre", async () => {
    const db = await counterDb();
    const increment = () =>
      db.transaction(async () => {
        const current = await value(db);
        await new Promise((resolve) => setTimeout(resolve, 5));
        await db.run('UPDATE counters SET value = ?', [current! + 1]);
      });

    const failing = db.transaction(async () => {
      throw new Error('refusé');
    });
    await Promise.all([increment(), failing.catch(() => undefined), increment()]);

    expect(await value(db)).toBe(2);
  });

  it('renvoie null quand aucune ligne ne correspond', async () => {
    const db = await counterDb();

    expect(await db.first('SELECT * FROM counters WHERE name = ?', ['missing'])).toBeNull();
  });
});
