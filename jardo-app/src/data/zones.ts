import { randomUUID } from 'expo-crypto';

import type { Id } from '@/domain/types';

import type { Clock } from './clock';
import type { Db } from './db';
import { businessRule, notFound } from './problem';
import { optionalText, Validation } from './validation';

/** Une zone, subdivision facultative d'un espace : un carré, une planche, un rang. */
export type Zone = {
  id: Id;
  spaceId: Id;
  name: string;
  description: string | null;
  createdAt: string;
  /** Nombre d'éléments actifs (non archivés). */
  itemCount: number;
};

/** L'espace d'une zone est donné à part, à la création. */
export type ZoneInput = { name: string; description?: string | null };

type ZoneRow = {
  id: Id;
  space_id: Id;
  name: string;
  description: string | null;
  created_at: string;
  item_count: number;
};

const selectZones = `
  SELECT z.id, z.space_id, z.name, z.description, z.created_at,
    (SELECT count(*) FROM garden_items i WHERE i.zone_id = z.id AND i.is_archived = 0) AS item_count
  FROM zones z`;

const toZone = (row: ZoneRow): Zone => ({
  id: row.id,
  spaceId: row.space_id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  itemCount: row.item_count,
});

const validate = (input: ZoneInput) =>
  new Validation().required('Name', 'Nom', input.name, 100).optional('Description', 'Description', input.description, 500).done();

/** Gestion des zones d'un espace (`ZoneService`). */
export function createZoneService(db: Db, clock: Clock) {
  async function getById(id: Id): Promise<Zone> {
    const row = await db.first<ZoneRow>(`${selectZones} WHERE z.id = ?`, [id]);
    if (!row) throw notFound('Zone', id);
    return toZone(row);
  }

  // Double la contrainte unique (espace, nom) pour produire un message clair.
  async function ensureNameIsAvailable(spaceId: Id, name: string, excludingZoneId: Id | null) {
    const duplicate = await db.first('SELECT 1 FROM zones WHERE space_id = ? AND name = ? AND (? IS NULL OR id <> ?)', [
      spaceId,
      name,
      excludingZoneId,
      excludingZoneId,
    ]);
    if (duplicate) throw businessRule(`Une zone nommée « ${name} » existe déjà dans cet espace.`);
  }

  return {
    async getBySpace(spaceId: Id): Promise<Zone[]> {
      if (!(await db.first('SELECT 1 FROM spaces WHERE id = ?', [spaceId]))) throw notFound('Space', spaceId);

      const rows = await db.all<ZoneRow>(`${selectZones} WHERE z.space_id = ? ORDER BY z.name`, [spaceId]);
      return rows.map(toZone);
    },

    getById,

    async create(spaceId: Id, input: ZoneInput): Promise<Zone> {
      validate(input);
      const name = input.name.trim();
      const id = randomUUID();

      await db.transaction(async () => {
        const space = await db.first<{ name: string; is_archived: number }>('SELECT name, is_archived FROM spaces WHERE id = ?', [
          spaceId,
        ]);
        if (!space) throw notFound('Space', spaceId);
        if (space.is_archived) {
          throw businessRule(`L'espace « ${space.name} » est archivé : réactivez-le avant d'y ajouter une zone.`);
        }

        await ensureNameIsAvailable(spaceId, name, null);
        await db.run('INSERT INTO zones (id, space_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)', [
          id,
          spaceId,
          name,
          optionalText(input.description),
          clock().toISOString(),
        ]);
      });

      return getById(id);
    },

    async update(id: Id, input: ZoneInput): Promise<Zone> {
      validate(input);
      const name = input.name.trim();

      await db.transaction(async () => {
        const zone = await db.first<{ space_id: Id }>('SELECT space_id FROM zones WHERE id = ?', [id]);
        if (!zone) throw notFound('Zone', id);

        await ensureNameIsAvailable(zone.space_id, name, id);
        await db.run('UPDATE zones SET name = ?, description = ? WHERE id = ?', [name, optionalText(input.description), id]);
      });

      return getById(id);
    },

    async delete(id: Id): Promise<void> {
      await db.transaction(async () => {
        const zone = await db.first<{ name: string }>('SELECT name FROM zones WHERE id = ?', [id]);
        if (!zone) throw notFound('Zone', id);

        // Archivés compris : la base refuserait de toute façon (RESTRICT). Le détail évite un écart
        // avec le compteur de la zone, qui ne compte que les actifs.
        const counts = (await db.first<{ active: number; archived: number }>(
          `SELECT coalesce(sum(is_archived = 0), 0) AS active, coalesce(sum(is_archived = 1), 0) AS archived
           FROM garden_items WHERE zone_id = ?`,
          [id],
        ))!;

        if (counts.active + counts.archived > 0) {
          const detail =
            counts.archived > 0
              ? `${counts.active} élément(s) actif(s) et ${counts.archived} archivé(s)`
              : `${counts.active} élément(s)`;

          throw businessRule(
            `La zone « ${zone.name} » contient encore ${detail}. ` +
              'Déplacez-les ou supprimez-les avant de supprimer la zone.',
          );
        }

        await db.run('DELETE FROM zones WHERE id = ?', [id]);
      });
    },
  };
}
