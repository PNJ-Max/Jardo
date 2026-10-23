import { calculateDueState } from '@/domain/due-date';
import { latestInterventions, type InterventionRow } from '@/domain/latest-interventions';
import type { DateOnly } from '@/domain/dates';
import type { Id, JournalEntryKind, TaskRecurrence } from '@/domain/types';
import { toDateOnly } from '@/lib/dates';

import type { Db } from './db';

type TaskRow = {
  kind: JournalEntryKind;
  recurrence: TaskRecurrence;
  start_date: DateOnly;
  interval_days: number | null;
  space_id: Id;
  zone_id: Id | null;
  item_id: Id | null;
  created_at: string;
};

const placeholders = (values: readonly unknown[]) => values.map(() => '?').join(', ');

/**
 * Les tâches de ces espaces qui sont dues aujourd'hui ou en retard, comptées par espace. Les
 * tâches qui peuvent être dues (`TaskQueries.Active`) ne visent ni un espace archivé ni un élément
 * archivé. L'échéance n'est pas stockée : on la calcule pour chaque tâche avant de compter.
 */
export async function countDueTasksBySpace(db: Db, spaceIds: readonly Id[], today: DateOnly): Promise<Map<Id, number>> {
  const counts = new Map<Id, number>();
  if (spaceIds.length === 0) return counts;

  const tasks = await db.all<TaskRow>(
    `SELECT t.kind, t.recurrence, t.start_date, t.interval_days, t.space_id, t.zone_id, t.item_id, t.created_at
     FROM garden_tasks t
     JOIN spaces s ON s.id = t.space_id
     LEFT JOIN garden_items i ON i.id = t.item_id
     WHERE s.is_archived = 0 AND (i.id IS NULL OR i.is_archived = 0) AND t.space_id IN (${placeholders(spaceIds)})`,
    spaceIds,
  );
  if (tasks.length === 0) return counts;

  // Groupé par cible : la taille du résultat suit le nombre de cibles, pas l'historique du journal.
  const journal = (
    await db.all<{ kind: JournalEntryKind; date: DateOnly; space_id: Id; zone_id: Id | null; item_id: Id | null }>(
      `SELECT kind, MAX(date) AS date, space_id, zone_id, item_id
       FROM journal_entries
       WHERE space_id IN (${placeholders(spaceIds)})
       GROUP BY kind, space_id, zone_id, item_id`,
      spaceIds,
    )
  ).map<InterventionRow>((row) => ({
    kind: row.kind,
    date: row.date,
    spaceId: row.space_id,
    zoneId: row.zone_id,
    itemId: row.item_id,
  }));

  const latestByKind = new Map(
    [...new Set(tasks.map((task) => task.kind))].map((kind) => [kind, latestInterventions(journal, kind)]),
  );

  for (const task of tasks) {
    const state = calculateDueState({
      recurrence: task.recurrence,
      startDate: task.start_date,
      intervalDays: task.interval_days,
      lastDoneOn: latestByKind.get(task.kind)!.forTarget(task.space_id, task.zone_id, task.item_id),
      createdOn: toDateOnly(new Date(task.created_at)),
      today,
    });

    if (state.status !== 'Ok') counts.set(task.space_id, (counts.get(task.space_id) ?? 0) + 1);
  }

  return counts;
}
