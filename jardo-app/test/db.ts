/// <reference types="node" />

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { withTransactions, type Db } from '@/data/db';
import { prepareDatabase } from '@/data/database';

/** Une vraie SQLite en mémoire, derrière la même interface que l'app. */
export function createMemoryDb(): Db {
  // Comme dans l'app : les clés étrangères ne s'appliquent que si prepareDatabase les active.
  const database = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });
  const bind = (params: readonly SQLInputValue[] = []) => params as SQLInputValue[];

  return withTransactions({
    exec: async (sql) => database.exec(sql),
    run: async (sql, params) => {
      database.prepare(sql).run(...bind(params));
    },
    all: async <T>(sql: string, params?: readonly SQLInputValue[]) =>
      database.prepare(sql).all(...bind(params)) as T[],
    first: async <T>(sql: string, params?: readonly SQLInputValue[]) =>
      (database.prepare(sql).get(...bind(params)) ?? null) as T | null,
  });
}

/** Une base migrée, comme l'app l'ouvre ; avec le jardin d'exemple si demandé. */
export async function createTestDb({ exampleGarden = false } = {}): Promise<Db> {
  const db = createMemoryDb();
  await prepareDatabase(db, { exampleGarden });
  return db;
}
