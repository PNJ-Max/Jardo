import { createJournalService } from '@/data/journal';
import { createTaskService, type TaskInput } from '@/data/tasks';
import { addDays } from '@/domain/dates';
import type { JournalEntryKind, TaskRecurrence } from '@/domain/types';

import { createGardenFixtures, fixedClock, type GardenFixtures } from '../../test/garden-data';
import { missing, refused } from '../../test/problems';

// Port de TaskServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.

const today = '2026-06-15';
const seasonStart = '2026-04-01';

async function setup() {
  const fixtures = await createGardenFixtures();
  const clock = fixedClock(today);
  const service = createTaskService(fixtures.db, clock);

  const addWatering = (
    space: Parameters<GardenFixtures['addTask']>[3],
    zone: { id: string } | null = null,
    item: { id: string; zoneId: string | null } | null = null,
    everyDays = 2,
  ) => fixtures.addTask('Watering', 'EveryNDays', seasonStart, space, { zone, item, intervalDays: everyDays });

  const nextDueDate = async (taskId: string) => (await service.getById(taskId)).nextDueDate;

  return { ...fixtures, service, journal: createJournalService(fixtures.db, clock), addWatering, nextDueDate };
}

const newTask = (kind: JournalEntryKind, recurrence: TaskRecurrence, spaceId: string, extra: Partial<TaskInput> = {}): TaskInput => ({
  kind,
  recurrence,
  startDate: today,
  spaceId,
  ...extra,
});

