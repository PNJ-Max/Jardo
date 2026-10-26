import { checkBackupRules } from './backup-rules';
import type { Clock } from './clock';
import type { Db } from './db';
import { migrations } from './migrations';
import { invalidBackup } from './problem';

// Le fichier d'export : une enveloppe versionnée et les lignes de chaque table, telles qu'en base,
// dans l'ordre d'insertion (rowid) qui départage les lignes créées au même instant.
// `formatVersion` change si l'enveloppe change ; `schemaVersion` est la version de la base
// (PRAGMA user_version) dont viennent les lignes.

export const backupFormat = 'jardo';
export const backupFormatVersion = 1;
export const backupSchemaVersion = migrations.length;

type ColumnType = 'text' | 'text?' | 'number' | 'number?' | 'flag' | 'instant';

/**
 * Les colonnes de chaque table au schéma actuel. L'ordre des tables est celui de l'import : un
 * parent avant ses enfants.
 */
export const backupColumns = {
  gardens: { id: 'text', name: 'text', map_layout: 'text?', created_at: 'instant' },
  spaces: {
    id: 'text',
    garden_id: 'text',
    name: 'text',
    kind: 'text',
    description: 'text?',
    is_archived: 'flag',
    created_at: 'instant',
  },
  zones: { id: 'text', space_id: 'text', name: 'text', description: 'text?', created_at: 'instant' },
  garden_items: {
    id: 'text',
    item_type: 'text',
    space_id: 'text',
    zone_id: 'text?',
    name: 'text',
    is_archived: 'flag',
    created_at: 'instant',
    species: 'text?',
    variety: 'text?',
    quantity: 'number?',
    quantity_unit: 'text?',
    sown_date: 'text?',
    planted_date: 'text?',
    wood_species: 'text?',
    initial_steres: 'number?',
    log_length_cm: 'number?',
    cut_date: 'text?',
    drying_months: 'number?',
  },
  journal_entries: {
    id: 'text',
    kind: 'text',
    date: 'text',
    space_id: 'text',
    zone_id: 'text?',
    item_id: 'text?',
    note: 'text?',
    quantity: 'number?',
    quantity_unit: 'text?',
    height_cm: 'number?',
    problem: 'text?',
    treatment: 'text?',
    created_at: 'instant',
  },
  garden_tasks: {
    id: 'text',
    kind: 'text',
    recurrence: 'text',
    start_date: 'text',
    interval_days: 'number?',
    title: 'text?',
    space_id: 'text',
    zone_id: 'text?',
    item_id: 'text?',
    created_at: 'instant',
  },
  garden_map_slots: { id: 'text', garden_id: 'text', slot_key: 'text', space_id: 'text', zone_id: 'text?' },
} as const satisfies Record<string, Record<string, ColumnType>>;

type Columns = typeof backupColumns;
export type BackupTable = keyof Columns;

type ValueOf<C> = C extends 'text' | 'instant'
  ? string
  : C extends 'text?'
    ? string | null
    : C extends 'number' | 'flag'
      ? number
      : number | null;

export type BackupRow<T extends BackupTable> = { -readonly [K in keyof Columns[T]]: ValueOf<Columns[T][K]> };
export type BackupTables = { [T in BackupTable]: BackupRow<T>[] };

/** Un export de tout le jardin, au schéma actuel. */
export type GardenBackup = {
  format: typeof backupFormat;
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  tables: BackupTables;
};

const tableNames = Object.keys(backupColumns) as BackupTable[];

type LooseTables = Record<string, Record<string, unknown>[]>;

/**
 * La mise à niveau des exports, une par migration après la première : `backupUpgrades[v - 1]`
 * transforme les tables d'un export de la version v comme la migration v + 1 a transformé la base.
 * Un export d'une version précédente s'importe ainsi migré à la volée. Un test exige une entrée
 * par migration : une migration qui ne peut pas se rejouer sur un export y lève `invalidBackup`.
 */
