import type { SQLiteDatabase } from 'expo-sqlite';

import { today } from '@/lib/dates';

import { fromExpo, type Db } from './db';
import { seedExampleGarden } from './example-garden';
import { migrate } from './migrations';

export const databaseName = 'jardo.db';

/** À chaque ouverture : réglages de connexion, migrations, puis le jardin d'exemple s'il est demandé. */
export async function prepareDatabase(db: Db, { exampleGarden }: { exampleGarden: boolean }): Promise<void> {
  // Réglés par connexion et hors transaction : sans foreign_keys, SQLite ignore les clés étrangères.
  await db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  if (exampleGarden) await seedExampleGarden(db, today(), new Date().toISOString());
}

/** Le onInit de SQLiteProvider. Une installation publiée démarre sur un jardin vide. */
export const initDatabase = (database: SQLiteDatabase) =>
  prepareDatabase(fromExpo(database), { exampleGarden: __DEV__ });
