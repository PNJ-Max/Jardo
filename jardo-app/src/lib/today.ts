import type { GardenTask, Id, SpaceKind } from '@/api/types';
import { addDays, type DateOnly } from '@/domain/dates';

import { taskPhrase } from './garden';

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

const things = (count: number) => `${count} ${count > 1 ? 'choses' : 'chose'}`;

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
