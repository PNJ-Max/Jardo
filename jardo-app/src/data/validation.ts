import { yearOf } from '@/domain/dates';

import { ProblemError } from './problem';

// Les DataAnnotations des DTO de l'API : la forme d'une requête, vérifiée avant les règles métier.
// Elles rendent des erreurs par champ, que les formulaires affichent sous le champ concerné.

/** Une chaîne vide ou blanche devient null : une seule représentation de « pas de valeur ». */
export function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const isDateOnly = (value: string) => {
  try {
    yearOf(value);
    return true;
  } catch {
    return false;
  }
};

/** Collecte les erreurs de tous les champs avant de refuser, comme la validation de l'API. */
export class Validation {
  private readonly errors: Record<string, string[]> = {};

  private fail(field: string, message: string) {
    (this.errors[field] ??= []).push(message);
  }

  /** Obligatoire, ni vide ni blanc, au plus `max` caractères. */
  required(field: string, label: string, value: unknown, max: number): this {
    if (typeof value !== 'string' || value.trim().length === 0) {
      this.fail(field, `Le champ « ${label} » ne peut pas être vide.`);
    } else if (value.length > max) {
      this.tooLong(field, label, max);
    }
    return this;
  }

  optional(field: string, label: string, value: string | null | undefined, max: number): this {
    if (value != null && value.length > max) this.tooLong(field, label, max);
    return this;
  }

  oneOf<T extends string>(field: string, label: string, value: unknown, allowed: readonly T[]): this {
    if (!allowed.includes(value as T)) this.fail(field, `La valeur du champ « ${label} » n'est pas reconnue.`);
    return this;
  }

  /** Un `int` côté API : avec `integer`, une valeur décimale est refusée (la colonne est un entier). */
  range(field: string, label: string, value: number, min: number, max: number, { integer = false } = {}): this {
    if (!(value >= min && value <= max) || (integer && !Number.isInteger(value))) {
      this.fail(field, `Le champ « ${label} » doit être compris entre ${min} et ${max}${integer ? ' (nombre entier)' : ''}.`);
    }
    return this;
  }

  optionalRange(
    field: string,
    label: string,
    value: number | null | undefined,
    min: number,
    max: number,
    options: { integer?: boolean } = {},
  ): this {
    return value == null ? this : this.range(field, label, value, min, max, options);
  }

  optionalOneOf<T extends string>(field: string, label: string, value: unknown, allowed: readonly T[]): this {
    return value == null ? this : this.oneOf(field, label, value, allowed);
  }

  date(field: string, label: string, value: string | null | undefined, { required = false } = {}): this {
    if (value == null) {
      if (required) this.fail(field, `Le champ « ${label} » est obligatoire.`);
    } else if (!isDateOnly(value)) {
      this.fail(field, `Le champ « ${label} » n'est pas un jour au format AAAA-MM-JJ.`);
    }
    return this;
  }

  /** Une clé d'identifiant : une chaîne non vide. */
  id(field: string, label: string, value: unknown, { nullable = false } = {}): this {
    if (nullable && value == null) return this;
    if (typeof value !== 'string' || value.length === 0) this.fail(field, `Le champ « ${label} » est obligatoire.`);
    return this;
  }

  /** Lève le ProblemDetails de validation s'il y a une erreur. */
  done(): void {
    if (Object.keys(this.errors).length > 0) {
      throw new ProblemError(400, {
        status: 400,
        title: 'Une ou plusieurs erreurs de validation se sont produites.',
        errors: this.errors,
      });
    }
  }

  private tooLong(field: string, label: string, max: number) {
    this.fail(field, `Le champ « ${label} » ne doit pas dépasser ${max} caractères.`);
  }
}
