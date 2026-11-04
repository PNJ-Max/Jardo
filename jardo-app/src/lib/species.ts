import { fortnights, type Fortnight, type FortnightRange, type PlantingKind, type PlantingWindow } from '@/domain/species';
import type { SpaceKind } from '@/domain/types';

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

const toDo: Record<PlantingKind, string> = {
  sowIndoors: 'À semer sous abri',
  sowOutdoors: 'À semer',
  plant: 'À planter',
};

const period: Record<PlantingKind, string> = {
  sowIndoors: 'Semis sous abri',
  sowOutdoors: 'Semis en place',
  plant: 'Plantation',
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

/** « de février », « d'avril », « de mi-juillet » */
const fromText = (label: string) => (/^[ao]/.test(label) ? `d'${label}` : `de ${label}`);

const startLabel = (fortnight: Fortnight) => {
  const { month, firstHalf } = parts(fortnight);
  return firstHalf ? month : `mi-${month}`;
};

const endLabel = (fortnight: Fortnight) => {
  const { month, firstHalf } = parts(fortnight);
  return firstHalf ? `mi-${month}` : `fin ${month}`;
};

/** « de février à mars », « de mi-avril à mi-mai », « en mars », « fin mars » */
function rangeText({ from, to }: FortnightRange) {
  const [start, end] = [parts(from), parts(to)];
  if (from === to) return start.firstHalf ? `début ${start.month}` : `fin ${start.month}`;
  if (start.month === end.month) return `en ${start.month}`;
  return `${fromText(startLabel(from))} à ${end.firstHalf ? `mi-${end.month}` : end.month}`;
}

/** Ce qui vient pour une espèce : plus utile, dans une liste de choix, qu'un nom latin. */
export function plantingHint({ kind, range, opensIn }: PlantingWindow): string {
  if (opensIn === 0) return `${toDo[kind]} jusqu'à ${endLabel(range.to)}`;
  if (opensIn === 1) return `${toDo[kind]} à partir ${fromText(startLabel(range.from))}`;
  return `${period[kind]} ${rangeText(range)}`;
}
