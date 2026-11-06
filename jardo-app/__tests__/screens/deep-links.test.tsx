import { act, cleanup } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { Db } from '@/data/db';
import { createServices } from '@/data/services';

import { createTestDb } from '../../test/db';
import { fixedClock } from '../../test/garden-data';
import { renderScreen } from '../../test/render';

// Skia ne tourne pas sous Jest, et la carte n'écrit rien.
jest.mock('@/components/map/map-viewport', () => ({ MapViewport: () => null }));

const appFolder = join(__dirname, '..', '..', 'src', 'app');

/** Chaque écran de `src/app`, sans les layouts : un écran ajouté plus tard entre tout seul dans ce test. */
function routeFiles(folder = appFolder): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name.startsWith('_layout') ? [] : [path];
  });
}

const routeName = (file: string) => relative(appFolder, file).split(sep).join('/').replace(/\.tsx$/, '');

/** Le Db de l'app, qui note tout ce qui pourrait écrire. */
function recording(db: Db) {
  const writes: string[] = [];
  const wrapped: Db = {
    exec: (sql) => {
      writes.push(sql);
      return db.exec(sql);
    },
    run: (sql, params) => {
      writes.push(sql);
      return db.run(sql, params);
    },
    all: (sql, params) => db.all(sql, params),
    first: (sql, params) => db.first(sql, params),
    transaction: (work) => {
      writes.push('transaction');
      return db.transaction(work);
    },
  };
  return { wrapped, writes };
}

const clock = fixedClock('2026-11-05');
const hostile = "'; DROP TABLE spaces; --";

// N'importe quelle app, ou une page web, peut ouvrir `jardo:///<écran>?<paramètres>`. Ouvrir un écran
// ne doit donc jamais écrire : seul un geste de l'utilisateur le peut.
describe('un écran ouvert par un lien', () => {
  it.each(routeFiles().map((file) => [routeName(file), file]))('%s n’écrit rien en s’ouvrant', async (_, file) => {
    const db = await createTestDb({ exampleGarden: true });
    const idOf = async (sql: string) => (await db.first<{ id: string }>(sql))!.id;
    const [space, zone, plant, pile, entry, task] = await Promise.all([
      idOf('SELECT id FROM spaces LIMIT 1'),
      idOf('SELECT id FROM zones LIMIT 1'),
      idOf("SELECT id FROM garden_items WHERE item_type = 'Plant' LIMIT 1"),
      idOf("SELECT id FROM garden_items WHERE item_type = 'WoodPile' LIMIT 1"),
      idOf('SELECT id FROM journal_entries LIMIT 1'),
      idOf('SELECT id FROM garden_tasks LIMIT 1'),
    ]);
    const paramSets: Record<string, unknown>[] = [
      {},
      ...[space, zone, plant, pile, entry, task].map((id) => ({ id })),
      { spaceId: space, zoneId: zone, itemId: plant, itemKind: 'Plant', label: 'Texte choisi par le lien' },
      { id: ['a', 'b'], spaceId: ['a', 'b'], layout: ['a', 'b'] },
      { id: hostile, spaceId: hostile, itemKind: '__proto__', layout: '__proto__', label: '<b>x</b>' },
    ];
    const { default: Screen } = require(file);
    const { wrapped, writes } = recording(db);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    for (const params of paramSets) {
      jest.mocked(useLocalSearchParams).mockReturnValue(params as never);
      await renderScreen(<Screen />, createServices(wrapped, clock));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      await cleanup();
    }

    consoleError.mockRestore();
    expect(writes).toEqual([]);
    await expect(db.first('SELECT count(*) AS n FROM spaces')).resolves.not.toEqual({ n: 0 });
  }, 60000);
});
