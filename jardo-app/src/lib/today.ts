import type { GardenTask, Id, JournalEntry, SpaceKind } from '@/api/types';
import { addDays, daysBetween, type DateOnly } from '@/domain/dates';

import { lowerFirst, taskPhrase, taskTitle } from './garden';

// L'organisation d'Aujourd'hui, à partir des tâches dues sur l'horizon `Month` : le service a déjà
// calculé échéances et retards, l'écran ne fait que les ranger.

export type WeekDay = {
  date: DateOnly;
  /** Quelque chose est prévu ce jour-là ; aujourd'hui, les retards comptent. */
  planned: boolean;
  /** Aujourd'hui seulement : il y a du retard. */
  overdue: boolean;
};

/** Les sept jours d'aujourd'hui à dans six jours. */
export function weekDays(tasks: readonly GardenTask[], today: DateOnly): WeekDay[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(today, offset);
    const overdue = offset === 0 && tasks.some((task) => task.status === 'Overdue');
    return { date, planned: overdue || tasks.some((task) => task.nextDueDate === date), overdue };
  });
}

/** Les plus en retard d'abord. */
export const overdueTasks = (tasks: readonly GardenTask[]) =>
  tasks.filter((task) => task.status === 'Overdue').sort((a, b) => b.daysOverdue - a.daysOverdue);

/** Ce qui est prévu ce jour-là, retards à part. */
export const tasksOn = (tasks: readonly GardenTask[], date: DateOnly) =>
  tasks.filter((task) => task.status !== 'Overdue' && task.nextDueDate === date);

export type SpaceGroup = { spaceId: Id; spaceName: string; spaceKind: SpaceKind; tasks: GardenTask[] };

/** Un groupe par espace, le plus chargé d'abord ; dans un espace, l'arrosage d'abord. */
export function bySpace(tasks: readonly GardenTask[]): SpaceGroup[] {
  const groups = new Map<Id, SpaceGroup>();
  for (const task of tasks) {
    const group = groups.get(task.spaceId);
    if (group) group.tasks.push(task);
    else groups.set(task.spaceId, { spaceId: task.spaceId, spaceName: task.spaceName, spaceKind: task.spaceKind, tasks: [task] });
  }

  const wateringFirst = (task: GardenTask) => (task.kind === 'Watering' ? 0 : 1);
  return [...groups.values()]
    .map((group) => ({ ...group, tasks: group.tasks.sort((a, b) => wateringFirst(a) - wateringFirst(b)) }))
    .sort((a, b) => b.tasks.length - a.tasks.length || a.spaceName.localeCompare(b.spaceName, 'fr'));
}

/**
 * Le calendrier de saison : les tâches annuelles ou ponctuelles à venir sur l'horizon lu (les
 * trente prochains jours), par date. Les tâches régulières n'y figurent pas : elles reviennent
 * trop souvent pour qu'on les annonce.
 */
export const comingThisMonth = (tasks: readonly GardenTask[], today: DateOnly) =>
  tasks.filter((task) => task.recurrence !== 'EveryNDays' && task.nextDueDate !== null && task.nextDueDate > today);

/**
 * La ligne repliée de « Dans le mois » : « Tailler les pommiers, traiter (Verger) ». Une tâche sans
 * titre ne dit que son intervention : sa cible la précise.
 */
export function monthSummary(tasks: readonly GardenTask[]): string {
  const text = tasks
    .map((task) => task.title ?? `${lowerFirst(taskTitle(task))} (${task.itemName ?? task.zoneName ?? task.spaceName})`)
    .map((name, index) => (index === 0 ? name : lowerFirst(name)))
    .join(', ');
  return text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);
}

const things =(count: number) => `${count} ${count > 1 ? 'choses' : 'chose'}`;

/**
 * La phrase du ciel du jour : combien de choses attendent et combien sont en retard ; quand tout
 * est fait, ce qui vient demain.
 */
export function skyPhrase(tasks: readonly GardenTask[], today: DateOnly): string {
  const overdue = overdueTasks(tasks).length;
  const waiting = overdue + tasksOn(tasks, today).length;

  if (waiting > 0) {
    if (overdue === waiting) return `${things(overdue)} en retard au jardin`;
    return `${things(waiting)} à faire au jardin${overdue > 0 ? `, dont ${overdue} en retard` : ''}`;
  }

  const tomorrow = bySpace(tasksOn(tasks, addDays(today, 1))).flatMap((group) => group.tasks);
  if (tomorrow.length === 0) return "Tout est fait pour aujourd'hui.";
  const others = tomorrow.length - 1;
  const more = others === 0 ? '' : others === 1 ? ' et 1 autre chose' : ` et ${others} autres choses`;
  return `Tout est fait pour aujourd'hui. Demain : ${taskPhrase(tomorrow[0])}${more}.`;
}

/** « tous les 3 jours », « chaque année » : le rythme, dans la ligne d'une tâche. */
export function rhythm(task: Pick<GardenTask, 'recurrence' | 'intervalDays'>): string {
  switch (task.recurrence) {
    case 'EveryNDays':
      return task.intervalDays === 1 ? 'tous les jours' : `tous les ${task.intervalDays} jours`;
    case 'Yearly':
      return 'chaque année';
    case 'Once':
      return 'une seule fois';
  }
}

/** « en retard de 2 jours ». */
export const lateness = (days: number) => `en retard de ${days} ${days > 1 ? 'jours' : 'jour'}`;

/** « Hier », « Il y a 12 jours » : la dernière fois, dans la feuille de la tâche. */
export function sinceDone(lastDoneOn: DateOnly | null, today: DateOnly): string {
  if (lastDoneOn === null) return 'Pas encore faite';
  const days = daysBetween(lastDoneOn, today);
  if (days <= 0) return "Aujourd'hui";
  return days === 1 ? 'Hier' : `Il y a ${days} jours`;
}

/**
 * La dernière récolte chiffrée qui vaut pour la cible de la tâche, selon la règle du journal :
 * celle de l'élément, de sa zone ou de son espace, jamais celle d'un élément pour sa zone.
 * `entries` : les récoltes lues pour la cible, les plus récentes d'abord.
 */
export function lastHarvest(entries: readonly JournalEntry[], task: GardenTask): JournalEntry | undefined {
  const counts = (entry: JournalEntry) =>
    entry.spaceId === task.spaceId &&
    (entry.itemId !== null ? entry.itemId === task.itemId : entry.zoneId === null || entry.zoneId === task.zoneId);
  return entries.find((entry) => entry.kind === 'Harvest' && entry.quantity !== null && counts(entry));
}

/**
 * Un arrosage dû de l'espace, retards compris : « Tout arroser » les note tous d'un seul arrosage
 * sur l'espace, qui vaut pour ses zones et ses éléments.
 */
export const isDueWatering = (task: GardenTask, spaceId: Id) =>
  task.spaceId === spaceId && task.kind === 'Watering' && task.status !== 'Ok';

/** Les arrosages dus de l'espace : « Tout arroser » est proposé à partir de deux. */
export const dueWaterings = (tasks: readonly GardenTask[], spaceId: Id) => tasks.filter((task) => isDueWatering(task, spaceId));
