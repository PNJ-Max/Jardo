import { ProblemError } from '@/data/problem';
import { createSpaceService } from '@/data/spaces';

import { createGardenFixtures, fixedClock } from '../../test/garden-data';
import { missing, refused } from '../../test/problems';

// Port de SpaceServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.

async function setup() {
  const fixtures = await createGardenFixtures();
  return { ...fixtures, service: createSpaceService(fixtures.db, fixedClock('2026-06-15')) };
}

describe('SpaceService (port de SpaceServiceTests.cs)', () => {
  it('Deux espaces ne peuvent pas porter le même nom', async () => {
    const { service } = await setup();
    await service.create({ name: 'Potager', kind: 'VegetableGarden' });

    await expect(service.create({ name: ' Potager ', kind: 'Orchard' })).rejects.toMatchObject(refused);
  });

  it("Renommer un espace avec le nom d'un espace archivé est refusé", async () => {
    const { service, addSpace } = await setup();
    await addSpace('Serre', 'VegetableGarden', true);
    const potager = await addSpace('Potager');

    await expect(service.update(potager.id, { name: 'Serre', kind: 'VegetableGarden' })).rejects.toMatchObject(refused);
  });

  it('Un espace avec des plantes ne peut pas devenir bois de chauffage', async () => {
    const { service, addSpace, addPlant } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    await addPlant(verger, null, 'Vieux poirier', true);

    await expect(service.update(verger.id, { name: 'Verger', kind: 'Firewood' })).rejects.toMatchObject(refused);
  });

  it('Un espace dont le journal ne convient pas au nouveau type ne peut pas en changer', async () => {
    const { service, addSpace, addEntry } = await setup();
    const potager = await addSpace('Potager');
    await addEntry('Watering', '2026-06-01', potager);

    await expect(service.update(potager.id, { name: 'Potager', kind: 'Firewood' })).rejects.toMatchObject(refused);

    const updated = await service.update(potager.id, { name: 'Potager', kind: 'Greenhouse' });
    expect(updated.kind).toBe('Greenhouse');
  });

  it('Un espace vide peut changer de type', async () => {
    const { service, addSpace } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    const updated = await service.update(verger.id, { name: 'Bûcher', kind: 'Firewood' });

    expect(updated.kind).toBe('Firewood');
  });

  it('Le compteur d\'éléments ignore les éléments archivés', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    await addZone(potager, 'Carré 1');
    await addPlant(potager, null, 'Tomate');
    await addPlant(potager, null, 'Radis', true);

    const space = await service.getById(potager.id);

    expect(space.itemCount).toBe(1);
    expect(space.zoneCount).toBe(1);
  });

  it('La liste par défaut exclut les espaces archivés', async () => {
    const { service, addSpace } = await setup();
    await addSpace('Potager');
    await addSpace('Serre', 'VegetableGarden', true);

    const active = await service.getAll();
    const all = await service.getAll(true);

    expect(active.map((space) => space.name)).toEqual(['Potager']);
    expect(all).toHaveLength(2);
  });

  it('Supprimer un espace qui contient un élément archivé est refusé', async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    await addPlant(potager, null, 'Radis', true);

    await expect(service.delete(potager.id)).rejects.toMatchObject(refused);
  });

  it('Supprimer un espace vide emporte ses zones', async () => {
    const { service, addSpace, addZone, count } = await setup();
    const potager = await addSpace('Potager');
    await addZone(potager, 'Carré 1');

    await service.delete(potager.id);

    expect(await count('zones')).toBe(0);
  });

  it('Un espace compte ses tâches dues hors éléments archivés', async () => {
    const { service, addSpace, addPlant, addTask } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    const tomate = await addPlant(potager, null, 'Tomate');
    const radis = await addPlant(potager, null, 'Radis', true);
    const dueToday = '2026-06-15';
    const tomorrow = '2026-06-16';
    await addTask('Watering', 'Once', dueToday, potager, { item: tomate });
    await addTask('Watering', 'Once', dueToday, potager, { item: radis });
    await addTask('Pruning', 'Once', dueToday, potager);
    await addTask('Pruning', 'Once', tomorrow, verger);

    const spaces = await service.getAll();

    expect(spaces.map((space) => space.dueTaskCount)).toEqual([2, 0]);
  });

  it('Un espace dont les tâches ne conviennent pas au nouveau type ne peut pas en changer', async () => {
    const { service, addSpace, addTask } = await setup();
    const potager = await addSpace('Potager');
    await addTask('Watering', 'EveryNDays', '2026-06-01', potager, { intervalDays: 2 });

    await expect(service.update(potager.id, { name: 'Potager', kind: 'Firewood' })).rejects.toMatchObject(refused);
  });
});

