import { api, ApiError, queryString } from '@/api/client';

import { mockApi, problem } from '../../test/api';

describe('queryString', () => {
  it('omet les valeurs absentes et répète les listes', () => {
    expect(queryString({ spaceId: 2, zoneId: undefined, archived: false, kind: ['Watering', 'Pruning'] })).toBe(
      '?spaceId=2&kind=Watering&kind=Pruning',
    );
  });

  it('reste vide sans paramètre', () => {
    expect(queryString({ spaceId: null })).toBe('');
  });

  it('encode les valeurs', () => {
    expect(queryString({ q: 'a b&c' })).toBe('?q=a%20b%26c');
  });
});

describe('api', () => {
  it('renvoie le JSON de la réponse', async () => {
    mockApi({ 'GET /api/garden': { body: { name: 'Mon jardin' } } });
    await expect(api('/api/garden')).resolves.toEqual({ name: 'Mon jardin' });
  });

  it('n\'attend pas de corps sur un 204', async () => {
    mockApi({ 'DELETE /api/spaces/1': { status: 204 } });
    await expect(api('/api/spaces/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('transforme une réponse d\'erreur en ApiError portant le ProblemDetails', async () => {
    mockApi({ 'POST /api/spaces': problem(400, { Name: ['Le nom est obligatoire.'] }) });

    const error = await api('/api/spaces', { method: 'POST', body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    // La clé arrive en PascalCase de l'API : l'écran la demande en camelCase.
    expect((error as ApiError).fieldError('name')).toBe('Le nom est obligatoire.');
    expect((error as ApiError).fieldError('kind')).toBeUndefined();
  });

  it('survit à une erreur sans corps JSON', async () => {
    globalThis.fetch = jest.fn(async () => new Response('Bad gateway', { status: 502 })) as jest.Mock;
    const error = await api('/api/garden').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it('dit que l\'API est injoignable quand la requête ne part pas', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as jest.Mock;
    const error = (await api('/api/garden').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/API injoignable/);
  });
});
