import { randomUUID } from 'expo-crypto';

import { acceptsPlants, acceptsWoodPiles, entryKindLabel, isEntryKindAllowedIn, spaceKindLabel } from '@/domain/kinds';
import { spaceKinds, type Id, type JournalEntryKind, type SpaceKind } from '@/domain/types';
import { toDateOnly } from '@/lib/dates';

import type { Clock } from './clock';
import type { Db } from './db';
import { gardenId } from './garden';
import { businessRule, notFound } from './problem';
import { countDueTasksBySpace } from './task-queries';
import { optionalText, Validation } from './validation';

/** Un espace tel que l'API le renvoyait. */
export type Space = {
  id: Id;
  name: string;
  description: string | null;
  kind: SpaceKind;
  isArchived: boolean;
  createdAt: string;
  zoneCount: number;
  /** Nombre d'éléments actifs (non archivés). */
  itemCount: number;
  /** Tâches de l'espace à faire aujourd'hui ou en retard, hors éléments archivés. 0 pour un espace archivé. */
  dueTaskCount: number;
};

/** Changer le type d'un espace existant est refusé si son contenu n'y est pas autorisé. */
export type SpaceInput = { name: string; description?: string | null; kind: SpaceKind };

type SpaceRow = {
  id: Id;
  name: string;
  description: string | null;
  kind: SpaceKind;
  is_archived: number;
  created_at: string;
  zone_count: number;
  item_count: number;
};

const selectSpaces = `
  SELECT s.id, s.name, s.description, s.kind, s.is_archived, s.created_at,
    (SELECT count(*) FROM zones z WHERE z.space_id = s.id) AS zone_count,
    (SELECT count(*) FROM garden_items i WHERE i.space_id = s.id AND i.is_archived = 0) AS item_count
  FROM spaces s`;

const toSpace = (row: SpaceRow, dueTaskCount: number): Space => ({
  id: row.id,
  name: row.name,
  description: row.description,
  kind: row.kind,
  isArchived: row.is_archived === 1,
  createdAt: row.created_at,
  zoneCount: row.zone_count,
  itemCount: row.item_count,
  dueTaskCount,
});

export const validate = (input: SpaceInput) =>
  new Validation()
    .required('Name', 'Nom', input.name, 100)
    .optional('Description', 'Description', input.description, 500)
    .oneOf('Kind', 'Type', input.kind, spaceKinds)
    .done();

