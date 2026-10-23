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
    service: createGardenMapService(fixtures.db),
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
    const carre = await addZone(potager, 'Carré 1');
    const verger = await addSpace('Verger', 'Orchard');

    const saved = await service.replace(map(slot('vegetable', potager), slot('bed-1', potager, carre), slot('orchard', verger)));

    expect(saved.layout).toBe(layout);
    expect(saved.slots).toEqual([
      { slotKey: 'bed-1', spaceId: potager.id, spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: carre.id, zoneName: 'Carré 1' },
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

  it('Un carré demande une zone', async () => {
    const { service, addSpace, map, slot } = await setup();
    const potager = await addSpace('Potager');

    await expect(service.replace(map(slot('bed-1', potager)))).rejects.toMatchObject(refused);
  });

  it("Un emplacement d'espace refuse une zone", async () => {
    const { service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');

    await expect(service.replace(map(slot('vegetable', potager, carre)))).rejects.toMatchObject(refused);
  });

  it("Une zone d'un autre espace est refusée", async () => {
    const { service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const autrePotager = await addSpace('Potager du fond');
    const carreDuFond = await addZone(autrePotager, 'Carré 1');

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
    const carre = await addZone(potager, 'Carré 1');

    await expect(service.replace(map(slot('bed-1', potager, carre), slot('bed-2', potager, carre)))).rejects.toMatchObject(refused);
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

  it('Supprimer une zone libère son carré sans toucher au potager', async () => {
    const { db, service, addSpace, addZone, map, slot } = await setup();
    const potager = await addSpace('Potager');
    const carre = await addZone(potager, 'Carré 1');
    await service.replace(map(slot('vegetable', potager), slot('bed-1', potager, carre)));

    await db.run('DELETE FROM zones WHERE id = ?', [carre.id]);

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
    const carre = await addZone(potager, 'Carré 1');
    const bois = await addSpace('Bûcher', 'Firewood');

    const saved = await service.replace({ layout: countryHouse, slots: [slot('bed-1', potager, carre), slot('firewood', bois)] });

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