describe('SpaceService (ajouts au port)', () => {
  it('Un espace neuf a des compteurs à zéro et une description sans blancs', async () => {
    const { service } = await setup();

    const space = await service.create({ name: ' Potager ', description: '  ', kind: 'VegetableGarden' });

    expect(space).toMatchObject({
      name: 'Potager',
      description: null,
      isArchived: false,
      zoneCount: 0,
      itemCount: 0,
      dueTaskCount: 0,
    });
    expect(space.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('Les espaces sont triés par nom', async () => {
    const { service, addSpace } = await setup();
    await addSpace('Verger', 'Orchard');
    await addSpace('Potager');

    expect((await service.getAll()).map((space) => space.name)).toEqual(['Potager', 'Verger']);
  });

  it('Un espace inconnu est introuvable', async () => {
    const { service } = await setup();

    await expect(service.getById('inconnu')).rejects.toMatchObject(missing);
    await expect(service.update('inconnu', { name: 'Potager', kind: 'VegetableGarden' })).rejects.toMatchObject(missing);
    await expect(service.setArchived('inconnu', true)).rejects.toMatchObject(missing);
    await expect(service.delete('inconnu')).rejects.toMatchObject(missing);
  });

  it('Un espace avec des tas de bois ne peut pas devenir un potager', async () => {
    const { service, addSpace, addWoodPile } = await setup();
    const bois = await addSpace('Bois', 'Firewood');
    await addWoodPile(bois, 'Chêne', { isArchived: true });

    await expect(service.update(bois.id, { name: 'Bois', kind: 'VegetableGarden' })).rejects.toMatchObject(refused);
  });

  it('Archiver puis réactiver un espace conserve son contenu', async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    await addPlant(potager, null, 'Tomate');

    expect(await service.setArchived(potager.id, true)).toMatchObject({ isArchived: true, itemCount: 1 });
    expect(await service.setArchived(potager.id, false)).toMatchObject({ isArchived: false, itemCount: 1 });
  });

  it('Un espace archivé ne compte aucune tâche due', async () => {
    const { service, addSpace, addTask } = await setup();
    const serre = await addSpace('Serre', 'Greenhouse', true);
    await addTask('Watering', 'Once', '2026-06-01', serre);

    expect((await service.getById(serre.id)).dueTaskCount).toBe(0);
  });

  it('Un refus ne laisse rien derrière lui', async () => {
    const { service, addSpace, addEntry, count } = await setup();
    const potager = await addSpace('Potager');
    await addEntry('Watering', '2026-06-01', potager);

    await expect(service.update(potager.id, { name: 'Renommé', kind: 'Firewood' })).rejects.toMatchObject(refused);

    expect((await service.getById(potager.id)).name).toBe('Potager');
    expect(await count('spaces')).toBe(1);
  });

  it('Les champs invalides sont rendus par champ, comme la validation de l\'API', async () => {
    const { service } = await setup();

    const error = await service
      .create({ name: ' ', description: 'x'.repeat(501), kind: 'Inconnu' as never })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemError);
    const problem = error as ProblemError;
    expect(problem.status).toBe(400);
    expect(['name', 'description', 'kind'].map((field) => problem.fieldError(field))).not.toContain(undefined);
  });

  it('Un nom de plus de 100 caractères est refusé', async () => {
    const { service } = await setup();

    await expect(service.create({ name: 'x'.repeat(101), kind: 'Orchard' })).rejects.toMatchObject({
      problem: { errors: { Name: expect.any(Array) } },
    });
  });
});
