import type { DateOnly } from './dates';
import type { Id, JournalEntryKind } from './types';

/** Une entrée du journal, réduite à ce qui sert à dater une cible. */
export type InterventionRow = {
  kind: JournalEntryKind;
  date: DateOnly;
  spaceId: Id;
  zoneId: Id | null;
  itemId: Id | null;
};

/**
 * La dernière date d'un type d'intervention pour une cible, selon la règle du journal : une entrée
 * sur une zone vaut pour la zone et chacun de ses éléments, une entrée sur un espace pour tout ce
 * qu'il contient. « Arroser le carré 2 » compte comme arrosage de chaque plante du carré ; arroser
 * une plante, en revanche, n'arrose pas son carré. L'élément est pris là où il se trouve au moment
 * de la lecture.
 */
export type LatestInterventions = {
  /** Pour un espace, une de ses zones, ou un de ses éléments avec la zone où il se trouve. */
  forTarget(spaceId: Id, zoneId: Id | null, itemId: Id | null): DateOnly | null;
};

/** Lignes du journal déjà lues ; seules celles de ce `kind` comptent. */
export function latestInterventions(rows: readonly InterventionRow[], kind: JournalEntryKind): LatestInterventions {
  const byItem = new Map<Id, DateOnly>();
  const byZone = new Map<Id, DateOnly>();
  const bySpace = new Map<Id, DateOnly>();

  for (const row of rows) {
    if (row.kind !== kind) continue;

    const [dates, key] =
      row.itemId !== null ? [byItem, row.itemId] : row.zoneId !== null ? [byZone, row.zoneId] : [bySpace, row.spaceId];
    const known = dates.get(key);

    if (known === undefined || row.date > known) dates.set(key, row.date);
  }

  return {
    forTarget(spaceId, zoneId, itemId) {
      const found = [
        itemId === null ? undefined : byItem.get(itemId),
        zoneId === null ? undefined : byZone.get(zoneId),
        bySpace.get(spaceId),
      ].filter((date): date is DateOnly => date !== undefined);

      return found.length === 0 ? null : found.reduce((latest, date) => (date > latest ? date : latest));
    },
  };
}
