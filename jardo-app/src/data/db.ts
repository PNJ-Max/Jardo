import type { SQLiteDatabase } from 'expo-sqlite';

/** Les valeurs qu'on lie à une requête : un booléen s'écrit 0 ou 1. */
export type SqlValue = string | number | null;

/** L'accès à la base, le même dans l'app (expo-sqlite) et sous Jest (node:sqlite). */
export interface Db {
  /** Un script de plusieurs instructions, sans paramètres : schéma, migrations, PRAGMA. */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  /** Tout ou rien. Les transactions passent l'une après l'autre ; ne pas en imbriquer. */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

export type Statements = Omit<Db, 'transaction'>;

// Une seule connexion : deux BEGIN simultanés (deux « Fait » tapés vite) échoueraient, d'où la
// file. Une lecture lancée pendant une transaction y entre quand même (voir withTransactionAsync
// dans la doc d'expo-sqlite) : sans effet pour une lecture.
export function withTransactions(statements: Statements): Db {
  let queue: Promise<unknown> = Promise.resolve();

  return {
    ...statements,
    transaction<T>(work: () => Promise<T>) {
      const result = queue.then(async () => {
        await statements.exec('BEGIN');
        try {
          const value = await work();
          await statements.exec('COMMIT');
          return value;
        } catch (error) {
          await statements.exec('ROLLBACK');
          throw error;
        }
      });
      queue = result.catch(() => undefined);
      return result;
    },
  };
}

export const fromExpo = (database: SQLiteDatabase): Db =>
  withTransactions({
    exec: (sql) => database.execAsync(sql),
    run: async (sql, params = []) => {
      await database.runAsync(sql, [...params]);
    },
    all: (sql, params = []) => database.getAllAsync(sql, [...params]),
    first: (sql, params = []) => database.getFirstAsync(sql, [...params]),
  });
