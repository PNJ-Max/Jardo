import type { Id, JournalEntryKind, TaskInput } from '@/api/types';
import { yearOf, type DateOnly } from '@/domain/dates';
import type { ReminderProposal } from '@/domain/reminder-proposals';
import {
  fortnightOf,
  fortnights,
  type ActiveWindow,
  type CalendarRow,
  type Climate,
  type Exposure,
  type Fortnight,
  type FortnightRange,
  type PlantingKind,
  type PlantingWindow,
  type Species,
  type SpeciesCategory,
  type WindowKind,
} from '@/domain/species';
import type { SpaceKind } from '@/domain/types';
import { lowerFirst } from '@/lib/garden';

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

const toDo: Record<PlantingKind, string> = {
  sowIndoors: 'À semer sous abri',
  sowOutdoors: 'À semer',
  plant: 'À planter',
};

const suggestionTitles: Record<SpaceKind, string> = {
  VegetableGarden: 'Pour le potager',
  Greenhouse: 'Pour la serre',
  Orchard: 'Pour le verger',
  SmallFruit: 'Pour les petits fruits',
  Firewood: 'Pour le bois de chauffage',
};

/** Le titre des suggestions d'un type d'espace, dans le choix de l'espèce. */
export const suggestionsTitle = (kind: SpaceKind) => suggestionTitles[kind];

function parts(fortnight: Fortnight) {
  const index = fortnights.indexOf(fortnight);
  return { month: monthNames[Math.floor(index / 2)], firstHalf: index % 2 === 0 };
}

/** Une quinzaine seule : `Mar1` → « début mars », `Mar2` → « fin mars ». */
export function formatFortnight(fortnight: Fortnight): string {
  const { month, firstHalf } = parts(fortnight);
  return `${firstHalf ? 'début' : 'fin'} ${month}`;
}

/** Le début d'une plage : `Mar1` → « début mars », `Mar2` → « mi-mars », qui commence le 16. */
function rangeStart(fortnight: Fortnight) {
  const { month, firstHalf } = parts(fortnight);
  return firstHalf ? `début ${month}` : `mi-${month}`;
}

/** La fin d'une plage : `Mar1` → « mi-mars », qui finit le 15, `Mar2` → « fin mars ». */
function rangeEnd(fortnight: Fortnight) {
  const { month, firstHalf } = parts(fortnight);
  return firstHalf ? `mi-${month}` : `fin ${month}`;
}

/** « de début mars à mi-avril », ou la quinzaine seule. */
export function formatRange({ from, to }: FortnightRange): string {
  return from === to ? formatFortnight(from) : `de ${rangeStart(from)} à ${rangeEnd(to)}`;
}

/** Ce que le calendrier dessiné montre, pour le lecteur d'écran. */
export function calendarSummary(rows: CalendarRow[]): string {
  return rows.map(({ kind, ranges }) => `${windowKindLabels[kind].label} : ${ranges.map(formatRange).join(', puis ')}.`).join(' ');
}

/** « Récolter jusqu'à mi-novembre » */
export function formatActiveWindow({ kind, range }: ActiveWindow): string {
  return `${windowKindLabels[kind].verb} jusqu'à ${rangeEnd(range.to)}`;
}

/** « de février », « d'avril », « de mi-juillet » */
const fromText = (label: string) => (/^[ao]/.test(label) ? `d'${label}` : `de ${label}`);

// Dans une ligne de la feuille d'espèce, le mois seul suffit pour une plage qui le couvre à son bord.
function shortStart(fortnight: Fortnight) {
  const { month, firstHalf } = parts(fortnight);
  return firstHalf ? month : `mi-${month}`;
}

function shortEnd(fortnight: Fortnight) {
  const { month, firstHalf } = parts(fortnight);
  return firstHalf ? `mi-${month}` : month;
}

/** « de février à mars », « de mi-avril à mi-mai », « en mars », « fin mars » */
function shortRange({ from, to }: FortnightRange) {
  if (from === to) return formatFortnight(from);
  if (parts(from).month === parts(to).month) return `en ${parts(from).month}`;
  return `${fromText(shortStart(from))} à ${shortEnd(to)}`;
}

/** Ce qui vient pour une espèce : plus utile, dans une liste de choix, qu'un nom latin. */
export function plantingHint({ kind, range, opensIn }: PlantingWindow): string {
  if (opensIn === 0) return `${toDo[kind]} jusqu'à ${rangeEnd(range.to)}`;
  if (opensIn === 1) return `${toDo[kind]} à partir ${fromText(shortStart(range.from))}`;
  return `${windowKindLabels[kind].label} ${shortRange(range)}`;
}

/** « la tomate », « l'ail » */
export const speciesWithArticle = ({ article, name }: Species) =>
  `${article}${article.endsWith("'") ? '' : ' '}${lowerFirst(name)}`;

/** « Arroser tous les 3 jours », « Récolter chaque année » : ce que la tâche demandera. */
export function proposalTitle({ kind, window, recurrence, intervalDays }: ReminderProposal): string {
  if (kind === 'Watering') return `Arroser tous les ${intervalDays} jours`;
  const verb = windowKindLabels[window!].verb;
  return recurrence === 'Yearly' ? `${verb} chaque année` : verb;
}

/** « à partir d'aujourd'hui », « à partir de mi-juillet 2027 » : l'année n'apparaît que si ce n'est pas celle du jour. */
export function proposalStart({ startDate }: ReminderProposal, on: DateOnly): string {
  if (startDate === on) return "à partir d'aujourd'hui";
  const year = yearOf(startDate) === yearOf(on) ? '' : ` ${yearOf(startDate)}`;
  return `à partir ${fromText(rangeStart(fortnightOf(startDate)))}${year}`;
}

/** La tâche d'une proposition acceptée. Un semis garde « sous abri » ou « en place » dans son titre. */
export function proposalTask(
  { kind, window, recurrence, intervalDays, startDate }: ReminderProposal,
  target: { spaceId: Id; zoneId: Id | null; itemId: Id },
): TaskInput {
  const title = kind === 'Sowing' ? windowKindLabels[window!].verb : null;
  return { kind, title, recurrence, intervalDays, startDate, ...target };
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
