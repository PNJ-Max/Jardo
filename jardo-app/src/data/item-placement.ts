import { spaceKindLabel } from '@/domain/kinds';
import type { Id, SpaceKind } from '@/domain/types';

import type { Db } from './db';
import { businessRule } from './problem';

// Règles de placement communes aux éléments suivis : plantes et tas de bois.

/** Pour « il n'accueille pas … » : « de plantes » ; pour « avant d'y ajouter … » : « une plante ». */
export type Noun = { plural: string; singular: string };

/**
 * 400 et non 404 : la ressource demandée est l'élément, ce sont les identifiants du corps qui sont
 * invalides. Un espace archivé garde ses éléments mais n'en reçoit plus de nouveaux.
 */
export async function ensureValidPlacement(
  db: Db,
  spaceId: Id,
  zoneId: Id | null,
  isNewToSpace: boolean,
  accepts: (kind: SpaceKind) => boolean,
  noun: Noun,
): Promise<void> {
  const space = await db.first<{ name: string; kind: SpaceKind; is_archived: number }>(
    'SELECT name, kind, is_archived FROM spaces WHERE id = ?',
    [spaceId],
  );
  if (!space) throw businessRule(`L'espace ${spaceId} n'existe pas.`);

  if (!accepts(space.kind)) {
    throw businessRule(
      `L'espace « ${space.name} » est un espace ${spaceKindLabel(space.kind)} : il n'accueille pas ${noun.plural}.`,
    );
  }

  if (isNewToSpace && space.is_archived) {
    throw businessRule(`L'espace « ${space.name} » est archivé : réactivez-le avant d'y ajouter ${noun.singular}.`);
  }

  if (zoneId === null) return;

  const zone = await db.first<{ space_id: Id }>('SELECT space_id FROM zones WHERE id = ?', [zoneId]);
  if (!zone) throw businessRule(`La zone ${zoneId} n'existe pas.`);
  if (zone.space_id !== spaceId) {
    throw businessRule(`La zone ${zoneId} n'appartient pas à l'espace « ${space.name} ».`);
  }
}

/**
 * Le journal et les tâches d'un élément le suivent : ils restent dans son espace et sa zone, ce
 * qui permet de supprimer sans perte un espace ou une zone vidés de leurs éléments.
 */
export async function moveHistory(db: Db, itemId: Id, spaceId: Id, zoneId: Id | null): Promise<void> {
  await db.run('UPDATE journal_entries SET space_id = ?, zone_id = ? WHERE item_id = ?', [spaceId, zoneId, itemId]);
  await db.run('UPDATE garden_tasks SET space_id = ?, zone_id = ? WHERE item_id = ?', [spaceId, zoneId, itemId]);
}
