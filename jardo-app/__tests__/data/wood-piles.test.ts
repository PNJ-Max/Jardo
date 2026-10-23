import { createJournalService, type JournalEntryInput } from '@/data/journal';
import { createTaskService } from '@/data/tasks';
import { createWoodPileService, type WoodPileInput } from '@/data/wood-piles';
import { addDays } from '@/domain/dates';
import type { JournalEntryKind, SpaceKind } from '@/domain/types';

import { createGardenFixtures, fixedClock } from '../../test/garden-data';
import { missing, refused } from '../../test/problems';

// Port de WoodPileServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.
// « Un espace avec des tas ne peut pas cesser d'être un espace bois de chauffage » est déjà porté
// avec SpaceService (spaces.test.ts : « Un espace avec des tas de bois ne peut pas devenir un potager »).

const today = '2026-06-15';

async function setup() {
  const fixtures = await createGardenFixtures();
  const clock = fixedClock(today);
  const journal = createJournalService(fixtures.db, clock);

  const noteWood = (kind: JournalEntryKind, steres: number, space: { id: string }, pile: { id: string } | null = null) =>
    journal.create({
      date: today,
      kind,
      quantity: steres,
      quantityUnit: 'Steres',
      spaceId: space.id,
      itemId: pile?.id ?? null,
    });

  return { ...fixtures, journal, noteWood, service: createWoodPileService(fixtures.db, clock) };
}

const newPile = (spaceId: string, initialSteres = 8): WoodPileInput => ({
  name: 'Chêne du fond',
  woodSpecies: 'Chêne',
  initialSteres,
  logLengthCm: 50,
  cutDate: '2025-01-15',
  dryingMonths: 24,
  spaceId,
});

describe('WoodPileService (port de WoodPileServiceTests.cs)', () => {
  it.each<SpaceKind>(['VegetableGarden', 'Orchard', 'SmallFruit', 'Greenhouse'])(
    "Un tas de bois est refusé hors d'un espace bois de chauffage (%s)",
    async (kind) => {
      const { service, addSpace } = await setup();
      const space = await addSpace('Ailleurs', kind);

      await expect(service.create(newPile(space.id))).rejects.toMatchObject(refused);
    },
  );

  it("Déplacer un tas vers un espace hors bois de chauffage est refusé", async () => {
    const { service, addSpace, addWoodPile } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const potager = await addSpace('Potager');
    const pile = await addWoodPile(bois, 'Chêne');

    await expect(service.update(pile.id, newPile(potager.id))).rejects.toMatchObject(refused);
  });

  it('Le stock ne compte que les entrées qui visent le tas', async () => {
    const { service, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const chene = await addWoodPile(bois, 'Chêne', { initialSteres: 8 });
    const hetre = await addWoodPile(bois, 'Hêtre', { initialSteres: 6 });

    await noteWood('WoodSupply', 2, bois, chene);
    await noteWood('WoodConsumption', 3.5, bois, chene);
    await noteWood('WoodConsumption', 1, bois, hetre);
    await noteWood('WoodConsumption', 4, bois);

    expect((await service.getById(chene.id)).remainingSteres).toBe(6.5);
    expect((await service.getById(hetre.id)).remainingSteres).toBe(5);
  });

  it('La lecture donne le séchage du jour', async () => {
    const { service, addSpace, addWoodPile } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    await addWoodPile(bois, 'Sec', { cutDate: '2025-06-15', dryingMonths: 12 });
    await addWoodPile(bois, 'Humide', { cutDate: '2025-06-16', dryingMonths: 12 });

    const piles = Object.fromEntries((await service.getAll({ spaceId: bois.id })).map((pile) => [pile.name, pile]));

    expect(piles.Sec).toMatchObject({ dryingStatus: 'Ready', readyOn: '2026-06-15' });
    expect(piles.Humide).toMatchObject({ dryingStatus: 'Drying', readyOn: '2026-06-16' });
  });

  it('Une consommation au-delà du stock est refusée mais tout le stock peut partir', async () => {
    const { service, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 5 });
    await noteWood('WoodConsumption', 3, bois, pile);

    await expect(noteWood('WoodConsumption', 2.01, bois, pile)).rejects.toMatchObject(refused);

    await noteWood('WoodConsumption', 2, bois, pile);

    expect((await service.getById(pile.id)).remainingSteres).toBe(0);
  });

  it('Un apport relève le stock que la consommation peut ensuite entamer', async () => {
    const { service, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 1 });

    await noteWood('WoodSupply', 3, bois, pile);
    await noteWood('WoodConsumption', 4, bois, pile);

    expect((await service.getById(pile.id)).remainingSteres).toBe(0);
  });

  it('Corriger une consommation la compare au stock sans elle-même', async () => {
    const { service, journal, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 5 });
    const entry = await noteWood('WoodConsumption', 4, bois, pile);

    const correction = (steres: number): JournalEntryInput => ({
      date: today,
      kind: 'WoodConsumption',
      quantity: steres,
      quantityUnit: 'Steres',
      spaceId: bois.id,
      itemId: pile.id,
    });

    await expect(journal.update(entry.id, correction(5.5))).rejects.toMatchObject(refused);

    await journal.update(entry.id, correction(5));

    expect((await service.getById(pile.id)).remainingSteres).toBe(0);
  });

  it('Reporter une consommation sur un tas trop juste est refusé', async () => {
    const { journal, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const grand = await addWoodPile(bois, 'Grand', { initialSteres: 10 });
    const petit = await addWoodPile(bois, 'Petit', { initialSteres: 1 });
    const entry = await noteWood('WoodConsumption', 4, bois, grand);

    await expect(
      journal.update(entry.id, {
        date: today,
        kind: 'WoodConsumption',
        quantity: 4,
        quantityUnit: 'Steres',
        spaceId: bois.id,
        itemId: petit.id,
      }),
    ).rejects.toMatchObject(refused);
  });

  it('Supprimer un apport déjà consommé est refusé', async () => {
    const { journal, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 1 });
    const supply = await noteWood('WoodSupply', 3, bois, pile);
    await noteWood('WoodConsumption', 3, bois, pile);

    await expect(journal.delete(supply.id)).rejects.toMatchObject(refused);
  });

  it('Baisser le volume initial sous ce qui a été consommé est refusé', async () => {
    const { service, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 8 });
    await noteWood('WoodConsumption', 5, bois, pile);

    await expect(service.update(pile.id, newPile(bois.id, 4.99))).rejects.toMatchObject(refused);

    const updated = await service.update(pile.id, newPile(bois.id, 5));

    expect(updated.remainingSteres).toBe(0);
  });

  it('Le journal et les tâches existants fonctionnent sur un tas', async () => {
    const { db, addSpace, addWoodPile } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne');
    const taskService = createTaskService(db, fixedClock(today));

    const task = await taskService.create({
      kind: 'Other',
      title: 'Rentrer le bois',
      recurrence: 'Once',
      startDate: addDays(today, 3),
      spaceId: bois.id,
      itemId: pile.id,
    });

    const done = (await taskService.complete(task.id)).task;

    expect(done.status).toBe('Ok');
    expect(done.nextDueDate).toBeNull();
  });
});

