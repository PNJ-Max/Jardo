import { randomUUID } from 'expo-crypto';

import { addDays, type DateOnly } from '@/domain/dates';
import { journalEntryKinds, taskRecurrences, type Id, type JournalEntryKind, type TaskRecurrence } from '@/domain/types';
import { toDateOnly } from '@/lib/dates';

import type { Clock } from './clock';
import type { Db } from './db';
import { resolveInterventionTarget, targetCondition, type InterventionTarget } from './intervention-target';
import { createJournalService, insertJournalEntry, type JournalEntry } from './journal';
import { businessRule, notFound } from './problem';
import { activeTasks, readTasks, type GardenTask } from './task-queries';
import { optionalText, Validation } from './validation';

export type { GardenTask } from './task-queries';

/** Pour créer ou modifier une tâche. La cible suit les règles du journal. */
export type TaskInput = {
  /** Le type d'intervention qui fait la tâche. */
  kind: JournalEntryKind;
  /** Facultatif, sauf pour une tâche « autre ». */
  title?: string | null;
  recurrence: TaskRecurrence;
  /** Obligatoire pour `EveryNDays`, refusé sinon. */
  intervalDays?: number | null;
  /**
   * `EveryNDays` : première échéance. `Yearly` : la date anniversaire, à partir de cette année-là.
   * `Once` : le jour prévu.
   */
  startDate: DateOnly;
  spaceId: Id;
  zoneId?: Id | null;
  /** Si l'élément est dans une zone, la tâche la prend d'office. */
  itemId?: Id | null;
};

/** Tous les champs sont optionnels. */
export type CompleteTaskInput = {
  /** Jour où la tâche a été faite. Si absent, la date du jour ; une date future est refusée. */
  date?: DateOnly | null;
  /** La note de l'entrée du journal. Si absente, le titre de la tâche. */
  note?: string | null;
};

export type TaskCompletion = {
  /** La tâche, échéance recalculée. */
  task: GardenTask;
  /** L'entrée notée au journal : la supprimer annule le « Fait ». */
  entry: JournalEntry;
};

export type TaskPostponement = {
  /** La tâche, échéance recalculée. */
  task: GardenTask;
  /** Le report d'avant, souvent null : le remettre annule « Reporter ». */
  previous: DateOnly | null;
};

/**
 * Jusqu'où regarder les tâches dues, retards compris : aujourd'hui, les sept jours d'aujourd'hui à
 * dans six jours, ou les trente prochains jours.
 */
export type DueHorizon = 'Today' | 'Week' | 'Month';

const horizonDays: Record<DueHorizon, number> = { Today: 0, Week: 6, Month: 30 };

export const validate = (input: TaskInput) =>
  new Validation()
    .oneOf('Kind', 'Type', input.kind, journalEntryKinds)
    .optional('Title', 'Titre', input.title, 100)
    .oneOf('Recurrence', 'Rythme', input.recurrence, taskRecurrences)
    .optionalRange('IntervalDays', "Nombre de jours", input.intervalDays, 1, 365, { integer: true })
    .date('StartDate', 'Date de départ', input.startDate, { required: true })
    .id('SpaceId', 'Espace', input.spaceId)
    .id('ZoneId', 'Zone', input.zoneId, { nullable: true })
    .id('ItemId', 'Élément', input.itemId, { nullable: true })
    .done();

export const validatePostponement = (until: DateOnly | null) =>
  new Validation().date('PostponedUntil', 'Reporter au', until).done();

export function ensureTaskFields(
  kind: JournalEntryKind,
  recurrence: TaskRecurrence,
  intervalDays: number | null,
  title: string | null,
) {
  if (recurrence === 'EveryNDays' && intervalDays === null) {
    throw businessRule('Une tâche tous les N jours a besoin de son nombre de jours.');
  }
  if (recurrence !== 'EveryNDays' && intervalDays !== null) {
    throw businessRule("Seule une tâche tous les N jours a un nombre de jours.");
  }
  if (kind === 'Other' && title === null) {
    throw businessRule("Une tâche « autre » a besoin d'un titre pour dire ce qu'il y a à faire.");
  }
}

// Tri en mémoire : l'échéance est calculée, pas stockée. Suffisant pour quelques dizaines de tâches.
// `readTasks` rend les tâches dans l'ordre de création, que le tri stable garde à égalité.
const orderByDueDate = (tasks: GardenTask[]) =>
  tasks.sort(
    (a, b) =>
      (a.nextDueDate ?? '9999-12-31').localeCompare(b.nextDueDate ?? '9999-12-31') ||
      a.spaceName.localeCompare(b.spaceName),
  );

type TaskTarget = { id: Id; kind: JournalEntryKind; title: string | null } & InterventionTarget;

