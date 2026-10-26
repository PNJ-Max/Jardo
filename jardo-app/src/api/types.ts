// Les contrats que lisent les écrans, sous leurs noms courts. Ils sont écrits à la main dans le
// domaine et les services locaux, à la forme des anciens DTO de l'API : les identifiants sont des
// UUID en chaîne, les jours des chaînes "YYYY-MM-DD", les instants de l'ISO 8601 complet.

export type {
  DryingStatus,
  DueStatus,
  Id,
  ItemKind,
  JournalEntryKind,
  MeasureUnit,
  QuantityUnit,
  SpaceKind,
  TaskRecurrence,
} from '@/domain/types';
export type { GardenBackup } from '@/data/backup';
export type { Garden, GardenInput } from '@/data/garden';
export type { GardenMap, GardenMapSlot } from '@/data/garden-map';
export type { JournalEntry, JournalEntryInput } from '@/data/journal';
export type { Plant, PlantInput } from '@/data/plants';
export type { ProblemDetails } from '@/data/problem';
export type { Space, SpaceInput } from '@/data/spaces';
export type { CompleteTaskInput, DueHorizon, GardenTask, TaskCompletion, TaskInput } from '@/data/tasks';
export type { WoodPile, WoodPileInput } from '@/data/wood-piles';
export type { Zone, ZoneInput } from '@/data/zones';
