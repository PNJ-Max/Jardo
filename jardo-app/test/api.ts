type Reply = { status?: number; body?: unknown };
type Handler = Reply | ((request: { body: unknown }) => Reply | Promise<Reply>);

export type ApiCall = { method: string; path: string; body: unknown };

/**
 * Remplace `fetch` : chaque route est de la forme "GET /api/tasks/due?horizon=Week" (query
 * string comprise) et répond du JSON. Une route absente fait échouer le test plutôt que
 * d'atteindre un vrai serveur. Renvoie la liste des appels reçus.
 */
export function mockApi(routes: Record<string, Handler>): ApiCall[] {
  const calls: ApiCall[] = [];

  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const path = url.pathname + url.search;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });

    const handler = routes[`${method} ${path}`];
    if (!handler) throw new Error(`Route non simulée : ${method} ${path}`);

    const { status = 200, body: payload } = await (typeof handler === 'function' ? handler({ body }) : handler);
    return new Response(status === 204 ? null : JSON.stringify(payload ?? null), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as jest.Mock;

  return calls;
}

export const problem = (status: number, errors: Record<string, string[]>) => ({
  status,
  body: { title: 'One or more validation errors occurred.', status, errors },
});