describe('TaskService (port de TaskServiceTests.cs)', () => {
  it("Une tâche d'un élément compte les interventions sur sa zone et son espace", async () => {
    const { addSpace, addZone, addPlant, addWatering, addEntry, nextDueDate } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const tomate = await addPlant(potager, carre, 'Tomate');
    const task = await addWatering(potager, null, tomate);

    await addEntry('Watering', addDays(today, -6), potager, null, tomate);
    expect(await nextDueDate(task)).toBe(addDays(today, -4));

    await addEntry('Watering', addDays(today, -3), potager, carre);
    expect(await nextDueDate(task)).toBe(addDays(today, -1));

    await addEntry('Watering', addDays(today, -1), potager);
    await addEntry('Observation', today, potager, null, tomate);
    expect(await nextDueDate(task)).toBe(addDays(today, 1));
  });

  it("Une tâche de zone compte l'espace mais pas les éléments ni les autres zones", async () => {
    const { addSpace, addZone, addPlant, addWatering, addEntry, nextDueDate } = await setup();
    const potager = await addSpace('Potager');
    const carre1 = await addZone(potager, 'Carré 1');
    const carre2 = await addZone(potager, 'Carré 2');
    const tomate = await addPlant(potager, carre1, 'Tomate');
    const task = await addWatering(potager, carre1);

    await addEntry('Watering', addDays(today, -5), potager);
    await addEntry('Watering', today, potager, null, tomate);
    await addEntry('Watering', today, potager, carre2);

    expect(await nextDueDate(task)).toBe(addDays(today, -3));
  });

  it("Une tâche d'espace ne compte que les interventions sur tout l'espace", async () => {
    const { addSpace, addZone, addPlant, addTask, addEntry, nextDueDate } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    const rang = await addZone(verger, 'Rang 1');
    const pommier = await addPlant(verger, null, 'Pommier');
    const task = await addTask('Pruning', 'Yearly', '2026-02-01', verger);

    await addEntry('Pruning', '2026-02-03', verger, rang);
    await addEntry('Pruning', '2026-02-03', verger, null, pommier);

    expect(await nextDueDate(task)).toBe('2026-02-01');

    await addEntry('Pruning', '2026-01-25', verger);

    expect(await nextDueDate(task)).toBe('2027-02-01');
  });

  it("Les tâches dues sont triées des plus en retard aux échéances du jour", async () => {
    const { service, addSpace, addPlant, addWatering, addTask, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    const tomate = await addPlant(potager, null, 'Tomate');
    const carotte = await addPlant(potager, null, 'Carotte');
    const basilic = await addPlant(potager, null, 'Basilic');

    const dueToday = await addWatering(potager, null, tomate);
    const lateByTwo = await addWatering(potager, null, carotte);
    const upToDate = await addWatering(potager, null, basilic);
    const neverPruned = await addTask('Pruning', 'Yearly', '2026-02-01', verger);
    const treatment = await addTask('Treatment', 'Once', addDays(today, -1), verger);

    await addEntry('Watering', addDays(today, -2), potager, null, tomate);
    await addEntry('Watering', addDays(today, -4), potager, null, carotte);
    await addEntry('Watering', today, potager, null, basilic);

    const due = await service.getDue('Today');

    expect(due.map((task) => task.id)).toEqual([neverPruned, lateByTwo, treatment, dueToday]);
    expect(due.map((task) => task.status)).toEqual(['Overdue', 'Overdue', 'Overdue', 'DueSoon']);
    expect(due.some((task) => task.id === upToDate)).toBe(false);
  });

  it("L'horizon de la semaine ajoute les six prochains jours", async () => {
    const { service, addSpace, addTask } = await setup();
    const potager = await addSpace('Potager');
    const late = await addTask('Sowing', 'Once', addDays(today, -1), potager);
    const inSixDays = await addTask('Sowing', 'Once', addDays(today, 6), potager);
    await addTask('Sowing', 'Once', addDays(today, 7), potager);

    expect((await service.getDue('Today')).map((task) => task.id)).toEqual([late]);
    expect((await service.getDue('Week')).map((task) => task.id)).toEqual([late, inSixDays]);
  });

  it('Les tâches faites ou archivées ne sont jamais dues', async () => {
    const { service, addSpace, addPlant, addWatering, addTask, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const tunnel = await addSpace('Serre tunnel', 'Greenhouse', true);
    const radis = await addPlant(potager, null, 'Radis', true);
    await addWatering(potager, null, radis);
    await addWatering(tunnel);
    await addTask('Sowing', 'Once', addDays(today, -3), potager);
    await addEntry('Sowing', addDays(today, -2), potager);

    expect(await service.getDue('Week')).toEqual([]);
  });

  it('Fait note l\'intervention aujourd\'hui sur la cible et renvoie la tâche recalculée', async () => {
    const { db, service, addSpace, addZone, addPlant, addTask } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const tomate = await addPlant(potager, carre, 'Tomate');
    const task = await addTask('Watering', 'EveryNDays', seasonStart, potager, {
      item: tomate,
      intervalDays: 2,
      title: 'Arroser au pied',
    });

    const done = (await service.complete(task)).task;

    expect(done).toMatchObject({ status: 'Ok', lastDoneOn: today, nextDueDate: addDays(today, 2) });

    const [entry, ...others] = await db.all<{
      date: string;
      kind: string;
      space_id: string;
      zone_id: string | null;
      item_id: string | null;
      note: string | null;
    }>('SELECT date, kind, space_id, zone_id, item_id, note FROM journal_entries');
    expect(others).toEqual([]);
    expect(entry).toEqual({
      date: today,
      kind: 'Watering',
      space_id: potager.id,
      zone_id: carre.id,
      item_id: tomate.id,
      note: 'Arroser au pied',
    });
  });

  it('Supprimer l\'entrée renvoyée par Fait annule le Fait', async () => {
    const { db, service, journal, addSpace, addPlant, addWatering } = await setup();
    const potager = await addSpace('Potager');
    const tomate = await addPlant(potager, null, 'Tomate');
    const task = await addWatering(potager, null, tomate);
    const dueBefore = await service.getById(task);

    const completion = await service.complete(task);

    const entries = await db.all<{ id: string }>('SELECT id FROM journal_entries');
    expect(entries).toEqual([{ id: completion.entry.id }]);
    expect(completion.entry.itemKind).toBe('Plant');

    await journal.delete(completion.entry.id);

    const undone = await service.getById(task);
    expect([undone.status, undone.nextDueDate]).toEqual([dueBefore.status, dueBefore.nextDueDate]);
  });

  it('Chaque tâche porte le type de son élément', async () => {
    const { service, addSpace, addPlant, addWoodPile, addWatering, addTask } = await setup();
    const potager = await addSpace('Potager');
    const tomate = await addPlant(potager, null, 'Tomate');
    const bucher = await addSpace('Bûcher', 'Firewood');
    const chene = await addWoodPile(bucher, 'Chêne');
    const plantTask = await addWatering(potager, null, tomate);
    const pileTask = await addTask('Other', 'Once', today, bucher, { item: chene, title: 'Rentrer le bois' });
    const spaceTask = await addWatering(potager);

    expect((await service.getById(plantTask)).itemKind).toBe('Plant');
    expect((await service.getById(pileTask)).itemKind).toBe('WoodPile');
    expect((await service.getById(spaceTask)).itemKind).toBeNull();
  });

  it('Fait à une date passée recalcule depuis cette date', async () => {
    const { db, service, addSpace, addWatering } = await setup();
    const potager = await addSpace('Potager');
    const task = await addWatering(potager, null, null, 3);

    const done = (await service.complete(task, { date: addDays(today, -4), note: 'Oublié de le noter' })).task;

    expect(done).toMatchObject({ status: 'Overdue', daysOverdue: 1 });
    expect((await db.all<{ note: string }>('SELECT note FROM journal_entries')).map((row) => row.note)).toEqual(['Oublié de le noter']);
  });

  it('Fait dans le futur est refusé sans rien noter', async () => {
    const { service, addSpace, addWatering, count } = await setup();
    const potager = await addSpace('Potager');
    const task = await addWatering(potager);

    await expect(service.complete(task, { date: addDays(today, 1) })).rejects.toMatchObject(refused);

    expect(await count('journal_entries')).toBe(0);
  });

  it('Une tâche ponctuelle faite en avance est close mais pas par une intervention antérieure', async () => {
    const { service, addSpace, addTask, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const createdThisMorning = new Date(2026, 5, 15, 8).toISOString();
    const task = await addTask('Treatment', 'Once', addDays(today, 4), potager, { createdAt: createdThisMorning });
    await addEntry('Treatment', addDays(today, -1), potager);

    expect((await service.getDue('Week')).map((due) => due.id)).toEqual([task]);

    const done = (await service.complete(task)).task;

    expect(done.isCompleted).toBe(true);
    expect(done.startDate).toBe(addDays(today, 4));
    expect(await service.getDue('Week')).toEqual([]);
  });

  it("Une tâche sur un élément prend sa zone d'office", async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const tomate = await addPlant(potager, carre, 'Tomate');

    const task = await service.create(newTask('Watering', 'EveryNDays', potager.id, { intervalDays: 2, itemId: tomate.id }));

    expect(task.zoneId).toBe(carre.id);
    expect(task.status).toBe('DueSoon');
  });

  it.each<[TaskRecurrence, number | null, JournalEntryKind, string | null]>([
    ['EveryNDays', null, 'Watering', 'Arroser'],
    ['Yearly', 7, 'Pruning', 'Tailler'],
    ['Once', null, 'Other', null],
    ['Once', null, 'WoodSupply', 'Rentrer du bois'],
  ])('Une tâche incohérente est refusée (%s, %s jours, %s, titre %s)', async (recurrence, intervalDays, kind, title) => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create(newTask(kind, recurrence, potager.id, { intervalDays, title }))).rejects.toMatchObject(refused);
  });
});

