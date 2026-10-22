import { createPlantService, type PlantInput } from '@/data/plants';
import type { QuantityUnit, SpaceKind } from '@/domain/types';

import { createGardenFixtures, fixedClock } from '../../test/garden-data';
import { missing, refused } from '../../test/problems';

// Port de PlantServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.

async function setup() {
  const fixtures = await createGardenFixtures();
  return { ...fixtures, service: createPlantService(fixtures.db, fixedClock('2026-06-15')) };
}

const newPlant = (spaceId: string, zoneId: string | null = null): PlantInput => ({
  name: 'Carottes',
  variety: 'Nantaise',
  quantity: 2,
  quantityUnit: 'Rows',
  spaceId,
  zoneId,
});

describe('PlantService (port de PlantServiceTests.cs)', () => {
  it('Une plante se crée dans une zone de son espace', async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 2');

    const plant = await service.create(newPlant(potager.id, carre.id));

    expect(plant.spaceName).toBe('Potager');
    expect(plant.zoneName).toBe('Carré 2');
  });

  it('Une plante peut se passer de zone', async () => {
    const { service, addSpace } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    const plant = await service.create(newPlant(verger.id));

    expect(plant.zoneId).toBeNull();
    expect(plant.zoneName).toBeNull();
  });

  it("Une plante est refusée dans une zone d'un autre espace", async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const petitsFruits = await addSpace('Petits fruits', 'SmallFruit');
    const rang = await addZone(petitsFruits, 'Rang 1');

    await expect(service.create(newPlant(potager.id, rang.id))).rejects.toMatchObject(refused);
  });

  it("Changer d'espace sans changer de zone est refusé", async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const verger = await addSpace('Verger', 'Orchard');
    const plant = await addPlant(potager, carre, 'Rhubarbe');

    await expect(service.update(plant.id, newPlant(verger.id, carre.id))).rejects.toMatchObject(refused);
  });

  it('Déplacer une plante déplace son journal et ses tâches', async () => {
    const { db, service, addSpace, addZone, addPlant, addEntry, addTask } = await setup();
    const serre = await addSpace('Serre', 'Greenhouse');
    const tablette = await addZone(serre, 'Tablette');
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const plant = await addPlant(serre, tablette, 'Tomates de semis');
    await addEntry('Sowing', '2026-03-15', serre, null, plant);
    const zoneEntry = await addEntry('Watering', '2026-06-14', serre, tablette);
    await addTask('Watering', 'EveryNDays', '2026-06-01', serre, { item: plant, intervalDays: 1 });

    await service.update(plant.id, newPlant(potager.id, carre.id));

    const entries = await db.all<{ id: string; item_id: string | null; space_id: string; zone_id: string | null }>(
      'SELECT id, item_id, space_id, zone_id FROM journal_entries',
    );
    const sowing = entries.filter((entry) => entry.item_id === plant.id);
    expect(sowing).toHaveLength(1);
    expect([sowing[0].space_id, sowing[0].zone_id]).toEqual([potager.id, carre.id]);
    expect(entries.find((entry) => entry.id === zoneEntry)!.zone_id).toBe(tablette.id);

    const tasks = await db.all<{ space_id: string; zone_id: string | null }>('SELECT space_id, zone_id FROM garden_tasks');
    expect(tasks).toHaveLength(1);
    expect([tasks[0].space_id, tasks[0].zone_id]).toEqual([potager.id, carre.id]);
  });

  it('Une plante est refusée dans un espace bois de chauffage', async () => {
    const { service, addSpace } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');

    await expect(service.create(newPlant(bois.id))).rejects.toMatchObject(refused);
  });

  it('Déplacer une plante vers un espace bois de chauffage est refusé', async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const plant = await addPlant(potager, null, 'Rhubarbe');

    await expect(service.update(plant.id, newPlant(bois.id))).rejects.toMatchObject(refused);
  });

  it.each<SpaceKind>(['VegetableGarden', 'Orchard', 'SmallFruit', 'Greenhouse'])(
    "Les autres types d'espace accueillent des plantes : %s",
    async (kind) => {
      const { service, addSpace } = await setup();
      const space = await addSpace('Espace', kind);

      const plant = await service.create(newPlant(space.id));

      expect(plant.spaceId).toBe(space.id);
    },
  );

  it("Un groupe d'arbres identiques est une seule plante", async () => {
    const { service, addSpace } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    const plant = await service.create({ ...newPlant(verger.id), name: 'Pommiers', quantity: 3, quantityUnit: 'Plants' });

    expect(plant.quantity).toBe(3);
  });

  it('Un nombre de pieds non entier est refusé', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create({ ...newPlant(potager.id), quantity: 2.5, quantityUnit: 'Plants' })).rejects.toMatchObject(
      refused,
    );
  });

  it.each<QuantityUnit>(['Rows', 'SquareMeters'])('Une quantité fractionnaire est acceptée en rangs ou en m² : %s', async (unit) => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const plant = await service.create({ ...newPlant(potager.id), quantity: 1.5, quantityUnit: unit });

    expect(plant.quantity).toBe(1.5);
  });

  it("Un espace archivé n'accueille plus de nouvelle plante", async () => {
    const { service, addSpace } = await setup();
    const serre = await addSpace('Serre', 'VegetableGarden', true);

    await expect(service.create(newPlant(serre.id))).rejects.toMatchObject(refused);
  });

  it("Une plante d'un espace archivé reste modifiable", async () => {
    const { service, addSpace, addPlant } = await setup();
    const serre = await addSpace('Serre', 'VegetableGarden', true);
    const plant = await addPlant(serre, null, 'Concombre');

    const updated = await service.update(plant.id, newPlant(serre.id));

    expect(updated.name).toBe('Carottes');
  });

  it('Un espace inexistant est une erreur de requête', async () => {
    const { service } = await setup();

    await expect(service.create(newPlant('inexistant'))).rejects.toMatchObject(refused);
  });

  it('La liste par défaut exclut les plantes des espaces archivés', async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const serre = await addSpace('Serre', 'VegetableGarden', true);
    await addPlant(potager, null, 'Tomate');
    await addPlant(serre, null, 'Concombre');

    const active = await service.getAll();
    const all = await service.getAll({ includeArchived: true });

    expect(active.map((plant) => plant.name)).toEqual(['Tomate']);
    expect(all).toHaveLength(2);
  });
});

