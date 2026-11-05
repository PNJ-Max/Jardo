import { createGardenService } from '@/data/garden';
import type { Climate } from '@/domain/species';

import { createTestDb } from '../../test/db';

// GardenService n'avait pas de test côté .NET : ces cas sont des ajouts.

describe('GardenService', () => {
  it('Le jardin unique existe dès la migration', async () => {
    const service = createGardenService(await createTestDb());

    const garden = await service.get();

    expect(garden).toMatchObject({ name: 'Mon jardin' });
    expect(garden.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(garden.createdAt).toISOString()).toBe(garden.createdAt);
  });

  it('Renommer le jardin nettoie le nom', async () => {
    const service = createGardenService(await createTestDb());

    const garden = await service.update({ name: '  Jardin des Tilleuls ' });

    expect(garden.name).toBe('Jardin des Tilleuls');
    expect((await service.get()).name).toBe('Jardin des Tilleuls');
  });

  it('Un nom vide ou trop long est refusé sur le champ', async () => {
    const service = createGardenService(await createTestDb());

    for (const name of ['  ', 'x'.repeat(101)]) {
      await expect(service.update({ name })).rejects.toMatchObject({
        status: 400,
        problem: { errors: { Name: expect.any(Array) } },
      });
    }
    expect((await service.get()).name).toBe('Mon jardin');
  });

  it("Le climat reste vide tant que l'utilisateur n'a rien choisi", async () => {
    const service = createGardenService(await createTestDb());

    expect((await service.get()).climate).toBeNull();
  });

  it('Choisir le climat le garde, et renommer le jardin ne le perd pas', async () => {
    const service = createGardenService(await createTestDb());

    await expect(service.setClimate('Mountain')).resolves.toMatchObject({ climate: 'Mountain' });
    await service.update({ name: 'Le chalet' });

    expect(await service.get()).toMatchObject({ name: 'Le chalet', climate: 'Mountain' });
  });

  it('Un climat inconnu est refusé sur le champ', async () => {
    const service = createGardenService(await createTestDb());

    await expect(service.setClimate('Tropical' as Climate)).rejects.toMatchObject({
      status: 400,
      problem: { errors: { Climate: expect.any(Array) } },
    });
    expect((await service.get()).climate).toBeNull();
  });
});
