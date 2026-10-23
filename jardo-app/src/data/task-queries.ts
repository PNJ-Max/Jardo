import type { DateOnly } from '@/domain/dates';
import { calculateDueState } from '@/domain/due-date';
import { latestInterventions, type InterventionRow } from '@/domain/latest-interventions';
import type { DueStatus, Id, ItemKind, JournalEntryKind, TaskRecurrence } from '@/domain/types';
import { toDateOnly } from '@/lib/dates';

import type { Db, SqlValue } from './db';
import type { TargetNames } from './intervention-target';

/** Une tâche telle que l'API la renvoyait, avec le nom de sa cible et son échéance. */
export type GardenTask = {
  id: Id;
  kind: JournalEntryKind;
  /** Facultatif, sauf pour une tâche « autre ». */
  title: string | null;
  recurrence: TaskRecurrence;
  intervalDays: number | null;
  startDate: DateOnly;
  createdAt: string;
  spaceId: Id;
  spaceName: string;
  zoneId: Id | null;
  zoneName: string | null;
  /** Null pour une tâche sur une zone ou sur tout l'espace. */
  itemId: Id | null;
  itemName: string | null;
  /** Null sans élément visé. */
  itemKind: ItemKind | null;
  // Échéance : recalculée à chaque lecture, jamais stockée.
  /** La dernière intervention de même type qui vaut pour la cible. */
  lastDoneOn: DateOnly | null;
  /** Null pour une tâche ponctuelle faite. */
  nextDueDate: DateOnly | null;
  status: DueStatus;
  /** Jours de retard, 0 si l'échéance n'est pas dépassée. */
  daysOverdue: number;
  /** Vrai pour une tâche ponctuelle faite. */
  isCompleted: boolean;
};

type TaskRow = TargetNames & {
  id: Id;
  kind: JournalEntryKind;
  title: string | null;
  recurrence: TaskRecurrence;
  start_date: DateOnly;
  interval_days: number | null;
  created_at: string;
  space_id: Id;
  zone_id: Id | null;
  item_id: Id | null;
};

export const selectTasks = `
  SELECT t.id, t.kind, t.title, t.recurrence, t.start_date, t.interval_days, t.created_at,
    t.space_id, s.name AS space_name, t.zone_id, z.name AS zone_name,
    t.item_id, i.name AS item_name, i.item_type
  FROM garden_tasks t
  JOIN spaces s ON s.id = t.space_id
  LEFT JOIN zones z ON z.id = t.zone_id
  LEFT JOIN garden_items i ON i.id = t.item_id`;

/** Les tâches qui peuvent être dues (`TaskQueries.Active`) : ni leur espace ni leur élément ne sont archivés. */
export const activeTasks = 's.is_archived = 0 AND (i.id IS NULL OR i.is_archived = 0)';

/**
 * Lit les tâches qui vérifient `where`, dans l'ordre de création, avec leur échéance. Le
 * `where` s'écrit sur les alias `t`, `s`, `z` et `i` de `selectTasks`.
 */
export async function readTasks(
  db: Db,
  where: string | null,
  params: readonly SqlValue[],
  today: DateOnly,
): Promise<GardenTask[]> {
  const rows = await db.all<TaskRow>(`${selectTasks} ${where ? `WHERE ${where}` : ''} ORDER BY t.rowid`, params);
  return withDueStates(db, rows, today);
}

const placeholders = (values: readonly unknown[]) => values.map(() => '?').join(', ');

/**
 * Calcule l'échéance de chaque tâche. L'échéance n'est pas stockée : elle dépend du journal des
 * espaces concernés (une intervention ne vaut que dans son espace) et de la date du jour.
 */
async function withDueStates(db: Db, rows: readonly TaskRow[], today: DateOnly): Promise<GardenTask[]> {
  if (rows.length === 0) return [];

  const spaceIds = [...new Set(rows.map((row) => row.space_id))];

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
    [...new Set(rows.map((row) => row.kind))].map((kind) => [kind, latestInterventions(journal, kind)]),
  );

  return rows.map((row) => {
    const state = calculateDueState({
      recurrence: row.recurrence,
      startDate: row.start_date,
      intervalDays: row.interval_days,
      lastDoneOn: latestByKind.get(row.kind)!.forTarget(row.space_id, row.zone_id, row.item_id),
      createdOn: toDateOnly(new Date(row.created_at)),
      today,
    });

    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      recurrence: row.recurrence,
      intervalDays: row.interval_days,
      startDate: row.start_date,
      createdAt: row.created_at,
      spaceId: row.space_id,
      spaceName: row.space_name,
      zoneId: row.zone_id,
      zoneName: row.zone_name,
      itemId: row.item_id,
      itemName: row.item_name,
      itemKind: row.item_type,
      ...state,
      isCompleted: state.nextDueDate === null,
    };
  });
}

/** Les tâches de ces espaces qui sont dues aujourd'hui ou en retard, comptées par espace. */
export async function countDueTasksBySpace(db: Db, spaceIds: readonly Id[], today: DateOnly): Promise<Map<Id, number>> {
  const counts = new Map<Id, number>();
  if (spaceIds.length === 0) return counts;

  const tasks = await readTasks(db, `${activeTasks} AND t.space_id IN (${placeholders(spaceIds)})`, spaceIds, today);
  for (const task of tasks) {
    if (task.status !== 'Ok') counts.set(task.spaceId, (counts.get(task.spaceId) ?? 0) + 1);
  }

  return counts;
}
