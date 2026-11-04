import { countryHouse, terracedLong } from '@/data/garden-layouts';
import { createGardenMapService, type GardenMapInput, type GardenMapSlotInput } from '@/data/garden-map';
import { createSpaceService } from '@/data/spaces';

import { createGardenFixtures, fixedClock } from '../../test/garden-data';
import { refused } from '../../test/problems';

// Port de GardenMapServiceTests.cs, cas par cas, puis les règles du service que l'original ne couvrait pas.

const layout = terracedLong;

async function setup() {
  const fixtures = await createGardenFixtures();
  return {
    ...fixtures,
    service: createGardenMapService(fixtures.db, fixedClock('2026-06-15')),
    spaces: createSpaceService(fixtures.db, fixedClock('2026-06-15')),
    map: (...slots: GardenMapSlotInput[]): GardenMapInput => ({ layout, slots }),
    slot: (slotKey: string, space: { id: string }, zone?: { id: string }): GardenMapSlotInput => ({
      slotKey,
      spaceId: space.id,
      zoneId: zone?.id ?? null,
    }),
  };
}

describe('GardenMapService (port de GardenMapServiceTests.cs)', () => {
  it("Une carte neuve n'a ni modèle ni emplacement", async () => {
    const { service } = await setup();

    const map = await service.get();

    expect(map.layout).toBeNull();
    expect(map.slots).toEqual([]);
  });

  it('Remplacer la carte renvoie les emplacements avec leurs noms', async () => {
    const { service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const parcelle = await addZone(potager, 'Parcelle 1');
    const verger = await addSpace('Verger', 'Orchard');

    const saved = await service.replace(map(slot('vegetable', potager), slot('bed-1', potager, parcelle), slot('orchard', verger)));

    expect(saved.layout).toBe(layout);
    expect(saved.slots).toEqual([
      { slotKey: 'bed-1', spaceId: potager.id, spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: parcelle.id, zoneName: 'Parcelle 1' },
      { slotKey: 'orchard', spaceId: verger.id, spaceName: 'Verger', spaceKind: 'Orchard', zoneId: null, zoneName: null },
      { slotKey: 'vegetable', spaceId: potager.id, spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: null, zoneName: null },
    ]);
  });

  it("Remplacer la carte libère ce qui n'est pas relu", async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    const serre = await addSpace('Serre', 'Greenhouse');
    await service.replace(map(slot('orchard', verger), slot('greenhouse', serre)));

    const saved = await service.replace(map(slot('orchard', verger)));

    expect(saved.slots.map((s) => s.slotKey)).toEqual(['orchard']);
  });

  it('Retirer le modèle vide la carte', async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    await service.replace(map(slot('orchard', verger)));

    const saved = await service.replace({ layout: null, slots: [] });

    expect(saved.layout).toBeNull();
    expect(saved.slots).toEqual([]);
  });

  it("Sans modèle aucun emplacement n'est accepté", async () => {
    const { service, addSpace, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    await expect(service.replace({ layout: null, slots: [slot('orchard', verger)] })).rejects.toMatchObject(refused);
  });

  it('Un modèle inconnu est refusé', async () => {
    const { service } = await setup();

    await expect(service.replace({ layout: 'loft', slots: [] })).rejects.toMatchObject(refused);
  });

  it("Une clé d'emplacement inconnue est refusée", async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    await expect(service.replace(map(slot('bed-5', verger)))).rejects.toMatchObject(refused);
  });

  it("Un espace d'un autre type que l'emplacement est refusé", async () => {
    const { service, addSpace, map, slot } = await setup();
    const serre = await addSpace('Serre', 'Greenhouse');

    await expect(service.replace(map(slot('orchard', serre)))).rejects.toMatchObject(refused);
  });

  it('Une parcelle demande une zone', async () => {
    const { service, addSpace, map, slot } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.replace(map(slot('bed-1', potager)))).rejects.toMatchObject(refused);
  });

  it("Un emplacement d'espace refuse une zone", async () => {
    const { service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const parcelle = await addZone(potager, 'Parcelle 1');

    await expect(service.replace(map(slot('vegetable', potager, parcelle)))).rejects.toMatchObject(refused);
  });

  it("Une zone d'un autre espace est refusée", async () => {
    const { service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const autrePotager = await addSpace('Potager du fond');
    const carreDuFond = await addZone(autrePotager, 'Parcelle 1');

    await expect(service.replace(map(slot('bed-1', potager, carreDuFond)))).rejects.toMatchObject(refused);
  });

  it('Un emplacement affecté deux fois est refusé', async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    const vergerDuHaut = await addSpace('Verger du haut', 'Orchard');

    await expect(service.replace(map(slot('orchard', verger), slot('orchard', vergerDuHaut)))).rejects.toMatchObject(refused);
  });

  it('Un espace ne prend pas deux emplacements', async () => {
    const { service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const parcelle = await addZone(potager, 'Parcelle 1');

    await expect(service.replace(map(slot('bed-1', potager, parcelle), slot('bed-2', potager, parcelle)))).rejects.toMatchObject(refused);
  });

  it('Un espace archivé ne se pose pas sur la carte', async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard', true);

    await expect(service.replace(map(slot('orchard', verger)))).rejects.toMatchObject(refused);
  });

  it('Un espace inexistant est refusé', async () => {
    const { service, map } = await setup();

    await expect(service.replace(map({ slotKey: 'orchard', spaceId: 'inexistant' }))).rejects.toMatchObject(refused);
  });

  it('Un remplacement refusé laisse la carte intacte', async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    const serre = await addSpace('Serre', 'Greenhouse');
    await service.replace(map(slot('orchard', verger)));

    await expect(service.replace(map(slot('greenhouse', serre), slot('orchard', serre)))).rejects.toMatchObject(refused);

    expect((await service.get()).slots.map((s) => s.slotKey)).toEqual(['orchard']);
  });

  it('Supprimer un espace libère son emplacement', async () => {
    const { db, service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    await service.replace(map(slot('orchard', verger)));

    await db.run('DELETE FROM spaces WHERE id = ?', [verger.id]);

    expect((await service.get()).slots).toEqual([]);
  });

  it('Supprimer une zone libère sa parcelle sans toucher au potager', async () => {
    const { db, service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const parcelle = await addZone(potager, 'Parcelle 1');
    await service.replace(map(slot('vegetable', potager), slot('bed-1', potager, parcelle)));

    await db.run('DELETE FROM zones WHERE id = ?', [parcelle.id]);

    expect((await service.get()).slots.map((s) => s.slotKey)).toEqual(['vegetable']);
  });

  it('Archiver un espace le sort de la carte', async () => {
    const { service, spaces, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    await service.replace(map(slot('orchard', verger)));

    await spaces.setArchived(verger.id, true);

    expect((await service.get()).slots).toEqual([]);
    expect((await service.get()).layout).toBe(layout);
  });

  it("Changer le type d'un espace le sort de la carte", async () => {
    const { service, spaces, addSpace, count, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    await service.replace(map(slot('orchard', verger)));

    await spaces.update(verger.id, { name: 'Verger', kind: 'SmallFruit' });

    expect(await count('garden_map_slots')).toBe(0);
  });
});

describe('GardenMapService (ajouts au port)', () => {
  it('Le modèle maison de campagne accepte les mêmes emplacements', async () => {
    const { service, addSpace, addZone, slot } = await setup();
    const potager = await addSpace('Potager');
    const parcelle = await addZone(potager, 'Parcelle 1');
    const bois = await addSpace('Bûcher', 'Firewood');

    const saved = await service.replace({ layout: countryHouse, slots: [slot('bed-1', potager, parcelle), slot('firewood', bois)] });

    expect(saved.layout).toBe('country-house');
    expect(saved.slots.map((s) => s.slotKey)).toEqual(['bed-1', 'firewood']);
  });

  it('Un nom de modèle avec des blancs est nettoyé, un nom blanc retire la carte', async () => {
    const { service, addSpace, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    expect((await service.replace({ layout: ` ${layout} `, slots: [slot('orchard', verger)] })).layout).toBe(layout);
    expect((await service.replace({ layout: '  ', slots: [] })).layout).toBeNull();
  });

  it('Les emplacements sont rendus dans l\'ordre de leur clé', async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    const serre = await addSpace('Serre', 'Greenhouse');
    const bois = await addSpace('Bûcher', 'Firewood');

    const saved = await service.replace(map(slot('orchard', verger), slot('greenhouse', serre), slot('firewood', bois)));

    expect(saved.slots.map((s) => s.slotKey)).toEqual(['firewood', 'greenhouse', 'orchard']);
  });

  it('Une clé d\'emplacement vide est refusée sur le champ', async () => {
    const { service, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');

    await expect(service.replace(map(slot(' ', verger)))).rejects.toMatchObject({
      status: 400,
      problem: { errors: { 'Slots[0].SlotKey': expect.any(Array) } },
    });
  });
});

describe("GardenMapService.setup (l'assistant du premier lancement)", () => {
  const counts = async (db: Awaited<ReturnType<typeof setup>>['db']) => ({
    spaces: (await db.first<{ n: number }>('SELECT count(*) AS n FROM spaces'))!.n,
    zones: (await db.first<{ n: number }>('SELECT count(*) AS n FROM zones'))!.n,
  });

  it('crée les espaces et leurs zones, et les pose sur la carte en un appel', async () => {
    const { service, db } = await setup();

    const saved = await service.setup({
      layout: countryHouse,
      spaces: [
        {
          slotKey: 'vegetable',
          name: 'Potager',
          kind: 'VegetableGarden',
          zones: [
            { slotKey: 'bed-1', name: 'Parcelle 1' },
            { slotKey: 'bed-2', name: 'Parcelle 2' },
          ],
        },
        { slotKey: 'orchard', name: 'Verger', kind: 'Orchard' },
      ],
    });

    expect(saved.layout).toBe(countryHouse);
    expect(saved.slots.map(({ slotKey, spaceName, zoneName }) => [slotKey, spaceName, zoneName])).toEqual([
      ['bed-1', 'Potager', 'Parcelle 1'],
      ['bed-2', 'Potager', 'Parcelle 2'],
      ['orchard', 'Verger', null],
      ['vegetable', 'Potager', null],
    ]);
    await expect(counts(db)).resolves.toEqual({ spaces: 2, zones: 2 });
    const potager = saved.slots.find((slot) => slot.slotKey === 'vegetable')!;
    expect(saved.slots.filter((slot) => slot.zoneId !== null).every((slot) => slot.spaceId === potager.spaceId)).toBe(true);
  });

  it('sans espace coché, pose seulement le modèle', async () => {
    const { service } = await setup();

    await expect(service.setup({ layout: terracedLong, spaces: [] })).resolves.toEqual({ layout: terracedLong, slots: [] });
  });

  it("refuse un espace d'un autre type que son emplacement, et n'écrit rien", async () => {
    const { service, db } = await setup();

    await expect(
      service.setup({
        layout: countryHouse,
        spaces: [
          { slotKey: 'orchard', name: 'Verger', kind: 'Orchard' },
          { slotKey: 'vegetable', name: 'Serre', kind: 'Greenhouse' },
        ],
      }),
    ).rejects.toMatchObject(refused);

    await expect(counts(db)).resolves.toEqual({ spaces: 0, zones: 0 });
    await expect(service.get()).resolves.toEqual({ layout: null, slots: [] });
  });

  it("refuse une zone sur un emplacement d'espace, et n'écrit rien", async () => {
    const { service, db } = await setup();

    await expect(
      service.setup({
        layout: countryHouse,
        spaces: [{ slotKey: 'vegetable', name: 'Potager', kind: 'VegetableGarden', zones: [{ slotKey: 'greenhouse', name: 'Parcelle 1' }] }],
      }),
    ).rejects.toMatchObject(refused);

    await expect(counts(db)).resolves.toEqual({ spaces: 0, zones: 0 });
  });

  it("refuse un nom d'espace déjà pris, sans toucher à la carte en place", async () => {
    const { service, db, addSpace, map, slot } = await setup();
    const verger = await addSpace('Verger', 'Orchard');
    await service.replace(map(slot('orchard', verger)));

    await expect(
      service.setup({
        layout: countryHouse,
        spaces: [
          { slotKey: 'greenhouse', name: 'Serre', kind: 'Greenhouse' },
          { slotKey: 'orchard', name: 'Verger', kind: 'Orchard' },
        ],
      }),
    ).rejects.toMatchObject(refused);

    await expect(counts(db)).resolves.toEqual({ spaces: 1, zones: 0 });
    await expect(service.get()).resolves.toMatchObject({ layout, slots: [{ slotKey: 'orchard', spaceId: verger.id }] });
  });

  it('refuse un modèle inconnu, et un nom vide sur son champ', async () => {
    const { service, db } = await setup();

    await expect(service.setup({ layout: 'loft', spaces: [{ slotKey: 'orchard', name: 'Verger', kind: 'Orchard' }] })).rejects.toMatchObject(
      refused,
    );
    await expect(service.setup({ layout: countryHouse, spaces: [{ slotKey: 'orchard', name: ' ', kind: 'Orchard' }] })).rejects.toMatchObject({
      status: 400,
      problem: { errors: { Name: expect.any(Array) } },
    });
    await expect(counts(db)).resolves.toEqual({ spaces: 0, zones: 0 });
  });
});