export const backupUpgrades: readonly ((tables: LooseTables) => LooseTables)[] = [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isInstant = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

function fits(value: unknown, type: ColumnType): boolean {
  switch (type) {
    case 'text':
      return typeof value === 'string';
    case 'text?':
      return value === null || typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'number?':
      return value === null || typeof value === 'number';
    case 'flag':
      return value === 0 || value === 1;
    case 'instant':
      return isInstant(value);
  }
}

function checkColumns(tables: LooseTables): BackupTables {
  const unknownTable = Object.keys(tables).find((name) => !(name in backupColumns));
  if (unknownTable) throw invalidBackup(`La table « ${unknownTable} » est inconnue.`);

  for (const table of tableNames) {
    const columns: Record<string, ColumnType> = backupColumns[table];
    const rows = tables[table];
    if (!rows) throw invalidBackup(`La table « ${table} » manque.`);

    rows.forEach((row, index) => {
      const where = `Table « ${table} », ligne ${index + 1}`;
      const unknownColumn = Object.keys(row).find((name) => !(name in columns));
      if (unknownColumn) throw invalidBackup(`${where} : la colonne « ${unknownColumn} » est inconnue.`);

      for (const [column, type] of Object.entries(columns)) {
        if (!fits(row[column], type)) throw invalidBackup(`${where} : la valeur de « ${column} » manque ou n'a pas le bon type.`);
      }
    });
  }

  return tables as unknown as BackupTables;
}

function readTables(value: unknown): LooseTables {
  if (!isRecord(value)) throw invalidBackup('Le fichier ne contient pas les tables du jardin.');

  for (const [table, rows] of Object.entries(value)) {
    if (!Array.isArray(rows) || !rows.every(isRecord)) {
      throw invalidBackup(`La table « ${table} » n'est pas une liste de lignes.`);
    }
  }
  return value as LooseTables;
}

/**
 * Lit un fichier d'export et le vérifie en entier, sans rien écrire : enveloppe, versions, colonnes,
 * puis les règles des services. Un export d'une version précédente du schéma est mis à niveau.
 */
export function readBackup(text: string): GardenBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw invalidBackup("Ce fichier n'est pas un export de Jardo : son contenu n'est pas du JSON valide.");
  }

  if (!isRecord(data) || data.format !== backupFormat) throw invalidBackup("Ce fichier n'est pas un export de Jardo.");

  const { formatVersion, schemaVersion, exportedAt } = data;
  const isVersion = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1;

  if (!isVersion(formatVersion) || !isVersion(schemaVersion)) {
    throw invalidBackup('Ce fichier ne dit pas de quelle version de Jardo il vient.');
  }
  if (formatVersion > backupFormatVersion || schemaVersion > backupSchemaVersion) {
    throw invalidBackup("Ce fichier vient d'une version plus récente de Jardo : mettez l'app à jour pour l'importer.");
  }
  if (formatVersion < backupFormatVersion) throw invalidBackup(`Le format ${formatVersion} de ce fichier n'est plus pris en charge.`);
  if (!isInstant(exportedAt)) throw invalidBackup("La date d'export du fichier manque ou n'est pas lisible.");

  let tables = readTables(data.tables);
  for (let version = schemaVersion; version < backupSchemaVersion; version++) tables = backupUpgrades[version - 1](tables);

  const checked = checkColumns(tables);
  checkBackupRules(checked);

  return { format: backupFormat, formatVersion, schemaVersion: backupSchemaVersion, exportedAt: exportedAt as string, tables: checked };
}

/** Export et import de tout le jardin. */
export function createBackupService(db: Db, clock: Clock) {
  return {
    async export(): Promise<GardenBackup> {
      // Lues dans une transaction : une écriture ne s'intercale pas entre deux tables.
      const tables = await db.transaction(async () => {
        const read: Partial<Record<BackupTable, unknown[]>> = {};
        for (const table of tableNames) {
          read[table] = await db.all(`SELECT ${Object.keys(backupColumns[table]).join(', ')} FROM ${table} ORDER BY rowid`);
        }
        return read as BackupTables;
      });

      return {
        format: backupFormat,
        formatVersion: backupFormatVersion,
        schemaVersion: backupSchemaVersion,
        exportedAt: clock().toISOString(),
        tables,
      };
    },

    read: readBackup,

    /**
     * Remplace tout le jardin par un export lu par `readBackup`, dans une seule transaction. Les
     * contraintes du schéma vérifient encore chaque ligne : au moindre refus, rien n'a changé.
     */
    async replace(backup: GardenBackup): Promise<void> {
      await db.transaction(async () => {
        // Des enfants vers les parents : un élément retient son espace (RESTRICT).
        for (const table of [...tableNames].reverse()) await db.run(`DELETE FROM ${table}`);

        for (const table of tableNames) {
          const columns = Object.keys(backupColumns[table]);
          const insert = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
          for (const row of backup.tables[table] as Record<string, string | number | null>[]) {
            await db.run(
              insert,
              columns.map((column) => row[column]),
            );
          }
        }
      });
    },
  };
}
