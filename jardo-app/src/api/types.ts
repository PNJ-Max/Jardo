// Contrats de l'API, recopiés des DTOs de Jardo.Api/Dtos.
//
// Écrits à la main plutôt que générés : openapi-typescript n'accepte pas encore
// TypeScript 6, et l'API ne compte qu'une dizaine de types. Si un DTO change côté
// .NET, c'est ce fichier qu'il faut mettre à jour.
//
// Les DateOnly arrivent en chaîne "YYYY-MM-DD", les DateTimeOffset en ISO complet.

export type WateringStatus = 'Ok' | 'DueSoon' | 'Overdue';

export interface Zone {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  plantCount: number;
  plantsNeedingWater: number;
}

export interface ZoneInput {
  name: string;
  description?: string | null;
}

export interface Plant {
  id: number;
  name: string;
  species: string | null;
  plantedDate: string | null;
  wateringIntervalDays: number;
  isArchived: boolean;
  createdAt: string;
  zoneId: number;
  zoneName: string;
  lastWateredAt: string | null;
  nextWateringDate: string;
  wateringStatus: WateringStatus;
  daysOverdue: number;
  needsWater: boolean;
}

export interface PlantInput {
  name: string;
  species?: string | null;
  plantedDate?: string | null;
  wateringIntervalDays: number;
  zoneId: number;
}

export interface WateringLog {
  id: number;
  plantId: number;
  wateredAt: string;
  note: string | null;
}

export interface WateringInput {
  wateredAt?: string;
  note?: string | null;
}

export interface ZoneWateringResult {
  zoneId: number;
  zoneName: string;
  wateredAt: string;
  plantsWatered: number;
}

export interface Observation {
  id: number;
  plantId: number;
  observedAt: string;
  note: string;
  heightCm: number | null;
  problemNote: string | null;
  treatment: string | null;
}

export interface ObservationInput {
  observedAt?: string;
  note: string;
  heightCm?: number | null;
  problemNote?: string | null;
  treatment?: string | null;
}

/** Réponse d'erreur RFC 9457, renvoyée par le GlobalExceptionHandler de l'API. */
export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  /** Présent uniquement sur les erreurs de validation (400), indexé par nom de champ. */
  errors?: Record<string, string[]>;
}
