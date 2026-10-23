import { createJournalService, type JournalEntryInput } from '@/data/journal';
import { addDays } from '@/domain/dates';
import { journalEntryKinds, type JournalEntryKind, type MeasureUnit } from '@/domain/types';
import { acceptsQuantity, isWoodKind } from '@/domain/kinds';

import { createGardenFixtures, fixedClock } from '../../test/garden-data';
import { missing, refused } from '../../test/problems';

// Port de JournalServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.

const today = '2026-06-15';

async function setup() {
  const fixtures = await createGardenFixtures();
  return { ...fixtures, service: createJournalService(fixtures.db, fixedClock(today)) };
}

const newEntry = (kind: JournalEntryKind, spaceId: string, zoneId: string | null = null, itemId: string | null = null): JournalEntryInput => ({
  date: today,
  kind,
  spaceId,
  zoneId,
  itemId,
});

describe('JournalService (port de JournalServiceTests.cs)', () => {
  it("Une zone d'un autre espace est refusée", async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const petitsFruits = await addSpace('Petits fruits', 'SmallFruit');
    const rang = await addZone(petitsFruits, 'Rang 1');

    await expect(service.create(newEntry('Watering', potager.id, rang.id))).rejects.toMatchObject(refused);
  });

  it("Un élément d'un autre espace est refusé", async () => {
    const { service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    const pommier = await addPlant(verger, null, 'Pommier');

    await expect(service.create(newEntry('Pruning', potager.id, null, pommier.id))).rejects.toMatchObject(refused);
  });

  it('Un élément hors de la zone donnée est refusé', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre1 = await addZone(potager, 'Carré 1');
    const carre2 = await addZone(potager, 'Carré 2');
    const tomate = await addPlant(potager, carre1, 'Tomate');

    await expect(service.create(newEntry('Watering', potager.id, carre2.id, tomate.id))).rejects.toMatchObject(refused);
  });

  it('Une entrée sur un élément prend sa zone', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 2');
    const carottes = await addPlant(potager, carre, 'Carottes');

    const entry = await service.create(newEntry('Sowing', potager.id, null, carottes.id));

    expect(entry.zoneId).toBe(carre.id);
    expect(entry.itemName).toBe('Carottes');
  });

  it('Chaque entrée porte le type de son élément', async () => {
    const { service, addSpace, addZone, addPlant, addWoodPile, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const tomate = await addPlant(potager, carre, 'Tomate');
    const bucher = await addSpace('Bûcher', 'Firewood');
    const chene = await addWoodPile(bucher, 'Chêne');
    await addEntry('Watering', addDays(today, -2), potager, null, tomate);
    await addEntry('Watering', addDays(today, -1), potager, carre);
    await addEntry('Observation', today, bucher, null, chene);

    const journal = await service.getAll();

    expect(journal.map((entry) => entry.itemKind)).toEqual(['WoodPile', null, 'Plant']);
  });

  it("Un élément archivé ne reçoit plus d'entrée mais ses entrées restent corrigeables", async () => {
    const { db, service, addSpace, addPlant } = await setup();
    const potager = await addSpace('Potager');
    const radis = await addPlant(potager, null, 'Radis');
    const entry = await service.create(newEntry('Watering', potager.id, null, radis.id));

    await db.run('UPDATE garden_items SET is_archived = 1 WHERE id = ?', [radis.id]);

    await expect(service.create(newEntry('Watering', potager.id, null, radis.id))).rejects.toMatchObject(refused);

    const corrected = await service.update(entry.id, { ...newEntry('Watering', potager.id, null, radis.id), note: 'Arrosage au pied.' });

    expect(corrected.note).toBe('Arrosage au pied.');
  });

  it("Un espace archivé ne reçoit plus d'entrée", async () => {
    const { service, addSpace } = await setup();
    const tunnel = await addSpace('Serre tunnel', 'Greenhouse', true);

    await expect(service.create(newEntry('Watering', tunnel.id))).rejects.toMatchObject(refused);
  });

  it.each([
    ['WoodSupply', 'VegetableGarden'],
    ['Watering', 'Firewood'],
    ['Harvest', 'Firewood'],
  ] as const)("Le type d'intervention doit convenir au type d'espace (%s, %s)", async (kind, spaceKind) => {
    const { service, addSpace } = await setup();
    const space = await addSpace('Espace', spaceKind);
    const entry = newEntry(kind, space.id);

    if (acceptsQuantity(kind)) {
      entry.quantity = 2;
      entry.quantityUnit = isWoodKind(kind) ? 'Steres' : 'Kilograms';
    }

    await expect(service.create(entry)).rejects.toThrow("n'accueille pas");
  });

  it('Une entrée datée dans le futur est refusée', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create({ ...newEntry('Watering', potager.id), date: addDays(today, 1) })).rejects.toMatchObject(refused);
  });

  it('Corriger une entrée vers une date future est refusé', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');
    const entry = await service.create(newEntry('Watering', potager.id));

    await expect(service.update(entry.id, { ...newEntry('Watering', potager.id), date: addDays(today, 3) })).rejects.toMatchObject(refused);
  });

  it.each<[JournalEntryKind, number | null, MeasureUnit | null, number | null, string | null]>([
    ['Watering', 2, 'Kilograms', null, null],
    ['Harvest', 2, null, null, null],
    ['Harvest', 2, 'Steres', null, null],
    ['Harvest', null, null, 40, null],
    ['Pruning', null, null, null, 'Chancre'],
    ['Observation', null, null, null, null],
  ])('Les champs doivent convenir au type (%s, quantité %s, unité %s, hauteur %s, problème %s)', async (kind, quantity, unit, heightCm, problem) => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(
      service.create({ ...newEntry(kind, potager.id), quantity, quantityUnit: unit, heightCm, problem }),
    ).rejects.toMatchObject(refused);
  });

  it('Le bois se note en stères', async () => {
    const { service, addSpace } = await setup();
    const bois = await addSpace('Bois de chauffage', 'Firewood');
    const entry = newEntry('WoodConsumption', bois.id);

    await expect(service.create(entry)).rejects.toMatchObject(refused);

    const created = await service.create({ ...entry, quantity: 0.5, quantityUnit: 'Steres' });

    expect(created.quantity).toBe(0.5);
  });

  it('Le journal du jardin va du plus récent au plus ancien', async () => {
    const { service, addSpace, addEntry } = await setup();
    const potager = await addSpace('Potager');
    await addEntry('Watering', addDays(today, -5), potager);
    await addEntry('Watering', addDays(today, -1), potager);
    await addEntry('Watering', addDays(today, -3), potager);

    const journal = await service.getAll();

    expect(journal.map((entry) => entry.date)).toEqual([addDays(today, -1), addDays(today, -3), addDays(today, -5)]);
  });

  it('Le journal se filtre par type et par espace', async () => {
    const { service, addSpace, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const verger = await addSpace('Verger', 'Orchard');
    await addEntry('Watering', today, potager);
    await addEntry('Harvest', today, potager);
    await addEntry('Pruning', today, potager);
    await addEntry('Harvest', today, verger);

    const harvests = await service.getAll({ kinds: ['Harvest'] });
    const potagerCare = await service.getAll({ spaceId: potager.id, kinds: ['Watering', 'Pruning'] });

    expect(harvests).toHaveLength(2);
    expect(harvests.every((entry) => entry.kind === 'Harvest')).toBe(true);
    expect(potagerCare).toHaveLength(2);
    expect(potagerCare.every((entry) => entry.spaceId === potager.id)).toBe(true);
    expect(potagerCare.some((entry) => entry.kind === 'Harvest')).toBe(false);
  });

  it("Le journal d'un élément comprend ce qui est noté sur sa zone et son espace", async () => {
    const { service, addSpace, addZone, addPlant, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const carre1 = await addZone(potager, 'Carré 1');
    const carre2 = await addZone(potager, 'Carré 2');
    const tomate = await addPlant(potager, carre1, 'Tomate');
    const basilic = await addPlant(potager, carre1, 'Basilic');
    const verger = await addSpace('Verger', 'Orchard');

    const own = await addEntry('Pruning', today, potager, null, tomate);
    const zone = await addEntry('Watering', today, potager, carre1);
    const space = await addEntry('Other', today, potager);
    await addEntry('Watering', today, potager, carre2);
    await addEntry('Harvest', today, potager, null, basilic);
    await addEntry('Watering', today, verger);

    const journal = await service.getAll({ itemId: tomate.id });

    expect(journal.map((entry) => entry.id).sort()).toEqual([own, zone, space].sort());
  });

  it("Le journal d'une zone comprend ses éléments et ce qui est noté sur son espace", async () => {
    const { service, addSpace, addZone, addPlant, addEntry } = await setup();
    const potager = await addSpace('Potager');
    const carre1 = await addZone(potager, 'Carré 1');
    const carre2 = await addZone(potager, 'Carré 2');
    const tomate = await addPlant(potager, carre1, 'Tomate');
    const rhubarbe = await addPlant(potager, null, 'Rhubarbe');

    const item = await addEntry('Harvest', today, potager, null, tomate);
    const zone = await addEntry('Watering', today, potager, carre1);
    const space = await addEntry('Watering', today, potager);
    await addEntry('Watering', today, potager, carre2);
    await addEntry('Watering', today, potager, null, rhubarbe);

    const journal = await service.getAll({ zoneId: carre1.id });

    expect(journal.map((entry) => entry.id).sort()).toEqual([item, zone, space].sort());
  });

  it('Le journal se lit pour une seule cible', async () => {
    const { service, addSpace, addZone } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');

    await expect(service.getAll({ spaceId: potager.id, zoneId: carre.id })).rejects.toMatchObject(refused);
  });

  it('Le journal d\'une cible inexistante lève NotFound', async () => {
    const { service } = await setup();

    await expect(service.getAll({ itemId: 'inconnu' })).rejects.toMatchObject(missing);
  });
});

