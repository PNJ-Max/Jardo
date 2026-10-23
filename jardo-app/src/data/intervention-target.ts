import { entryKindLabel, isEntryKindAllowedIn, spaceKindLabel } from '@/domain/kinds';
import type { Id, ItemKind, JournalEntryKind, SpaceKind } from '@/domain/types';

import type { Db, SqlValue } from './db';
import { businessRule, notFound } from './problem';

/**
 * La cible d'une entrée du journal ou d'une tâche : un espace, et éventuellement une de ses zones
 * ou un de ses éléments. Un élément situé dans une zone emporte cette zone (`InterventionTarget`).
 */
export type InterventionTarget = { spaceId: Id; zoneId: Id | null; itemId: Id | null };

const isSameTarget = (a: InterventionTarget, b: InterventionTarget) =>
  a.spaceId === b.spaceId && a.zoneId === b.zoneId && a.itemId === b.itemId;

/**
 * Vérifie que la cible demandée est cohérente et accueille ce type d'intervention. Une cible
 * archivée n'est refusée que si elle change : ce qui y est déjà reste corrigeable.
 *
 * @param current La cible actuelle pour une modification, null pour une création.
 * @param action Ce que l'archivage empêche, pour le message : « noter une intervention ».
 */
export async function resolveInterventionTarget(
  db: Db,
  { spaceId, zoneId, itemId }: { spaceId: Id; zoneId: Id | null; itemId: Id | null },
  kind: JournalEntryKind,
  current: InterventionTarget | null,
  action: string,
): Promise<InterventionTarget> {
  // 400 et non 404 : ce sont les identifiants du corps qui sont invalides.
  const space = await db.first<{ name: string; kind: SpaceKind; is_archived: number }>(
    'SELECT name, kind, is_archived FROM spaces WHERE id = ?',
    [spaceId],
  );
  if (!space) throw businessRule(`L'espace ${spaceId} n'existe pas.`);

  if (!isEntryKindAllowedIn(kind, space.kind)) {
    throw businessRule(
      `L'espace « ${space.name} » est un espace ${spaceKindLabel(space.kind)} : ` +
        `il n'accueille pas d'intervention « ${entryKindLabel(kind)} ».`,
    );
  }

  if (zoneId !== null) {
    const zone = await db.first<{ name: string; space_id: Id }>('SELECT name, space_id FROM zones WHERE id = ?', [zoneId]);
    if (!zone) throw businessRule(`La zone ${zoneId} n'existe pas.`);
    if (zone.space_id !== spaceId) {
      throw businessRule(`La zone « ${zone.name} » n'appartient pas à l'espace « ${space.name} ».`);
    }
  }

  let target: InterventionTarget = { spaceId, zoneId, itemId: null };
  let item: { name: string; is_archived: number } | null = null;

  if (itemId !== null) {
    const row = await db.first<{ name: string; space_id: Id; zone_id: Id | null; is_archived: number }>(
      'SELECT name, space_id, zone_id, is_archived FROM garden_items WHERE id = ?',
      [itemId],
    );
    if (!row) throw businessRule(`L'élément ${itemId} n'existe pas.`);
    if (row.space_id !== spaceId) {
      throw businessRule(`L'élément « ${row.name} » n'est pas dans l'espace « ${space.name} ».`);
    }
    if (zoneId !== null && row.zone_id !== zoneId) {
      throw businessRule(`L'élément « ${row.name} » n'est pas dans la zone ${zoneId}.`);
    }

    item = row;
    target = { spaceId, zoneId: row.zone_id, itemId };
  }

  if (current && isSameTarget(target, current)) return target;

  if (space.is_archived) {
    throw businessRule(`L'espace « ${space.name} » est archivé : réactivez-le avant d'y ${action}.`);
  }
  if (item?.is_archived) {
    throw businessRule(`L'élément « ${item.name} » est archivé : réactivez-le avant d'y ${action}.`);
  }

  return target;
}

/** Le filtre d'une lecture du journal ou des tâches : au plus une cible à la fois. */
export type TargetFilter = { spaceId?: Id | null; zoneId?: Id | null; itemId?: Id | null };

/** Les jointures d'une lecture pour les noms de la cible, le type de l'élément compris. */
export type TargetNames = {
  space_name: string;
  zone_name: string | null;
  item_name: string | null;
  item_type: ItemKind | null;
};

/**
 * La condition SQL qui garde ce qui concerne une cible : ce qui la vise, ce qui vise ce qu'elle
 * contient, et ce qui vise la zone ou l'espace qui la contient. Une entrée sur une zone concerne
 * donc chacun de ses éléments, une entrée sur un espace tout ce qu'il contient.
 *
 * @param alias L'alias de la table lue (journal_entries ou garden_tasks).
 * @param onlyOne Le message si plusieurs cibles sont données.
 * @returns null quand aucune cible n'est donnée : tout le jardin.
 */
export async function targetCondition(
  db: Db,
  alias: string,
  { spaceId, zoneId, itemId }: TargetFilter,
  onlyOne: string,
): Promise<{ sql: string; params: SqlValue[]; spaceId: Id } | null> {
  if ([spaceId, zoneId, itemId].filter((id) => id != null).length > 1) throw businessRule(onlyOne);

  if (spaceId != null) {
    if (!(await db.first('SELECT 1 FROM spaces WHERE id = ?', [spaceId]))) throw notFound('Space', spaceId);
    return { sql: `${alias}.space_id = ?`, params: [spaceId], spaceId };
  }

  if (zoneId != null) {
    const zone = await db.first<{ space_id: Id }>('SELECT space_id FROM zones WHERE id = ?', [zoneId]);
    if (!zone) throw notFound('Zone', zoneId);
    return {
      sql: `(${alias}.zone_id = ? OR (${alias}.space_id = ? AND ${alias}.zone_id IS NULL AND ${alias}.item_id IS NULL))`,
      params: [zoneId, zone.space_id],
      spaceId: zone.space_id,
    };
  }

  if (itemId != null) {
    const item = await db.first<{ space_id: Id; zone_id: Id | null }>('SELECT space_id, zone_id FROM garden_items WHERE id = ?', [
      itemId,
    ]);
    if (!item) throw notFound('Item', itemId);

    const inSpace = `(${alias}.item_id IS NULL AND ${alias}.zone_id IS NULL AND ${alias}.space_id = ?)`;
    return item.zone_id === null
      ? { sql: `(${alias}.item_id = ? OR ${inSpace})`, params: [itemId, item.space_id], spaceId: item.space_id }
      : {
          sql: `(${alias}.item_id = ? OR (${alias}.item_id IS NULL AND ${alias}.zone_id = ?) OR ${inSpace})`,
          params: [itemId, item.zone_id, item.space_id],
          spaceId: item.space_id,
        };
  }

  return null;
}
