import type { GardenTask } from '@/api/types';
import { addDays, daysBetween } from '@/domain/dates';
import { toDateOnly } from '@/lib/dates';
import { formatReminderTime, planReminders, reminderDays, reminderSentence } from '@/lib/reminders';

const today = '2026-10-28';
const at8 = { enabled: true, hour: 8, minute: 0 };
let nextId = 0;

/** Une tâche due dans `inDays` jours (négatif : en retard), telle que le service la renvoie. */
function task(inDays: number, extra: Partial<GardenTask> = {}): GardenTask {
  const nextDueDate = addDays(today, inDays);
  const daysLate = daysBetween(nextDueDate, today);
  return {
    id: `t${++nextId}`,
    kind: 'Pruning',
    title: null,
    recurrence: 'EveryNDays',
    intervalDays: 3,
    startDate: nextDueDate,
    createdAt: '2026-01-01T12:00:00.000Z',
    postponedUntil: null,
    spaceId: 'potager',
    spaceName: 'Potager',
    spaceKind: 'VegetableGarden',
    zoneId: null,
    zoneName: null,
    itemId: null,
    itemName: null,
    itemKind: null,
    lastDoneOn: null,
    nextDueDate,
    status: daysLate > 0 ? 'Overdue' : daysLate === 0 ? 'DueSoon' : 'Ok',
    daysOverdue: Math.max(0, daysLate),
    isCompleted: false,
    ...extra,
  };
}

const verger = { spaceId: 'verger', spaceName: 'Verger', spaceKind: 'Orchard' } as const;

describe('reminderSentence', () => {
  it("dit combien de choses attendent et nomme les premières, l'arrosage d'abord", () => {
    const tasks = [task(0), task(0, { kind: 'Watering' }), task(0, { ...verger, title: 'Tailler les pommiers' })];

    expect(reminderSentence(tasks, today)).toBe(
      "3 choses au jardin aujourd'hui : arroser (Potager), tailler (Potager), tailler les pommiers.",
    );
  });

  it('mentionne le retard, les plus anciens en tête', () => {
    const tasks = [task(0, { kind: 'Harvest', itemName: 'Framboisiers' }), task(-1, { kind: 'Watering' }), task(-4)];

    expect(reminderSentence(tasks, today)).toBe(
      "3 choses au jardin aujourd'hui, dont 2 en retard : tailler (Potager), arroser (Potager), récolter (Framboisiers).",
    );
  });

  it("ne parle que du retard quand rien d'autre n'attend", () => {
    expect(reminderSentence([task(-2, { kind: 'Watering' })], today)).toBe('1 chose en retard au jardin : arroser (Potager).');
  });

  it('nomme trois tâches au plus, puis des points de suspension', () => {
    const tasks = [task(0), task(0), task(0), task(0)];

    expect(reminderSentence(tasks, today)).toBe(
      "4 choses au jardin aujourd'hui : tailler (Potager), tailler (Potager), tailler (Potager)…",
    );
  });

  it("rend null quand rien n'attend ce jour-là", () => {
    expect(reminderSentence([], today)).toBeNull();
    expect(reminderSentence([task(1), task(5)], today)).toBeNull();
  });

  it('compte en retard, un jour à venir, ce qui tombe avant sans être fait', () => {
    expect(reminderSentence([task(1), task(3)], addDays(today, 3))).toBe(
      "2 choses au jardin aujourd'hui, dont 1 en retard : tailler (Potager), tailler (Potager).",
    );
  });
});

describe('planReminders', () => {
  const morning = new Date(2026, 9, 28, 7, 30);

  it("programme les jours où quelque chose attend, à l'heure choisie", () => {
    const reminders = planReminders([task(2), task(5)], morning, { enabled: true, hour: 18, minute: 30 });

    expect(reminders.map((reminder) => toDateOnly(reminder.date))).toEqual(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((days) => addDays(today, days)),
    );
    expect(reminders.every((reminder) => reminder.date.getHours() === 18 && reminder.date.getMinutes() === 30)).toBe(true);
    // Rien de fait d'ici là : la tâche du surlendemain reste en retard les jours suivants.
    expect(reminders[1].body).toBe("1 chose en retard au jardin : tailler (Potager).");
    expect(reminders[3].body).toBe("2 choses au jardin aujourd'hui, dont 1 en retard : tailler (Potager), tailler (Potager).");
  });

  it("ne programme rien quand rien n'attend sur les deux semaines", () => {
    expect(planReminders([], morning, at8)).toEqual([]);
    expect(planReminders([task(reminderDays)], morning, at8)).toEqual([]);
  });

  it("garde aujourd'hui tant que l'heure n'est pas passée", () => {
    expect(planReminders([task(0)], morning, at8)).toHaveLength(reminderDays);

    const afterEight = planReminders([task(0)], new Date(2026, 9, 28, 8, 0), at8);
    expect(afterEight).toHaveLength(reminderDays - 1);
    expect(toDateOnly(afterEight[0].date)).toBe(addDays(today, 1));
  });

  it("suit le report : la tâche reportée n'attend qu'à partir du jour du report", () => {
    // Le service a déjà repoussé l'échéance au jour du report.
    const postponed = task(3, { postponedUntil: addDays(today, 3) });

    const reminders = planReminders([postponed], morning, at8);
    expect(toDateOnly(reminders[0].date)).toBe(addDays(today, 3));
  });
});

describe('formatReminderTime', () => {
  it("écrit l'heure à la française", () => {
    expect(formatReminderTime({ hour: 8, minute: 0 })).toBe('8 h');
    expect(formatReminderTime({ hour: 18, minute: 5 })).toBe('18 h 05');
  });
});
