import {
  backupColumns,
  backupSchemaVersion,
  backupUpgrades,
  createBackupService,
  readBackup,
  type BackupTable,
  type GardenBackup,
} from '@/data/backup';
import type { Db } from '@/data/db';
import { migrations } from '@/data/migrations';

import { createTestDb } from '../../test/db';
import { fixedClock } from '../../test/garden-data';

const clock = fixedClock('2026-10-26');

const tableNames = Object.keys(backupColumns) as BackupTable[];

/** Toutes les lignes de toutes les tables, dans l'ordre d'insertion : le jardin tel qu'en base. */
async function dump(db: Db) {
  const tables: Record<string, unknown[]> = {};
  for (const table of tableNames) tables[table] = await db.all(`SELECT * FROM ${table} ORDER BY rowid`);
  return tables;
}

async function exampleBackup() {
  const db = await createTestDb({ exampleGarden: true });
  return { db, backup: await createBackupService(db, clock).export() };
}

/** Le fichier d'un export, retouché par `change`. */
function tampered(backup: GardenBackup, change: (file: any) => void): string {
  const file = JSON.parse(JSON.stringify(backup));
  change(file);
  return JSON.stringify(file);
}

/** L'erreur que lève la lecture du fichier : un refus en bloc. */
function readError(text: string): unknown {
  try {
    readBackup(text);
  } catch (error) {
    return error;
  }
  throw new Error('Le fichier a été accepté.');
}

const refusedFile = (detail: string | RegExp) => ({
  status: 400,
  problem: { title: 'Fichier refusé', detail: typeof detail === 'string' ? detail : expect.stringMatching(detail) },
});

