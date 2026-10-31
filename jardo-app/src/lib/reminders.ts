import type { GardenTask } from '@/api/types';
import { addDays, type DateOnly } from '@/domain/dates';

import { parseDateOnly, toDateOnly } from './dates';
import { lowerFirst } from './garden';
import { bySpace, monthSummary } from './today';

// Le rappel du jour, calculé d'une traite à partir des tâches dues : l'app programme les
// prochains jours d'avance, et les reprogramme à chaque changement.

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

export const defaultReminderSettings: ReminderSettings = { enabled: false, hour: 8, minute: 0 };

/**
 * Les jours programmés d'avance. iOS ne garde que 64 notifications en attente par app, et Android
 * refuse au-delà de 500 alarmes : deux semaines restent loin de ces limites. L'app reprogramme à
 * chaque retour : deux semaines couvrent une absence, et une app délaissée cesse d'elle-même
 * de rappeler.
 */
export const reminderDays = 14;

/** Le nombre de tâches nommées dans le rappel, avant les points de suspension. */
const namedTasks = 3;

export type Reminder = { date: Date; body: string };

const things = (count: number) => `${count} ${count > 1 ? 'choses' : 'chose'}`;

/**
 * Ce qui attend ce jour-là si rien n'est fait d'ici là : ce qui y tombe et tout ce qui est en
 * retard à cette date. Le report est déjà dans l'échéance calculée par le service.
 */
function waitingOn(tasks: readonly GardenTask[], date: DateOnly) {
  const late = tasks
    .filter((task) => task.nextDueDate !== null && task.nextDueDate < date)
    .sort((a, b) => a.nextDueDate!.localeCompare(b.nextDueDate!));
  const onDay = bySpace(tasks.filter((task) => task.nextDueDate === date)).flatMap((group) => group.tasks);
  return { late, all: [...late, ...onDay] };
}

/**
 * « 3 choses au jardin aujourd'hui, dont 1 en retard : arroser (Potager), tailler les pommiers… ».
 * Null quand rien n'attend ce jour-là : pas de rappel.
 */
export function reminderSentence(tasks: readonly GardenTask[], date: DateOnly): string | null {
  const { late, all } = waitingOn(tasks, date);
  if (all.length === 0) return null;

  const head =
    late.length === all.length
      ? `${things(late.length)} en retard au jardin`
      : `${things(all.length)} au jardin aujourd'hui${late.length > 0 ? `, dont ${late.length} en retard` : ''}`;
  const list = lowerFirst(monthSummary(all.slice(0, namedTasks)));
  return `${head} : ${list}${all.length > namedTasks ? '…' : '.'}`;
}

/** Les rappels des `reminderDays` prochains jours, à l'heure choisie ; aujourd'hui seulement si l'heure n'est pas passée. */
export function planReminders(tasks: readonly GardenTask[], now: Date, { hour, minute }: ReminderSettings): Reminder[] {
  const today = toDateOnly(now);
  const reminders: Reminder[] = [];

  for (let offset = 0; offset < reminderDays; offset++) {
    const day = addDays(today, offset);
    const date = parseDateOnly(day);
    date.setHours(hour, minute);
    const body = reminderSentence(tasks, day);
    if (body !== null && date > now) reminders.push({ date, body });
  }

  return reminders;
}

/** « 8 h », « 18 h 30 ». */
export const formatReminderTime = ({ hour, minute }: Pick<ReminderSettings, 'hour' | 'minute'>) =>
  minute === 0 ? `${hour} h` : `${hour} h ${String(minute).padStart(2, '0')}`;
