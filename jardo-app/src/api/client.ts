import type { ProblemDetails } from './types';

// En local, l'API tourne sur le même PC. On peut surcharger l'URL avec un fichier
// .env.local contenant EXPO_PUBLIC_API_URL=... (le préfixe EXPO_PUBLIC_ est ce qui
// rend la variable lisible côté app).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5015';

/**
 * Erreur levée pour toute réponse non 2xx. Elle transporte le ProblemDetails pour que
 * les écrans puissent afficher le message de l'API, et les formulaires les erreurs
 * par champ.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails,
  ) {
    super(problem.detail ?? problem.title ?? `Erreur ${status}`);
  }

  /** Erreurs de validation d'un champ, clé insensible à la casse ("Name" ou "name"). */
  fieldError(field: string): string | undefined {
    const entry = Object.entries(this.problem.errors ?? {}).find(
      ([key]) => key.toLowerCase() === field.toLowerCase(),
    );
    return entry?.[1][0];
  }
}

type QueryValue = string | number | boolean | readonly string[] | null | undefined;

/**
 * "?spaceId=2&kind=Watering&kind=Pruning", sans les valeurs absentes. Construite à la main :
 * URLSearchParams est incomplet sous React Native.
 */
export function queryString(params: Record<string, QueryValue>): string {
  const parts = Object.entries(params).flatMap(([key, value]) => {
    if (value === null || value === undefined || value === false) return [];
    const values = Array.isArray(value) ? value : [String(value)];
    return values.map((v) => `${key}=${encodeURIComponent(v)}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    // fetch ne lève que si la requête n'a pas pu partir : API éteinte, mauvaise URL,
    // CORS refusé. Le message par défaut du navigateur ne dit rien d'utile.
    throw new ApiError(0, { title: `API injoignable (${API_URL}). Est-elle démarrée ?` });
  }

  if (!response.ok) {
    const problem: ProblemDetails = await response.json().catch(() => ({}));
    throw new ApiError(response.status, problem);
  }

  // 204 No Content (suppressions) : pas de corps à lire.
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
