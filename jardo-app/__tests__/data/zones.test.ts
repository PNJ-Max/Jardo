import { createZoneService } from '@/data/zones';

import { createGardenFixtures, fixedClock } from '../../test/garden-data';
import { missing, refused } from '../../test/problems';

// Port de ZoneServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.

async function setup() {
  const fixtures = await createGardenFixtures();
  return { ...fixtures, service: createZoneService(fixtures.db, fixedClock('2026-06-15')) };
}

describe('ZoneService (port de ZoneServiceTests.cs)', () => {
  it('Deux espaces peuvent avoir une zone du même nom', async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const petitsFruits = await addSpace('Petits fruits', 'SmallFruit');
    await addZone(potager, 'Rang 1');

    const zone = await service.create(petitsFruits.id, { name: 'Rang 1' });

    expect(zone.spaceId).toBe(petitsFruits.id);
  });

  it("Deux zones d'un même espace ne peuvent pas porter le même nom", async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    await addZone(potager, 'Carré 1');

    await expect(service.create(potager.id, { name: 'Carré 1 ' })).rejects.toMatchObject(refused);
  });

  it("Renommer une zone avec le nom d'une voisine est refusé", async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    await addZone(potager, 'Carré 1');
    const carre2 = await addZone(potager, 'Carré 2');

    await expect(service.update(carre2.id, { name: 'Carré 1' })).rejects.toMatchObject(refused);
  });

  it("Un espace archivé n'accueille plus de nouvelle zone", async () => {
    const { service, addSpace } = await setup();
    const serre = await addSpace('Serre', 'VegetableGarden', true);

    await expect(service.create(serre.id, { name: 'Planche 1' })).rejects.toMatchObject(refused);
  });

  it('Créer une zone dans un espace inexistant lève NotFound', async () => {
    const { service } = await setup();

    await expect(service.create('inexistant', { name: 'Carré 1' })).rejects.toMatchObject(missing);
  });

  it('Supprimer une zone qui contient un élément est refusé', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    await addPlant(potager, carre, 'Radis', true);

    await expect(service.delete(carre.id)).rejects.toMatchObject(refused);
  });

  it('Le compteur de zone ne retient que les éléments actifs', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    await addPlant(potager, carre, 'Tomate');
    await addPlant(potager, carre, 'Radis', true);

    const [zone] = await service.getBySpace(potager.id);

    expect(zone.itemCount).toBe(1);
  });
});

describe('ZoneService (ajouts au port)', () => {
  it('Une zone se crée avec un nom nettoyé et se relit par son espace, triée par nom', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const zone = await service.create(potager.id, { name: ' Carré 2 ', description: ' au soleil ' });
    await service.create(potager.id, { name: 'Carré 1' });

    expect(zone).toMatchObject({ spaceId: potager.id, name: 'Carré 2', description: 'au soleil', itemCount: 0 });
    expect((await service.getBySpace(potager.id)).map((z) => z.name)).toEqual(['Carré 1', 'Carré 2']);
  });

  it('Renommer une zone sans changer son nom est accepté', async () => {
    const { service, addSpace, addZone } = await setup();
    const carre = await addZone(await addSpace('Potager'), 'Carré 1');

    const zone = await service.update(carre.id, { name: 'Carré 1', description: 'Nouvelle description' });

    expect(zone.description).toBe('Nouvelle description');
  });

  it('Une zone ou un espace inconnu est introuvable', async () => {
    const { service } = await setup();

    await expect(service.getById('inconnue')).rejects.toMatchObject(missing);
    await expect(service.getBySpace('inconnu')).rejects.toMatchObject(missing);
    await expect(service.update('inconnue', { name: 'Carré 1' })).rejects.toMatchObject(missing);
    await expect(service.delete('inconnue')).rejects.toMatchObject(missing);
  });

  it('Le refus de suppression détaille les éléments actifs et archivés', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    await addPlant(potager, carre, 'Tomate');
    await addPlant(potager, carre, 'Radis', true);

    await expect(service.delete(carre.id)).rejects.toThrow('1 élément(s) actif(s) et 1 archivé(s)');
  });

  it('Supprimer une zone vide la retire', async () => {
    const { service, addSpace, addZone, count } = await setup();
    const carre = await addZone(await addSpace('Potager'), 'Carré 1');

    await service.delete(carre.id);

    expect(await count('zones')).toBe(0);
  });

  it('Un nom vide est refusé avec une erreur sur le champ', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create(potager.id, { name: '  ' })).rejects.toMatchObject({
      status: 400,
      problem: { errors: { Name: expect.any(Array) } },
    });
  });
});