describe('sauvegarde', () => {
  it('un export suivi d’un import redonne exactement le même jardin', async () => {
    const { db: source, backup } = await exampleBackup();
    const target = await createTestDb();
    const service = createBackupService(target, clock);

    await service.replace(service.read(JSON.stringify(backup)));

    expect(await dump(target)).toEqual(await dump(source));
    expect((await dump(target)).journal_entries.length).toBeGreaterThan(0);
  });

  it('un export suivi d’un import garde les reports des tâches', async () => {
    const source = await createTestDb({ exampleGarden: true });
    await source.run("UPDATE garden_tasks SET postponed_until = '2026-10-27' WHERE rowid = (SELECT min(rowid) FROM garden_tasks)");
    const backup = await createBackupService(source, clock).export();
    const target = await createTestDb();
    const service = createBackupService(target, clock);

    await service.replace(service.read(JSON.stringify(backup)));

    expect(backup.tables.garden_tasks.map((task) => task.postponed_until)).toContain('2026-10-27');
    expect(await dump(target)).toEqual(await dump(source));
  });

  it('un export d’avant le report s’importe, ses tâches sans report', async () => {
    const { db: source, backup } = await exampleBackup();
    const before = tampered(backup, (file) => {
      file.schemaVersion = 1;
      file.tables.garden_tasks.forEach((task: any) => delete task.postponed_until);
    });
    const target = await createTestDb();
    const service = createBackupService(target, clock);

    const read = service.read(before);
    await service.replace(read);

    expect(read.schemaVersion).toBe(migrations.length);
    expect(read.tables.garden_tasks.length).toBeGreaterThan(0);
    expect(read.tables.garden_tasks.every((task) => task.postponed_until === null)).toBe(true);
    expect(await dump(target)).toEqual(await dump(source));
  });

  it('l’import remplace le jardin actuel, y compris ce qui a été ajouté depuis l’export', async () => {
    const { db, backup } = await exampleBackup();
    const before = await dump(db);
    await db.run("UPDATE gardens SET name = 'Autre jardin'");
    await db.run('DELETE FROM garden_map_slots');
    await db.run('DELETE FROM journal_entries');

    const service = createBackupService(db, clock);
    await service.replace(service.read(JSON.stringify(backup)));

    expect(await dump(db)).toEqual(before);
  });

  it('l’export est versionné et daté, et contient chaque table', async () => {
    const { backup } = await exampleBackup();

    expect(backup).toMatchObject({
      format: 'jardo',
      formatVersion: 1,
      schemaVersion: migrations.length,
      exportedAt: clock().toISOString(),
    });
    expect(Object.keys(backup.tables)).toEqual(tableNames);
    expect(backup.tables.garden_map_slots.length).toBeGreaterThan(0);
  });

  it('décrit chaque colonne de chaque table du schéma', async () => {
    const db = await createTestDb();
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((table) => table.name)).toEqual([...tableNames].sort());

    for (const table of tableNames) {
      const columns = await db.all<{ name: string }>(`PRAGMA table_info(${table})`);
      expect(columns.map((column) => column.name)).toEqual(Object.keys(backupColumns[table]));
    }
  });

  it('a une mise à niveau des exports pour chaque migration après la première', () => {
    expect(backupSchemaVersion).toBe(migrations.length);
    expect(backupUpgrades).toHaveLength(migrations.length - 1);
  });

  describe('refuse un fichier', () => {
    let backup: GardenBackup;
    beforeAll(async () => {
      ({ backup } = await exampleBackup());
    });

    it.each([
      ['abîmé', () => '{"format": "jardo", "tables": {', /pas du JSON valide/],
      ['d’une autre app', () => '{"format": "autre"}', "Ce fichier n'est pas un export de Jardo."],
      ['sans version', () => tampered(backup, (file) => delete file.schemaVersion), /ne dit pas de quelle version/],
      ['d’un format plus récent', () => tampered(backup, (file) => (file.formatVersion = 2)), /plus récente de Jardo/],
      [
        'd’un schéma plus récent',
        () => tampered(backup, (file) => (file.schemaVersion = migrations.length + 1)),
        /plus récente de Jardo/,
      ],
      ['sans une table', () => tampered(backup, (file) => delete file.tables.zones), 'La table « zones » manque.'],
      ['avec une table inconnue', () => tampered(backup, (file) => (file.tables.users = [])), /« users » est inconnue/],
      [
        'avec une colonne inconnue',
        () => tampered(backup, (file) => (file.tables.spaces[0].owner = 'x')),
        'Table « spaces », ligne 1 : la colonne « owner » est inconnue.',
      ],
      [
        'avec une valeur du mauvais type',
        () => tampered(backup, (file) => (file.tables.garden_items[0].quantity = '3')),
        /« quantity » manque ou n'a pas le bon type/,
      ],
      ['avec deux jardins', () => tampered(backup, (file) => file.tables.gardens.push(file.tables.gardens[0])), /un et un seul jardin/],
    ])('%s', (_, file, detail) => {
      expect(readError(file())).toMatchObject(refusedFile(detail));
    });

    const space = (file: any, kind: string) => file.tables.spaces.find((row: any) => row.kind === kind);
    const pile = (file: any) => file.tables.garden_items.find((row: any) => row.item_type === 'WoodPile');

    it.each([
      [
        'un espace au type inconnu',
        (file: any) => (file.tables.spaces[0].kind = 'Pool'),
        /La valeur du champ « Type » n'est pas reconnue/,
      ],
      ['deux espaces du même nom', (file: any) => (file.tables.spaces[1].name = file.tables.spaces[0].name), /existe déjà/],
      ['une tâche reportée à un jour mal écrit', (file: any) => (file.tables.garden_tasks[0].postponed_until = '2026-13-01'), /« Reporter au » n'est pas un jour/],
      [
        'une plante dans le bois de chauffage',
        (file: any) => {
          const plant = file.tables.garden_items.find((row: any) => row.item_type === 'Plant');
          plant.space_id = space(file, 'Firewood').id;
          plant.zone_id = null;
        },
        /n'accueille pas de plantes/,
      ],
      [
        'une zone qui n’appartient pas à l’espace de l’élément',
        (file: any) => {
          const plant = file.tables.garden_items.find((row: any) => row.zone_id !== null);
          plant.zone_id = file.tables.zones.find((zone: any) => zone.space_id !== plant.space_id).id;
        },
        /n'appartient pas à l'espace/,
      ],
      [
        'une entrée sur un élément hors de sa zone',
        (file: any) => {
          const entry = file.tables.journal_entries.find((row: any) => row.item_id !== null && row.zone_id !== null);
          entry.zone_id = null;
        },
        /n'est pas dans la zone indiquée/,
      ],
      [
        'une entrée qui vise un élément absent',
        (file: any) => (file.tables.journal_entries.find((row: any) => row.item_id !== null).item_id = 'inconnu'),
        /: L'élément inconnu n'existe pas\.$/,
      ],
      [
        'un stock de bois sous zéro',
        (file: any) => (pile(file).initial_steres = 0.5),
        /stock sous zéro/,
      ],
      [
        'une tâche « autre » sans titre',
        (file: any) => {
          const task = file.tables.garden_tasks[0];
          task.kind = 'Other';
          task.title = null;
        },
        /a besoin d'un titre/,
      ],
      [
        'un emplacement de la carte du mauvais type',
        (file: any) => {
          const slot = file.tables.garden_map_slots.find((row: any) => row.slot_key === 'firewood');
          slot.slot_key = 'orchard';
          file.tables.garden_map_slots = [slot];
        },
        /n'accepte qu'un espace verger/,
      ],
    ])('qui contient %s', (_, change, detail) => {
      expect(readError(tampered(backup, change))).toMatchObject(refusedFile(detail));
    });
  });

  it('ne modifie rien si une écriture de l’import échoue', async () => {
    const { backup } = await exampleBackup();
    const db = await createTestDb({ exampleGarden: true });
    await db.run("UPDATE gardens SET name = 'Le jardin à garder'");
    const before = await dump(db);

    // Un fichier qui aurait échappé à la lecture : la base refuse la zone d'un espace absent.
    const broken = JSON.parse(tampered(backup, (file) => (file.tables.zones[0].space_id = 'inconnu')));

    await expect(createBackupService(db, clock).replace(broken)).rejects.toThrow(/FOREIGN KEY/);
    expect(await dump(db)).toEqual(before);
  });
});