describe('JournalService : règles que JournalServiceTests.cs ne couvrait pas', () => {
  it('Une entrée complète garde tous ses champs et son horodatage', async () => {
    const { service, addSpace, addZone, addPlant } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    const rang = await addZone(verger, 'Rang 1');
    const pommier = await addPlant(verger, rang, 'Pommier');

    const entry = await service.create({
      ...newEntry('Observation', verger.id, null, pommier.id),
      note: ' Feuilles tachées ',
      heightCm: 180,
      problem: 'Tavelure',
      treatment: '  ',
    });

    expect(entry).toEqual({
      id: expect.any(String),
      date: today,
      kind: 'Observation',
      note: 'Feuilles tachées',
      quantity: null,
      quantityUnit: null,
      heightCm: 180,
      problem: 'Tavelure',
      treatment: null,
      createdAt: new Date(2026, 5, 15, 12).toISOString(),
      spaceId: verger.id,
      spaceName: 'Verger',
      zoneId: rang.id,
      zoneName: 'Rang 1',
      itemId: pommier.id,
      itemName: 'Pommier',
      itemKind: 'Plant',
    });
  });

  it('Une quantité se note avec son unité et une unité avec sa quantité', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create({ ...newEntry('Harvest', potager.id), quantity: 2 })).rejects.toMatchObject(refused);
    await expect(service.create({ ...newEntry('Harvest', potager.id), quantityUnit: 'Kilograms' })).rejects.toMatchObject(refused);
  });

  it('Une autre intervention a besoin d\'une note', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create(newEntry('Other', potager.id))).rejects.toMatchObject(refused);
    expect((await service.create({ ...newEntry('Other', potager.id), note: 'Paillage' })).note).toBe('Paillage');
  });

  it('Une observation se contente d\'une hauteur, un traitement porte un problème', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await service.create({ ...newEntry('Observation', potager.id), heightCm: 12 });
    await service.create({ ...newEntry('Treatment', potager.id), problem: 'Mildiou', treatment: 'Bouillie bordelaise' });
  });

  it('Un jour qui n\'existe pas, un type inconnu et des champs trop longs sont refusés champ par champ', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const error = await service
      .create({
        ...newEntry('Watering', potager.id),
        date: '2026-02-30',
        kind: 'Jardiner' as JournalEntryKind,
        note: 'x'.repeat(1001),
        heightCm: 12.5,
      })
      .catch((e) => e);

    expect(error).toMatchObject({ status: 400 });
    expect(Object.keys(error.problem.errors).sort()).toEqual(['Date', 'HeightCm', 'Kind', 'Note']);
  });

  it('Tous les types du vocabulaire se notent dans un espace qui les accueille', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    const kinds = journalEntryKinds.filter((kind) => !isWoodKind(kind) && kind !== 'Observation' && kind !== 'Other' && kind !== 'Harvest');
    for (const kind of kinds) await service.create(newEntry(kind, potager.id));

    expect(await service.getAll({ spaceId: potager.id })).toHaveLength(kinds.length);
  });

  it('Une entrée se lit, se corrige vers une autre cible et se supprime', async () => {
    const { service, addSpace, addZone, count } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    const entry = await service.create(newEntry('Watering', potager.id));

    const moved = await service.update(entry.id, newEntry('Watering', potager.id, carre.id));
    expect(await service.getById(entry.id)).toEqual(moved);
    expect(moved).toMatchObject({ zoneId: carre.id, zoneName: 'Carré 1', createdAt: entry.createdAt });

    await service.delete(entry.id);
    expect(await count('journal_entries')).toBe(0);
  });

  it('Une entrée inconnue est introuvable', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.getById('inconnue')).rejects.toMatchObject(missing);
    await expect(service.update('inconnue', newEntry('Watering', potager.id))).rejects.toMatchObject(missing);
    await expect(service.delete('inconnue')).rejects.toMatchObject(missing);
  });

  it('Un espace ou une zone inconnus sont refusés comme cible de la saisie', async () => {
    const { service, addSpace } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create(newEntry('Watering', 'inconnu'))).rejects.toMatchObject(refused);
    await expect(service.create(newEntry('Watering', potager.id, 'inconnue'))).rejects.toMatchObject(refused);
    await expect(service.create(newEntry('Watering', potager.id, null, 'inconnu'))).rejects.toMatchObject(refused);
  });

  it("Un refus n'écrit rien", async () => {
    const { service, addSpace, count } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.create({ ...newEntry('Watering', potager.id), date: addDays(today, 1) })).rejects.toThrow();

    expect(await count('journal_entries')).toBe(0);
  });
});