describe('TaskService : règles que TaskServiceTests.cs ne couvrait pas', () => {
  it('Une tâche créée se lit avec le nom de sa cible et son échéance', async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');

    const task = await service.create(
      newTask('Other', 'Yearly', potager.id, { title: ' Tailler la haie ', startDate: '2026-03-01', zoneId: carre.id }),
    );

    expect(task).toEqual({
      id: expect.any(String),
      kind: 'Other',
      title: 'Tailler la haie',
      recurrence: 'Yearly',
      intervalDays: null,
      startDate: '2026-03-01',
      createdAt: new Date(2026, 5, 15, 12).toISOString(),
      spaceId: potager.id,
      spaceName: 'Potager',
      zoneId: carre.id,
      zoneName: 'Carré 1',
      itemId: null,
      itemName: null,
      itemKind: null,
      lastDoneOn: null,
      nextDueDate: '2026-03-01',
      status: 'Overdue',
      daysOverdue: 106,
      isCompleted: false,
    });
    expect(await service.getById(task.id)).toEqual(task);
  });

  it('Les tâches du jardin vont des plus en retard à celles sans échéance', async () => {
    const { service, addSpace, addTask, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    const later = await addTask('Sowing', 'Once', addDays(today, 10), potager);
    const done = await addTask('Pruning', 'Once', addDays(today, -10), verger);
    const late = await addTask('Sowing', 'Once', addDays(today, -2), verger);
    const sameDayInPotager = await addTask('Sowing', 'Once', addDays(today, -2), potager);
    await addEntry('Pruning', addDays(today, -5), verger);

    const all = await service.getAll();

    expect(all.map((task) => task.id)).toEqual([sameDayInPotager, late, later, done]);
    expect(all.at(-1)).toMatchObject({ nextDueDate: null, isCompleted: true });
  });

  it("Les tâches d'une cible comprennent celles de ce qui la contient", async () => {
    const { service, addSpace, addZone, addPlant, addWatering } = await setup();
    const potager = await addSpace('Potager');
    const carre1 = await addZone(potager, 'Carré 1');
    const carre2 = await addZone(potager, 'Carré 2');
    const tomate = await addPlant(potager, carre1, 'Tomate');
    const basilic = await addPlant(potager, carre1, 'Basilic');
    const verger = await addSpace('Verger', 'Orchard');

    const own = await addWatering(potager, null, tomate);
    const zone = await addWatering(potager, carre1);
    const space = await addWatering(potager);
    await addWatering(potager, carre2);
    const basil = await addWatering(potager, null, basilic);
    await addWatering(verger);

    const ids = async (filter: Parameters<typeof service.getAll>[0]) => (await service.getAll(filter)).map((task) => task.id).sort();

    expect(await ids({ itemId: tomate.id })).toEqual([own, zone, space].sort());
    expect(await ids({ zoneId: carre1.id })).toEqual([own, zone, space, basil].sort());
    expect(await ids({ spaceId: potager.id })).toHaveLength(5);
  });

  it('Les tâches se lisent pour une seule cible, qui doit exister', async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');

    await expect(service.getAll({ spaceId: potager.id, zoneId: carre.id })).rejects.toMatchObject(refused);
    await expect(service.getAll({ spaceId: 'inconnu' })).rejects.toMatchObject(missing);
    await expect(service.getAll({ zoneId: 'inconnue' })).rejects.toMatchObject(missing);
    await expect(service.getAll({ itemId: 'inconnu' })).rejects.toMatchObject(missing);
  });

  it('Une tâche se modifie, cible et rythme compris, et se supprime sans toucher au journal', async () => {
    const { service, addSpace, addZone, addWatering, addEntry, count } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const task = await addWatering(potager);
    await addEntry('Watering', today, potager);

    const updated = await service.update(task, newTask('Pruning', 'Yearly', potager.id, { startDate: '2026-02-01', zoneId: carre.id }));

    expect(updated).toMatchObject({ id: task, kind: 'Pruning', recurrence: 'Yearly', intervalDays: null, zoneId: carre.id });

    await service.delete(task);

    expect(await count('garden_tasks')).toBe(0);
    expect(await count('journal_entries')).toBe(1);
  });

  it('Une tâche inconnue est introuvable', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.getById('inconnue')).rejects.toMatchObject(missing);
    await expect(service.update('inconnue', newTask('Watering', 'Once', potager.id))).rejects.toMatchObject(missing);
    await expect(service.delete('inconnue')).rejects.toMatchObject(missing);
    await expect(service.complete('inconnue')).rejects.toMatchObject(missing);
  });

  it("Une cible archivée ne reçoit plus de tâche, mais ses tâches restent modifiables", async () => {
    const { db, service, addSpace, addPlant, addWatering } = await setup();
    const potager = await addSpace('Potager');
    const radis = await addPlant(potager, null, 'Radis');
    const task = await addWatering(potager, null, radis);
    await db.run('UPDATE garden_items SET is_archived = 1 WHERE id = ?', [radis.id]);

    const input = newTask('Watering', 'EveryNDays', potager.id, { intervalDays: 3, itemId: radis.id });

    await expect(service.create(input)).rejects.toMatchObject(refused);
    expect(await service.update(task, input)).toMatchObject({ intervalDays: 3 });
    await expect(service.complete(task)).rejects.toMatchObject(refused);
  });

  it("Seule une tâche tous les N jours a un nombre de jours, et une tâche « autre » un titre", async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create(newTask('Watering', 'Once', potager.id, { intervalDays: 3 }))).rejects.toThrow('Seule une tâche');
    await expect(service.create(newTask('Watering', 'EveryNDays', potager.id))).rejects.toThrow('besoin de son nombre de jours');
    await expect(service.create(newTask('Other', 'Once', potager.id, { title: '  ' }))).rejects.toThrow("besoin d'un titre");
  });

  it('Les champs invalides sont refusés champ par champ', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const error = await service
      .create({
        kind: 'Jardiner' as JournalEntryKind,
        recurrence: 'Souvent' as TaskRecurrence,
        intervalDays: 400,
        startDate: '2026-13-01',
        title: 'x'.repeat(101),
        spaceId: potager.id,
      })
      .catch((e) => e);

    expect(error).toMatchObject({ status: 400 });
    expect(Object.keys(error.problem.errors).sort()).toEqual(['IntervalDays', 'Kind', 'Recurrence', 'StartDate', 'Title']);
  });

  it('Fait sans note reprend le titre, et une note le remplace', async () => {
    const { db, service, addSpace, addTask } = await setup();
    const potager = await addSpace('Potager');
    const task = await addTask('Other', 'Once', today, potager, { title: 'Rentrer les pots' });

    await service.complete(task);
    await service.complete(task, { note: ' Fait avec Léa ' });

    const notes = (await db.all<{ note: string }>('SELECT note FROM journal_entries ORDER BY rowid')).map((row) => row.note);
    expect(notes).toEqual(['Rentrer les pots', 'Fait avec Léa']);
  });

  it("Fait refusé par le journal n'écrit rien : une observation sans note", async () => {
    const { service, addSpace, addTask, count } = await setup();
    const potager = await addSpace('Potager');
    const task = await addTask('Observation', 'Once', today, potager);

    await expect(service.complete(task)).rejects.toMatchObject(refused);

    expect(await count('journal_entries')).toBe(0);
  });
});
