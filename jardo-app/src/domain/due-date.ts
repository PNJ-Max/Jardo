import { addDays, addYears, daysBetween, yearOf, type DateOnly } from './dates';
import type { DueStatus, TaskRecurrence } from './types';

/**
 * Une tâche annuelle faite jusqu'à un mois avant sa date compte pour cette année-là : tailler le
 * 25 janvier fait la taille du 1er février, et la suivante tombe le 1er février de l'an prochain.
 * Une taille en vert de septembre, elle, ne fait pas celle de février.
 */
export const yearlyEarlyToleranceDays = 30;

/** L'échéance d'une tâche à une date donnée. Jamais stockée : elle dépend du journal et de la date du jour. */
export type DueState = {
  /** La dernière intervention de même type qui vaut pour la cible, ou null. */
  lastDoneOn: DateOnly | null;
  /** La prochaine échéance ; null pour une tâche ponctuelle faite. */
  nextDueDate: DateOnly | null;
  status: DueStatus;
  /** Jours de retard. 0 si l'échéance n'est pas dépassée. */
  daysOverdue: number;
};

export type DueInput = {
  recurrence: TaskRecurrence;
  /** Première échéance : date anniversaire ou jour prévu, selon le rythme. */
  startDate: DateOnly;
  /** Le nombre de jours d'une tâche tous les N jours, au moins 1. */
  intervalDays: number | null;
  lastDoneOn: DateOnly | null;
  /**
   * Le jour où la tâche a été créée. Une tâche ponctuelle est close par une intervention faite ce
   * jour-là ou après, avant comme après sa date prévue : faire en avance compte, mais un arrosage de
   * la semaine dernière ne ferme pas un « arroser » ponctuel créé aujourd'hui.
   */
  createdOn: DateOnly;
  today: DateOnly;
};

/**
 * Fonction pure : la dernière intervention et la date du jour sont fournies par l'appelant, pour
 * que le calcul soit testable sans horloge ni base.
 */
export function calculateDueState({
  recurrence,
  startDate,
  intervalDays,
  lastDoneOn,
  createdOn,
  today,
}: DueInput): DueState {
  const nextDueDate = nextDue(recurrence, startDate, intervalDays, lastDoneOn, createdOn);

  if (nextDueDate === null) {
    return { lastDoneOn, nextDueDate: null, status: 'Ok', daysOverdue: 0 };
  }

  const daysLate = daysBetween(nextDueDate, today);
  const status: DueStatus = daysLate > 0 ? 'Overdue' : daysLate === 0 ? 'DueSoon' : 'Ok';

  return { lastDoneOn, nextDueDate, status, daysOverdue: Math.max(0, daysLate) };
}

function nextDue(
  recurrence: TaskRecurrence,
  startDate: DateOnly,
  intervalDays: number | null,
  lastDoneOn: DateOnly | null,
  createdOn: DateOnly,
): DateOnly | null {
  switch (recurrence) {
    case 'EveryNDays':
      return nextEveryNDays(startDate, intervalDays, lastDoneOn);
    case 'Yearly':
      return nextYearly(startDate, lastDoneOn);
    case 'Once':
      return lastDoneOn !== null && lastDoneOn >= createdOn ? null : startDate;
    default:
      throw new RangeError(`Rythme inconnu : ${String(recurrence)}.`);
  }
}

// La date de départ prime sur un historique plus ancien : une tâche créée pour une plante
// arrivée dans un carré arrosé il y a dix jours ne naît pas en retard.
function nextEveryNDays(startDate: DateOnly, intervalDays: number | null, lastDoneOn: DateOnly | null): DateOnly {
  if (intervalDays === null || !Number.isInteger(intervalDays) || intervalDays < 1) {
    throw new RangeError("Une tâche tous les N jours a un intervalle d'au moins 1 jour.");
  }

  if (lastDoneOn !== null) {
    const next = addDays(lastDoneOn, intervalDays);
    if (next > startDate) return next;
  }
  return startDate;
}

// La dernière intervention fait la plus récente date anniversaire qu'elle précède d'un mois au
// plus, même en retard ; l'échéance est la date anniversaire d'après. Sans intervention qui
// compte, c'est la date de départ, même passée depuis longtemps.
function nextYearly(startDate: DateOnly, lastDoneOn: DateOnly | null): DateOnly {
  if (lastDoneOn === null) return startDate;

  const covered = addDays(lastDoneOn, yearlyEarlyToleranceDays);
  if (covered < startDate) return startDate;

  // addYears depuis la date de départ, et non d'année en année : un 29 février revient en
  // 29 février les années bissextiles.
  const years = yearOf(covered) - yearOf(startDate);
  const candidate = addYears(startDate, years);

  return candidate > covered ? candidate : addYears(startDate, years + 1);
}
