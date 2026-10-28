import type { GardenTask } from '@/api/types';
import { addDays, daysBetween } from '@/domain/dates';
import { bySpace, comingThisMonth, lateness, overdueTasks, rhythm, skyPhrase, tasksOn, weekDays } from '@/lib/today';

const today = '2026-10-28';
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
const serre = { spaceId: 'serre', spaceName: 'Serre', spaceKind: 'Greenhouse' } as const;

describe('weekDays', () => {
  it("compte sept jours depuis aujourd'hui, avec un point sous ceux qui ont quelque chose de prévu", () => {
    const days = weekDays([task(0), task(2), task(9)], today);

    expect(days.map((day) => day.date)).toEqual([0, 1, 2, 3, 4, 5, 6].map((n) => addDays(today, n)));
    expect(days.map((day) => day.planned)).toEqual([true, false, true, false, false, false, false]);
    expect(days.some((day) => day.overdue)).toBe(false);
  });

  it("marque le retard sur aujourd'hui seulement", () => {
    const days = weekDays([task(-3)], today);

    expect(days[0]).toEqual({ date: today, planned: true, overdue: true });
    expect(days.slice(1).every((day) => !day.planned && !day.overdue)).toBe(true);
  });
});

describe('overdueTasks et tasksOn', () => {
  it('range les retards à part, les plus en retard d\'abord', () => {
    const tasks = [task(-1), task(-5), task(0), task(2)];

    expect(overdueTasks(tasks).map((t) => t.daysOverdue)).toEqual([5, 1]);
    expect(tasksOn(tasks, today)).toEqual([tasks[2]]);
    expect(tasksOn(tasks, addDays(today, 2))).toEqual([tasks[3]]);
  });
});

describe('bySpace', () => {
  it("met l'espace le plus chargé d'abord, et l'arrosage d'abord dans un espace", () => {
    const pruning = task(0, verger);
    const watering = task(0, { ...verger, kind: 'Watering' });
    const treatment = task(0, { ...verger, kind: 'Treatment' });
    const potager = task(0);

    const groups = bySpace([potager, pruning, watering, treatment]);

    expect(groups.map((group) => group.spaceName)).toEqual(['Verger', 'Potager']);
    expect(groups[0]).toMatchObject({ spaceId: 'verger', spaceKind: 'Orchard' });
    expect(groups[0].tasks).toEqual([watering, pruning, treatment]);
  });

  it('départage les espaces aussi chargés par leur nom', () => {
    expect(bySpace([task(0, verger), task(0, serre), task(0)]).map((group) => group.spaceName)).toEqual([
      'Potager',
      'Serre',
      'Verger',
    ]);
  });
});

describe('comingThisMonth', () => {
  it('ne garde que les tâches annuelles ou ponctuelles à venir', () => {
    const yearly = task(20, { recurrence: 'Yearly', intervalDays: null });
    const once = task(3, { recurrence: 'Once', intervalDays: null });
    const tasks = [task(5), yearly, task(0, { recurrence: 'Once', intervalDays: null }), once, task(-2, { recurrence: 'Yearly' })];

    expect(comingThisMonth(tasks, today)).toEqual([yearly, once]);
  });
});

describe('skyPhrase', () => {
  it('dit combien de choses attendent, dont combien en retard', () => {
    expect(skyPhrase([task(-1), task(0), task(0), task(3)], today)).toBe('3 choses à faire au jardin, dont 1 en retard');
    expect(skyPhrase([task(0)], today)).toBe('1 chose à faire au jardin');
    expect(skyPhrase([task(-2), task(-1)], today)).toBe('2 choses en retard au jardin');
  });

  it('annonce demain quand tout est fait', () => {
    const watering = task(1, { ...serre, kind: 'Watering', title: 'Arroser la serre' });

    expect(skyPhrase([], today)).toBe("Tout est fait pour aujourd'hui.");
    expect(skyPhrase([task(1), watering, task(4)], today)).toBe(
      "Tout est fait pour aujourd'hui. Demain : tailler, Potager et 1 autre chose.",
    );
    expect(skyPhrase([watering], today)).toBe("Tout est fait pour aujourd'hui. Demain : arroser la serre, Serre.");
  });
});

describe('rhythm et lateness', () => {
  it('disent le rythme et le retard en clair', () => {
    expect(rhythm({ recurrence: 'EveryNDays', intervalDays: 3 })).toBe('tous les 3 jours');
    expect(rhythm({ recurrence: 'EveryNDays', intervalDays: 1 })).toBe('tous les jours');
    expect(rhythm({ recurrence: 'Yearly', intervalDays: null })).toBe('chaque année');
    expect(rhythm({ recurrence: 'Once', intervalDays: null })).toBe('une seule fois');
    expect(lateness(1)).toBe('en retard de 1 jour');
    expect(lateness(4)).toBe('en retard de 4 jours');
  });
});