/** Gestion des espaces du jardin (`SpaceService`). */
export function createSpaceService(db: Db, clock: Clock) {
  async function withDueCounts(rows: SpaceRow[]): Promise<Space[]> {
    const dueTaskCounts = await countDueTasksBySpace(
      db,
      rows.map((row) => row.id),
      toDateOnly(clock()),
    );
    return rows.map((row) => toSpace(row, dueTaskCounts.get(row.id) ?? 0));
  }

  async function getById(id: Id): Promise<Space> {
    const row = await db.first<SpaceRow>(`${selectSpaces} WHERE s.id = ?`, [id]);
    if (!row) throw notFound('Space', id);
    return (await withDueCounts([row]))[0];
  }

  const count = async (sql: string, id: Id) => (await db.first<{ n: number }>(sql, [id]))!.n;

  async function existing(id: Id) {
    const space = await db.first<{ name: string; kind: SpaceKind }>('SELECT name, kind FROM spaces WHERE id = ?', [id]);
    if (!space) throw notFound('Space', id);
    return space;
  }

  // Un espace archivé, ou dont le type change, n'est plus valable sur son emplacement : il passe
  // dans « Hors carte ».
  const freeMapSlots = (spaceId: Id) => db.run('DELETE FROM garden_map_slots WHERE space_id = ?', [spaceId]);

  // Double la contrainte unique de la base pour produire un message clair. Les espaces archivés
  // comptent : les réactiver ne doit pas créer de doublon.
  async function ensureNameIsAvailable(gardenIdentifier: Id, name: string, excludingSpaceId: Id | null) {
    const duplicate = await db.first(
      'SELECT 1 FROM spaces WHERE garden_id = ? AND name = ? AND (? IS NULL OR id <> ?)',
      [gardenIdentifier, name, excludingSpaceId, excludingSpaceId],
    );
    if (duplicate) throw businessRule(`Un espace nommé « ${name} » existe déjà.`);
  }

  async function ensureKindAcceptsContent(id: Id, name: string, kind: SpaceKind) {
    if (!acceptsPlants(kind)) {
      const plantCount = await count("SELECT count(*) AS n FROM garden_items WHERE space_id = ? AND item_type = 'Plant'", id);
      if (plantCount > 0) {
        throw businessRule(
          `L'espace « ${name} » contient ${plantCount} plante(s), archivées comprises : ` +
            `un espace ${spaceKindLabel(kind)} n'accueille pas de plantes.`,
        );
      }
    }

    if (!acceptsWoodPiles(kind)) {
      const pileCount = await count("SELECT count(*) AS n FROM garden_items WHERE space_id = ? AND item_type = 'WoodPile'", id);
      if (pileCount > 0) {
        throw businessRule(
          `L'espace « ${name} » contient ${pileCount} tas de bois, archivés compris : ` +
            `un espace ${spaceKindLabel(kind)} n'accueille pas de tas de bois.`,
        );
      }
    }

    const interventionKinds = [
      ...(await db.all<{ kind: JournalEntryKind }>('SELECT DISTINCT kind FROM journal_entries WHERE space_id = ? ORDER BY kind', [id])),
      ...(await db.all<{ kind: JournalEntryKind }>('SELECT DISTINCT kind FROM garden_tasks WHERE space_id = ? ORDER BY kind', [id])),
    ].map((row) => row.kind);

    const refused = [...new Set(interventionKinds)].filter((entryKind) => !isEntryKindAllowedIn(entryKind, kind));
    if (refused.length > 0) {
      throw businessRule(
        `Le journal ou les tâches de l'espace « ${name} » contiennent des interventions ` +
          `« ${refused.map(entryKindLabel).join(' », « ')} », ` +
          `qu'un espace ${spaceKindLabel(kind)} n'accueille pas.`,
      );
    }
  }

  return {
    /** Les espaces, triés par nom, avec leurs compteurs. Les archivés seulement sur demande. */
    async getAll(includeArchived = false): Promise<Space[]> {
      const rows = await db.all<SpaceRow>(`${selectSpaces} ${includeArchived ? '' : 'WHERE s.is_archived = 0'} ORDER BY s.name`);
      return withDueCounts(rows);
    },

    getById,

    async create(input: SpaceInput): Promise<Space> {
      validate(input);
      const name = input.name.trim();
      const id = randomUUID();

      await db.transaction(async () => {
        const garden = await gardenId(db);
        await ensureNameIsAvailable(garden, name, null);
        await db.run('INSERT INTO spaces (id, garden_id, name, description, kind, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
          id,
          garden,
          name,
          optionalText(input.description),
          input.kind,
          clock().toISOString(),
        ]);
      });

      return getById(id);
    },

    async update(id: Id, input: SpaceInput): Promise<Space> {
      validate(input);
      const name = input.name.trim();

      await db.transaction(async () => {
        const space = await existing(id);
        await ensureNameIsAvailable(await gardenId(db), name, id);

        if (input.kind !== space.kind) {
          await ensureKindAcceptsContent(id, space.name, input.kind);
          await freeMapSlots(id);
        }

        await db.run('UPDATE spaces SET name = ?, description = ?, kind = ? WHERE id = ?', [
          name,
          optionalText(input.description),
          input.kind,
          id,
        ]);
      });

      return getById(id);
    },

    /**
     * Archive ou réactive un espace. Archivé, il sort de la liste par défaut et n'accueille plus
     * rien de nouveau ; son contenu est conservé.
     */
    async setArchived(id: Id, isArchived: boolean): Promise<Space> {
      await db.transaction(async () => {
        await existing(id);
        if (isArchived) await freeMapSlots(id);
        await db.run('UPDATE spaces SET is_archived = ? WHERE id = ?', [isArchived ? 1 : 0, id]);
      });

      return getById(id);
    },

    /** Supprime un espace sans élément, avec ses zones, son journal et ses tâches. */
    async delete(id: Id): Promise<void> {
      await db.transaction(async () => {
        const space = await existing(id);

        // Archivés compris : supprimer l'espace effacerait leur historique.
        const itemCount = await count('SELECT count(*) AS n FROM garden_items WHERE space_id = ?', id);
        if (itemCount > 0) {
          throw businessRule(
            `L'espace « ${space.name} » contient encore ${itemCount} élément(s), archivés compris. ` +
              "Archivez l'espace plutôt que de le supprimer.",
          );
        }

        await db.run('DELETE FROM spaces WHERE id = ?', [id]);
      });
    },
  };
}