describe('WoodPileService : règles que WoodPileServiceTests.cs ne couvrait pas', () => {
  it('Un tas se crée dans un espace bois de chauffage avec son stock et son séchage', async () => {
    const { service, addSpace, addZone } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const abri = await addZone(bois, 'Abri');

    const pile = await service.create({ ...newPile(bois.id), name: ' Chêne du fond ', woodSpecies: '  ', zoneId: abri.id });

    expect(pile).toEqual({
      id: expect.any(String),
      name: 'Chêne du fond',
      woodSpecies: null,
      initialSteres: 8,
      logLengthCm: 50,
      cutDate: '2025-01-15',
      dryingMonths: 24,
      isArchived: false,
      createdAt: new Date(2026, 5, 15, 12).toISOString(),
      spaceId: bois.id,
      spaceName: 'Bois de chauffage',
      zoneId: abri.id,
      zoneName: 'Abri',
      remainingSteres: 8,
      dryingStatus: 'Drying',
      readyOn: '2027-01-15',
    });
  });

  it("Un tas est refusé dans un espace archivé ou une zone d'un autre espace", async () => {
    const { service, addSpace, addZone } = await setup();
    const archive = await addSpace('Ancien bûcher', 'Firewood', true);
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const autre = await addSpace('Autre bûcher', 'Firewood');
    const abri = await addZone(autre, 'Abri');

    await expect(service.create(newPile(archive.id))).rejects.toMatchObject(refused);
    await expect(service.create({ ...newPile(bois.id), zoneId: abri.id })).rejects.toMatchObject(refused);
    await expect(service.create(newPile('inconnu'))).rejects.toMatchObject(refused);
  });

  it('Déplacer un tas déplace son journal et ses tâches', async () => {
    const { db, service, addSpace, addZone, addWoodPile, addEntry, addTask } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const autre = await addSpace('Autre bûcher', 'Firewood');
    const abri = await addZone(autre, 'Abri');
    const pile = await addWoodPile(bois, 'Chêne');
    await addEntry('Observation', addDays(today, -1), bois, null, pile);
    await addTask('Other', 'Once', today, bois, { item: pile, title: 'Rentrer le bois' });

    await service.update(pile.id, { ...newPile(autre.id), zoneId: abri.id });

    const placements = [
      ...(await db.all<{ space_id: string; zone_id: string | null }>('SELECT space_id, zone_id FROM journal_entries')),
      ...(await db.all<{ space_id: string; zone_id: string | null }>('SELECT space_id, zone_id FROM garden_tasks')),
    ];
    expect(placements).toEqual([
      { space_id: autre.id, zone_id: abri.id },
      { space_id: autre.id, zone_id: abri.id },
    ]);
  });

  it('Un tas archivé reste lisible sur demande et sort des tâches dues', async () => {
    const { db, service, addSpace, addWoodPile, addTask } = await setup();
    const tasks = createTaskService(db, fixedClock(today));
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne');
    await addTask('Other', 'Once', addDays(today, -1), bois, { item: pile, title: 'Rentrer le bois' });
    expect(await tasks.getDue('Today')).toHaveLength(1);

    expect(await service.setArchived(pile.id, true)).toMatchObject({ isArchived: true });
    expect(await service.getAll({ spaceId: bois.id })).toEqual([]);
    expect(await service.getAll({ spaceId: bois.id, includeArchived: true })).toHaveLength(1);
    expect(await tasks.getDue('Today')).toEqual([]);

    expect(await service.setArchived(pile.id, false)).toMatchObject({ isArchived: false });
    expect(await service.getAll({ spaceId: bois.id })).toHaveLength(1);
    expect(await tasks.getDue('Today')).toHaveLength(1);
  });

  it("Les tas d'un espace archivé n'apparaissent que sur demande, triés par espace, zone puis nom", async () => {
    const { service, addSpace, addZone, addWoodPile, db } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const archive = await addSpace('Ancien bûcher', 'Firewood', true);
    const abri = await addZone(bois, 'Abri');
    const hetre = await addWoodPile(bois, 'Hêtre');
    const chene = await addWoodPile(bois, 'Chêne');
    const orme = await addWoodPile(archive, 'Orme');
    await db.run('UPDATE garden_items SET zone_id = ? WHERE id = ?', [abri.id, chene.id]);

    expect((await service.getAll()).map((pile) => pile.id)).toEqual([hetre.id, chene.id]);
    expect((await service.getAll({ includeArchived: true })).map((pile) => pile.id)).toEqual([orme.id, hetre.id, chene.id]);
    expect((await service.getAll({ zoneId: abri.id })).map((pile) => pile.id)).toEqual([chene.id]);
  });

  it('Supprimer un tas emporte son journal et ses tâches', async () => {
    const { service, addSpace, addWoodPile, addEntry, addTask, count } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne');
    const other = await addWoodPile(bois, 'Hêtre');
    await addEntry('Observation', today, bois, null, pile);
    await addEntry('Observation', today, bois, null, other);
    await addTask('Other', 'Once', today, bois, { item: pile, title: 'Rentrer le bois' });

    await service.delete(pile.id);

    expect(await count('garden_items', "item_type = 'WoodPile'")).toBe(1);
    expect(await count('journal_entries')).toBe(1);
    expect(await count('garden_tasks')).toBe(0);
  });

  it('Un tas inconnu est introuvable', async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const plant = await addPlant(potager, null, 'Tomate');

    await expect(service.getById('inconnu')).rejects.toMatchObject(missing);
    await expect(service.getById(plant.id)).rejects.toMatchObject(missing);
    await expect(service.update('inconnu', newPile(potager.id))).rejects.toMatchObject(missing);
    await expect(service.setArchived('inconnu', true)).rejects.toMatchObject(missing);
    await expect(service.delete('inconnu')).rejects.toMatchObject(missing);
  });

  it('Les champs invalides sont refusés champ par champ', async () => {
    const { service, addSpace } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');

    const error = await service
      .create({
        name: ' ',
        woodSpecies: 'x'.repeat(101),
        initialSteres: 0,
        logLengthCm: 5,
        cutDate: '2025-02-30',
        dryingMonths: 61,
        spaceId: bois.id,
      })
      .catch((e) => e);

    expect(error).toMatchObject({ status: 400 });
    expect(Object.keys(error.problem.errors).sort()).toEqual([
      'CutDate',
      'DryingMonths',
      'InitialSteres',
      'LogLengthCm',
      'Name',
      'WoodSpecies',
    ]);
  });

  it('Deux consommations simultanées ne font jamais passer le stock sous zéro', async () => {
    const { service, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 5 });

    const results = await Promise.allSettled([noteWood('WoodConsumption', 3, bois, pile), noteWood('WoodConsumption', 3, bois, pile)]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await service.getById(pile.id)).remainingSteres).toBe(2);
  });

  it('Le stock arrondit au centième : pas de reste fantôme après des décimales', async () => {
    const { service, addSpace, addWoodPile, noteWood } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const pile = await addWoodPile(bois, 'Chêne', { initialSteres: 0.3 });

    await noteWood('WoodConsumption', 0.1, bois, pile);
    await noteWood('WoodConsumption', 0.2, bois, pile);

    expect((await service.getById(pile.id)).remainingSteres).toBe(0);
  });
});