describe('PlantService (ajouts au port)', () => {
  it('Une plante créée sans quantité vaut un pied, sans date ni variété superflues', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const plant = await service.create({ name: ' Tomate ', species: ' ', spaceId: potager.id });

    expect(plant).toMatchObject({
      name: 'Tomate',
      species: null,
      variety: null,
      quantity: 1,
      quantityUnit: 'Plants',
      sownDate: null,
      plantedDate: null,
      isArchived: false,
      zoneId: null,
    });
  });

  it('Les dates de semis et de plantation sont conservées', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const plant = await service.create({ ...newPlant(potager.id), sownDate: '2026-03-15', plantedDate: '2026-05-02' });

    expect([plant.sownDate, plant.plantedDate]).toEqual(['2026-03-15', '2026-05-02']);
  });

  it('La liste filtre par espace et par zone, triée par espace, zone puis nom', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    const carre = await addZone(potager, 'Carré 1');
    await addPlant(verger, null, 'Poirier');
    await addPlant(potager, carre, 'Radis');
    await addPlant(potager, null, 'Tomate');
    await addPlant(potager, null, 'Basilic');

    expect((await service.getAll()).map((plant) => plant.name)).toEqual(['Basilic', 'Tomate', 'Radis', 'Poirier']);
    expect((await service.getAll({ spaceId: verger.id })).map((plant) => plant.name)).toEqual(['Poirier']);
    expect((await service.getAll({ zoneId: carre.id })).map((plant) => plant.name)).toEqual(['Radis']);
  });

  it("Archiver une plante la sort de la liste par défaut, la réactiver l'y remet", async () => {
    const { service, addSpace, addPlant } = await setup();
    const plant = await addPlant(await addSpace('Potager'), null, 'Tomate');

    expect(await service.setArchived(plant.id, true)).toMatchObject({ isArchived: true });
    expect(await service.getAll()).toHaveLength(0);
    expect(await service.setArchived(plant.id, false)).toMatchObject({ isArchived: false });
    expect(await service.getAll()).toHaveLength(1);
  });

  it('Supprimer une plante emporte son journal et ses tâches', async () => {
    const { service, addSpace, addPlant, addEntry, addTask, count } = await setup();
    const potager = await addSpace('Potager');
    const plant = await addPlant(potager, null, 'Tomate');
    await addEntry('Watering', '2026-06-01', potager, null, plant);
    await addTask('Watering', 'EveryNDays', '2026-06-01', potager, { item: plant, intervalDays: 2 });

    await service.delete(plant.id);

    expect([await count('garden_items'), await count('journal_entries'), await count('garden_tasks')]).toEqual([0, 0, 0]);
  });

  it("Un tas de bois n'est pas une plante", async () => {
    const { service, addSpace, addWoodPile } = await setup();
    const pile = await addWoodPile(await addSpace('Bois', 'Firewood'), 'Chêne');

    await expect(service.getById(pile.id)).rejects.toMatchObject(missing);
    await expect(service.setArchived(pile.id, true)).rejects.toMatchObject(missing);
    await expect(service.delete(pile.id)).rejects.toMatchObject(missing);
    expect(await service.getAll({ includeArchived: true })).toHaveLength(0);
  });

  it('Une plante inconnue est introuvable', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.getById('inconnue')).rejects.toMatchObject(missing);
    await expect(service.update('inconnue', newPlant(potager.id))).rejects.toMatchObject(missing);
  });

  it('Déplacer une plante vers un espace archivé est refusé', async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const serre = await addSpace('Serre', 'VegetableGarden', true);
    const plant = await addPlant(potager, null, 'Tomate');

    await expect(service.update(plant.id, newPlant(serre.id))).rejects.toMatchObject(refused);
  });

  it('Une zone inexistante est refusée', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create(newPlant(potager.id, 'inexistante'))).rejects.toMatchObject(refused);
  });

  it('Les champs invalides sont rendus par champ, comme la validation de l\'API', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const error = await service
      .create({ ...newPlant(potager.id), name: '', quantity: 0, quantityUnit: 'Inconnue' as never, sownDate: '2026-02-30' })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 400,
      problem: {
        errors: {
          Name: expect.any(Array),
          Quantity: expect.any(Array),
          QuantityUnit: expect.any(Array),
          SownDate: expect.any(Array),
        },
      },
    });
  });

  it('Une quantité refusée ne déplace pas le journal', async () => {
    const { db, service, addSpace, addPlant, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    const plant = await addPlant(potager, null, 'Tomate');
    await addEntry('Watering', '2026-06-01', potager, null, plant);

    await expect(
      service.update(plant.id, { ...newPlant(verger.id), quantity: 2.5, quantityUnit: 'Plants' }),
    ).rejects.toMatchObject(refused);

    expect((await db.first<{ space_id: string }>('SELECT space_id FROM journal_entries'))!.space_id).toBe(potager.id);
  });
});
