import type { WoodMovement } from '@/domain/wood-pile';
import type { Id, JournalEntryKind } from '@/domain/types';

import type { Db } from './db';

/**
 * Lecture des apports et consommations de bois du journal : seules comptent les entrées qui visent
 * un tas. Une entrée notée sur l'espace ou une zone, sans tas, n'entre dans le stock d'aucun.
 *
 * @param excludingEntryId Une entrée à ignorer, pour vérifier un stock en y substituant l'entrée
 * qu'on s'apprête à écrire.
 */
export async function loadWoodMovements(
  db: Db,
  pileIds: readonly Id[],
  excludingEntryId: Id | null,
): Promise<Map<Id, WoodMovement[]>> {
  const movements = new Map<Id, WoodMovement[]>();
  if (pileIds.length === 0) return movements;

  const rows = await db.all<{ item_id: Id; kind: JournalEntryKind; quantity: number | null }>(
    `SELECT item_id, kind, quantity FROM journal_entries
     WHERE item_id IN (${pileIds.map(() => '?').join(', ')})
       AND kind IN ('WoodSupply', 'WoodConsumption')
       AND (? IS NULL OR id <> ?)`,
    [...pileIds, excludingEntryId, excludingEntryId],
  );

  for (const row of rows) {
    const pileMovements = movements.get(row.item_id) ?? [];
    pileMovements.push({ kind: row.kind, steres: row.quantity ?? 0 });
    movements.set(row.item_id, pileMovements);
  }
  return movements;
}
