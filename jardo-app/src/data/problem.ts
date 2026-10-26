import type { Id } from '@/domain/types';

/** Le format du ProblemDetails (RFC 9457) que l'API renvoyait, que les formulaires savent lire. */
export type ProblemDetails = {
  status?: number;
  title?: string;
  detail?: string;
  /** Erreurs par champ, clés en PascalCase comme celles de l'API : « Name », « Kind »… */
  errors?: Record<string, string[]>;
};

/**
 * Une règle refusée par un service. Même forme que l'`ApiError` de l'ancien client HTTP (statut,
 * problème, erreur par champ) : les écrans l'ont traitée sans changement à la bascule.
 */
export class ProblemError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails,
  ) {
    super(problem.detail ?? problem.title ?? `Erreur ${status}`);
  }

  /** Première erreur de validation d'un champ, clé insensible à la casse. */
  fieldError(field: string): string | undefined {
    const entry = Object.entries(this.problem.errors ?? {}).find(
      ([key]) => key.toLowerCase() === field.toLowerCase(),
    );
    return entry?.[1][0];
  }
}

/** `BusinessRuleException` : une requête bien formée que le métier refuse. */
export const businessRule = (detail: string) =>
  new ProblemError(400, { status: 400, title: 'Opération refusée', detail });

/** Un fichier de sauvegarde que l'import refuse en bloc. */
export const invalidBackup = (detail: string) =>
  new ProblemError(400, { status: 400, title: 'Fichier refusé', detail });

/** `NotFoundException` : la ressource demandée n'existe pas. */
export const notFound = (resource: string, id: Id) =>
  new ProblemError(404, { status: 404, title: 'Ressource introuvable', detail: `${resource} ${id} est introuvable.` });
