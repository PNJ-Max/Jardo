import type { JournalEntryKind } from '@/api/types';
import {
  fortnights,
  type ActiveWindow,
  type CalendarRow,
  type Climate,
  type Exposure,
  type Fortnight,
  type FortnightRange,
  type Species,
  type SpeciesCategory,
  type WindowKind,
} from '@/domain/species';

// Le vocabulaire du catalogue d'espèces affiché à l'écran.

const monthNames = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** `label` nomme la fenêtre au calendrier, `verb` dit quoi faire, `icon` est son pictogramme. */
export const windowKindLabels: Record<WindowKind, { label: string; verb: string; icon: JournalEntryKind }> = {
  sowIndoors: { label: 'Semis sous abri', verb: 'Semer sous abri', icon: 'Sowing' },
  sowOutdoors: { label: 'Semis en place', verb: 'Semer en place', icon: 'Sowing' },
  plant: { label: 'Plantation', verb: 'Planter', icon: 'Planting' },
  harvest: { label: 'Récolte', verb: 'Récolter', icon: 'Harvest' },
  prune: { label: 'Taille', verb: 'Tailler', icon: 'Pruning' },
};

export const categoryLabels: Record<SpeciesCategory, string> = {
  Vegetable: 'Légume',
  Herb: 'Aromatique',
  FruitTree: 'Fruitier',
  SmallFruit: 'Petit fruit',
};

export const exposureLabels: Record<Exposure, string> = {
  Sun: 'Plein soleil',
  PartShade: 'Mi-ombre',
  Shade: 'Ombre',
};

export const climateNames: Record<Climate, string> = {
  Mediterranean: 'climat méditerranéen',
  Mild: 'climat doux',
  Temperate: 'climat tempéré',
  Cool: 'climat frais',
  Mountain: 'climat de montagne',
};

/** `Mar1` → « début mars », `Mar2` → « fin mars ». */
export function formatFortnight(fortnight: Fortnight): string {
  const index = fortnights.indexOf(fortnight);
  return `${index % 2 === 0 ? 'début' : 'fin'} ${monthNames[Math.floor(index / 2)]}`;
}

/** « de début mars à début avril », ou la quinzaine seule. */
export function formatRange({ from, to }: FortnightRange): string {
  return from === to ? formatFortnight(from) : `de ${formatFortnight(from)} à ${formatFortnight(to)}`;
}

/** Ce que le calendrier dessiné montre, pour le lecteur d'écran. */
export function calendarSummary(rows: CalendarRow[]): string {
  return rows.map(({ kind, ranges }) => `${windowKindLabels[kind].label} : ${ranges.map(formatRange).join(', puis ')}.`).join(' ');
}

/** « Récolter jusqu'à début novembre » */
export function formatActiveWindow({ kind, range }: ActiveWindow): string {
  return `${windowKindLabels[kind].verb} jusqu'à ${formatFortnight(range.to)}`;
}

const formatLength = (cm: number) => (cm < 100 ? `${cm} cm` : `${String(cm / 100).replace('.', ',')} m`);

/** « 50 cm entre plants, 80 cm entre rangs » */
export function formatSpacing({ spacingCm: { plants, rows }, category }: Species): string {
  const between = category === 'FruitTree' ? 'arbres' : 'plants';
  return [`${formatLength(plants)} entre ${between}`, rows && `${formatLength(rows)} entre rangs`].filter(Boolean).join(', ');
}

/** Le rythme de la plante installée : les premières semaines demandent plus d'eau. */
export const formatWatering = (everyDays: number) =>
  `Tous les ${everyDays} jours par temps sec, plus souvent les premières semaines`;