/** Les tâches du jardin et leur échéance (`TaskService`). Faire une tâche, c'est noter l'intervention au journal. */
export function createTaskService(db: Db, clock: Clock) {
  const today = () => toDateOnly(clock());
  const journal = createJournalService(db, clock);

  async function getById(id: Id): Promise<GardenTask> {
    const [task] = await readTasks(db, 't.id = ?', [id], today());
    if (!task) throw notFound('Task', id);
    return task;
  }

  async function existing(id: Id): Promise<TaskTarget> {
    const row = await db.first<{ id: Id; kind: JournalEntryKind; title: string | null; space_id: Id; zone_id: Id | null; item_id: Id | null }>(
      'SELECT id, kind, title, space_id, zone_id, item_id FROM garden_tasks WHERE id = ?',
      [id],
    );
    if (!row) throw notFound('Task', id);
    return { id: row.id, kind: row.kind, title: row.title, spaceId: row.space_id, zoneId: row.zone_id, itemId: row.item_id };
  }

  /** Les règles d'une tâche avant son écriture, dans la transaction de celle-ci. */
  async function prepare(input: TaskInput, current: InterventionTarget | null) {
    const title = optionalText(input.title);
    const intervalDays = input.intervalDays ?? null;
    ensureTaskFields(input.kind, input.recurrence, intervalDays, title);

    const target = await resolveInterventionTarget(
      db,
      { spaceId: input.spaceId, zoneId: input.zoneId ?? null, itemId: input.itemId ?? null },
      input.kind,
      current,
      'prévoir une tâche',
    );
    return { title, intervalDays, target };
  }

  return {
    /**
     * Les tâches, les plus en retard d'abord. Sans cible, tout le jardin. Pour une cible, comme le
     * journal : ses tâches, celles de ce qu'elle contient, et celles de la zone ou de l'espace qui
     * la contient.
     */
    async getAll({
      spaceId,
      zoneId,
      itemId,
    }: { spaceId?: Id | null; zoneId?: Id | null; itemId?: Id | null } = {}): Promise<GardenTask[]> {
      const condition = await targetCondition(
        db,
        't',
        { spaceId, zoneId, itemId },
        'Les tâches se lisent pour une seule cible à la fois : un espace, une zone ou un élément.',
      );

      return orderByDueDate(await readTasks(db, condition?.sql ?? null, condition?.params ?? [], today()));
    },

    /**
     * Les tâches dues de tout le jardin, toutes catégories, les plus en retard d'abord. Celles des
     * éléments et des espaces archivés n'y figurent jamais.
     */
    async getDue(horizon: DueHorizon): Promise<GardenTask[]> {
      const now = today();
      const limit = addDays(now, horizonDays[horizon]);

      const tasks = await readTasks(db, activeTasks, [], now);
      return orderByDueDate(tasks.filter((task) => task.nextDueDate !== null && task.nextDueDate <= limit));
    },

    getById,

    async create(input: TaskInput): Promise<GardenTask> {
      validate(input);
      const id = randomUUID();

      await db.transaction(async () => {
        const { title, intervalDays, target } = await prepare(input, null);

        await db.run(
          `INSERT INTO garden_tasks (id, kind, recurrence, start_date, interval_days, title, space_id, zone_id, item_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.kind,
            input.recurrence,
            input.startDate,
            intervalDays,
            title,
            target.spaceId,
            target.zoneId,
            target.itemId,
            clock().toISOString(),
          ],
        );
      });

      return getById(id);
    },

    /** Modifie une tâche, cible et rythme compris. */
    async update(id: Id, input: TaskInput): Promise<GardenTask> {
      validate(input);

      await db.transaction(async () => {
        const task = await existing(id);
        const { title, intervalDays, target } = await prepare(input, task);

        await db.run(
          `UPDATE garden_tasks SET kind = ?, recurrence = ?, start_date = ?, interval_days = ?, title = ?,
             space_id = ?, zone_id = ?, item_id = ?
           WHERE id = ?`,
          [input.kind, input.recurrence, input.startDate, intervalDays, title, target.spaceId, target.zoneId, target.itemId, id],
        );
      });

      return getById(id);
    },

    /** Supprime une tâche ; le journal n'est pas touché. */
    async delete(id: Id): Promise<void> {
      await db.transaction(async () => {
        await existing(id);
        await db.run('DELETE FROM garden_tasks WHERE id = ?', [id]);
      });
    },

    /**
     * « Fait » : note l'intervention au journal, sur la cible de la tâche, et renvoie la tâche
     * recalculée avec l'entrée notée. Une tâche ponctuelle est close dès que c'est fait, même avant
     * sa date.
     */
    async complete(id: Id, input: CompleteTaskInput = {}): Promise<TaskCompletion> {
      new Validation().date('Date', 'Date', input.date).optional('Note', 'Note', input.note, 1000).done();

      const entryId = await db.transaction(async () => {
        const task = await existing(id);

        return insertJournalEntry(db, clock, {
          date: input.date ?? today(),
          kind: task.kind,
          note: optionalText(input.note) ?? task.title,
          spaceId: task.spaceId,
          zoneId: task.zoneId,
          itemId: task.itemId,
        });
      });

      return { task: await getById(id), entry: await journal.getById(entryId) };
    },

    /**
     * « Reporter » : l'échéance ne tombe pas avant `until`, un jour à venir après elle. Rien n'est
     * noté au journal, et la prochaine intervention notée sur la cible rend le report sans effet.
     */
    async postpone(id: Id, until: DateOnly): Promise<TaskPostponement> {
      new Validation().date('PostponedUntil', 'Reporter au', until, { required: true }).done();
      if (until <= today()) throw businessRule('Une tâche se reporte à un jour à venir.');

      const previous = await db.transaction(async () => {
        const task = await getById(id);
        if (task.nextDueDate === null) throw businessRule("Cette tâche ponctuelle est déjà faite : il n'y a rien à reporter.");
        if (task.nextDueDate >= until) throw businessRule("Cette tâche n'est pas due avant ce jour-là : il n'y a rien à reporter.");

        await db.run('UPDATE garden_tasks SET postponed_until = ? WHERE id = ?', [until, id]);
        return task.postponedUntil;
      });

      return { task: await getById(id), previous };
    },

    /** Annule « Reporter » : remet le report d'avant tel quel, même passé, ou aucun. */
    async restorePostponement(id: Id, previous: DateOnly | null): Promise<GardenTask> {
      validatePostponement(previous);

      await db.transaction(async () => {
        await existing(id);
        await db.run('UPDATE garden_tasks SET postponed_until = ? WHERE id = ?', [previous, id]);
      });

      return getById(id);
    },
  };
}
