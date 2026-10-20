import type { Href } from 'expo-router';

import type { ItemKind, JournalEntryKind, MeasureUnit, QuantityUnit, SpaceKind, TaskRecurrence } from '@/api/types';
import type { IconName } from '@/components/ui';

// Vocabulaire du domaine affiché à l'écran. Les règles d'acceptation reprennent celles de l'API
// (docs/modele-domaine.md) : elles servent à ne proposer que des choix valides, l'API reste juge.

export const spaceKinds: Record<SpaceKind, { label: string; icon: IconName }> = {
  VegetableGarden: { label: 'Potager', icon: 'leaf-outline' },
  Orchard: { label: 'Verger', icon: 'nutrition-outline' },
  SmallFruit: { label: 'Petits fruits', icon: 'flower-outline' },
  Greenhouse: { label: 'Serre', icon: 'sunny-outline' },
  Firewood: { label: 'Bois de chauffage', icon: 'bonfire-outline' },
};

export const spaceKindOptions = (Object.keys(spaceKinds) as SpaceKind[]).map((kind) => ({
  value: kind,
  label: spaceKinds[kind].label,
}));

/** `label` nomme l'intervention au journal, `verb` la tâche à faire. */
export const entryKinds: Record<JournalEntryKind, { label: string; verb: string; icon: IconName }> = {
  Watering: { label: 'Arrosage', verb: 'Arroser', icon: 'water-outline' },
  Sowing: { label: 'Semis', verb: 'Semer', icon: 'leaf-outline' },
  Planting: { label: 'Plantation', verb: 'Planter', icon: 'flower-outline' },
  Pruning: { label: 'Taille', verb: 'Tailler', icon: 'cut-outline' },
  Treatment: { label: 'Traitement', verb: 'Traiter', icon: 'medkit-outline' },
  Fertilizing: { label: 'Fertilisation', verb: 'Fertiliser', icon: 'flask-outline' },
  Harvest: { label: 'Récolte', verb: 'Récolter', icon: 'basket-outline' },
  Observation: { label: 'Observation', verb: 'Observer', icon: 'eye-outline' },
  WoodSupply: { label: 'Apport de bois', verb: 'Apporter du bois', icon: 'add-circle-outline' },
  WoodConsumption: { label: 'Consommation de bois', verb: 'Consommer du bois', icon: 'flame-outline' },
  Other: { label: 'Autre', verb: 'Autre', icon: 'ellipsis-horizontal-circle-outline' },
};

const plantCareKinds: JournalEntryKind[] = [
  'Watering',
  'Sowing',
  'Planting',
  'Pruning',
  'Treatment',
  'Fertilizing',
  'Harvest',
];
const woodKinds: JournalEntryKind[] = ['WoodSupply', 'WoodConsumption'];

/** Les interventions qu'un espace accepte : le bois au bois de chauffage, les soins ailleurs. */
export function entryKindsFor(spaceKind: SpaceKind): JournalEntryKind[] {
  return [...(spaceKind === 'Firewood' ? woodKinds : plantCareKinds), 'Observation', 'Other'];
}

/**
 * Une tâche de bois ne pourrait jamais être faite : l'entrée exige un volume que « Fait » ne
 * porte pas. « Rentrer le bois » se prévoit en tâche « autre ».
 */
const itemTaskKinds: Record<ItemKind, JournalEntryKind[]> = {
  Plant: [...plantCareKinds, 'Observation', 'Other'],
  WoodPile: ['Observation', 'Other'],
};

/** Les tâches qui conviennent à la cible : celles de son élément, ou à défaut de son espace. */
export function taskKindsFor(spaceKind: SpaceKind, itemKind: ItemKind | null): JournalEntryKind[] {
  return itemKind ? itemTaskKinds[itemKind] : entryKindsFor(spaceKind).filter((kind) => !woodKinds.includes(kind));
}

export const isWoodKind = (kind: JournalEntryKind) => woodKinds.includes(kind);

export const recurrenceOptions: { value: TaskRecurrence; label: string }[] = [
  { value: 'EveryNDays', label: 'Tous les N jours' },
  { value: 'Yearly', label: 'Chaque année' },
  { value: 'Once', label: 'Une seule fois' },
];

type UnitLabel = { one: string; many: string };

export const quantityUnits: Record<QuantityUnit, UnitLabel> = {
  Plants: { one: 'pied', many: 'pieds' },
  Rows: { one: 'rang', many: 'rangs' },
  SquareMeters: { one: 'm²', many: 'm²' },
};

export const measureUnits: Record<MeasureUnit, UnitLabel> = {
  Kilograms: { one: 'kg', many: 'kg' },
  Grams: { one: 'g', many: 'g' },
  Pieces: { one: 'pièce', many: 'pièces' },
  Steres: { one: 'stère', many: 'stères' },
};

export const harvestUnits: MeasureUnit[] = ['Kilograms', 'Grams', 'Pieces'];

export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** « 1 pied », « 1,5 stère », « 2 pieds » : en français, le pluriel commence à 2. */
export function formatQuantity(value: number, unit: UnitLabel): string {
  return `${formatNumber(value)} ${value < 2 ? unit.one : unit.many}`;
}

export const steres = (value: number) => formatQuantity(value, measureUnits.Steres);

/** Valeur initiale d'un champ numérique : 2.5 → "2,5", sans séparateur de milliers. */
export const decimalText = (value: number) => String(value).replace('.', ',');

/** "2,5" ou "2.5" → 2.5 ; null si vide ou illisible. On tape une virgule sur un clavier français. */
export function parseDecimal(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

type Target = { spaceName: string; zoneName: string | null; itemName: string | null };

/** « Tomates · Carré 1 · Potager » : du plus précis au plus large. */
export function targetLabel({ itemName, zoneName, spaceName }: Target): string {
  return [itemName, zoneName, spaceName].filter(Boolean).join(' · ');
}

/** L'écran qui montre la cible d'une tâche ou d'une intervention : la fiche de l'élément, sa zone ou son espace. */
export function targetHref(target: {
  spaceId: number;
  zoneId: number | null;
  itemId: number | null;
  itemKind: ItemKind | null;
}): Href {
  if (target.itemId) {
    return target.itemKind === 'WoodPile' ? `/wood-pile/${target.itemId}` : `/plant/${target.itemId}`;
  }
  return target.zoneId ? `/zone/${target.zoneId}` : `/space/${target.spaceId}`;
}
