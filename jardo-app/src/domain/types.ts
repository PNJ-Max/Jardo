// Le vocabulaire du jardin. Les valeurs sont celles que l'API renvoie aujourd'hui, pour que le
// domaine s'insère sans conversion à la bascule.

export const spaceKinds = ['VegetableGarden', 'Orchard', 'SmallFruit', 'Firewood', 'Greenhouse'] as const;
export type SpaceKind = (typeof spaceKinds)[number];

export const itemKinds = ['Plant', 'WoodPile'] as const;
export type ItemKind = (typeof itemKinds)[number];

export const journalEntryKinds = [
  'Watering',
  'Sowing',
  'Planting',
  'Pruning',
  'Treatment',
  'Fertilizing',
  'Harvest',
  'Observation',
  'WoodSupply',
  'WoodConsumption',
  'Other',
] as const;
export type JournalEntryKind = (typeof journalEntryKinds)[number];

export const taskRecurrences = ['EveryNDays', 'Yearly', 'Once'] as const;
export type TaskRecurrence = (typeof taskRecurrences)[number];

export const quantityUnits = ['Plants', 'Rows', 'SquareMeters'] as const;
export type QuantityUnit = (typeof quantityUnits)[number];

export const measureUnits = ['Kilograms', 'Grams', 'Pieces', 'Steres'] as const;
export type MeasureUnit = (typeof measureUnits)[number];

export const dueStatuses = ['Ok', 'DueSoon', 'Overdue'] as const;
export type DueStatus = (typeof dueStatuses)[number];

export const dryingStatuses = ['Drying', 'Ready'] as const;
export type DryingStatus = (typeof dryingStatuses)[number];

/** Identifiant d'une ligne : un UUID en texte une fois la base locale en place. */
export type Id = string;
