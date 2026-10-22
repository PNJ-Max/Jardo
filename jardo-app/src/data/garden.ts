import type { Id } from '@/domain/types';

import type { Db } from './db';
import { Validation } from './validation';

/** Le jardin, tel que l'API le renvoyait. */
export type Garden = { id: Id; name: string; createdAt: string };

export type GardenInput = { name: string };

type GardenRow = { id: Id; name: string; created_at: string };

const selectGarden = 'SELECT id, name, created_at FROM gardens ORDER BY rowid LIMIT 1';

/**
 * L'identifiant du jardin unique du MVP, créé par la première migration. Chaque usage est à revoir
 * avec le multi-jardin.
 */
export async function gardenId(db: Db): Promise<Id> {
  const garden = await db.first<GardenRow>(selectGarden);
  if (!garden) throw new Error("Le jardin manque : la base n'est pas migrée.");
  return garden.id;
}

const toGarden = (row: GardenRow): Garden => ({ id: row.id, name: row.name, createdAt: row.created_at });

/** Le jardin, unique au MVP (`GardenService`). */
export function createGardenService(db: Db) {
  const get = async () => toGarden((await db.first<GardenRow>(selectGarden))!);

  return {
    get,

    async update(input: GardenInput): Promise<Garden> {
      new Validation().required('Name', 'Nom', input.name, 100).done();

      // Une écriture isolée passerait dans la transaction en cours, s'il y en a une, et partirait
      // avec elle si elle est annulée : toute écriture entre dans la file.
      await db.transaction(async () =>
        db.run('UPDATE gardens SET name = ? WHERE id = ?', [input.name.trim(), await gardenId(db)]),
      );
      return get();
    },
  };
}
