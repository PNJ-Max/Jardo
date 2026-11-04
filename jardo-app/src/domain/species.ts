import { dayOf, monthOf, type DateOnly } from './dates';
import type { MeasureUnit, QuantityUnit, SpaceKind } from './types';

// Le catalogue d'espèces : ce qu'une fiche contient et les calculs qu'on en tire. Les fiches
// elles-mêmes vivent dans `src/data/species/`. Voir docs/etude-catalogue-especes.md.

export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
type Month = (typeof months)[number];

/** Une quinzaine : la première du mois va du 1er au 15, la seconde du 16 à la fin du mois. */
export type Fortnight = `${Month}${1 | 2}`;

/** Les 24 quinzaines de l'année, dans l'ordre. */
export const fortnights: readonly Fortnight[] = months.flatMap((month) => [`${month}1`, `${month}2`] as const);

const fortnightCount = 24;

export const speciesCategories = ['Vegetable', 'Herb', 'FruitTree', 'SmallFruit'] as const;
export type SpeciesCategory = (typeof speciesCategories)[number];

export const exposures = ['Sun', 'PartShade', 'Shade'] as const;
export type Exposure = (typeof exposures)[number];

export const climates = ['Mediterranean', 'Mild', 'Temperate', 'Cool', 'Mountain'] as const;
export type Climate = (typeof climates)[number];

/** Le climat pour lequel les fiches sont écrites, et celui d'un jardin qui n'en a pas choisi. */
export const referenceClimate: Climate = 'Temperate';

/** Le décalage de chaque climat, en quinzaines, pour une plage de printemps. */
const climateOffsets: Record<Climate, number> = {
  Mediterranean: -2,
  Mild: -1,
  Temperate: 0,
  Cool: 1,
  Mountain: 2,
};

/** Une plage de quinzaines, bornes comprises. Elle peut chevaucher le Nouvel An (`Sep1` à `Mar1`). */
export type FortnightRange = {
  from: Fortnight;
  to: Fortnight;
  /** Plage d'automne : elle se décale en sens inverse, plus tôt quand il fait froid. */
  autumn?: boolean;
};

export const windowKinds = ['sowIndoors', 'sowOutdoors', 'plant', 'harvest', 'prune'] as const;
export type WindowKind = (typeof windowKinds)[number];

export type Species = {
  /** Identifiant définitif, en anglais : jamais renommé, jamais retiré. */
  id: string;
  name: string;
  aliases: readonly string[];
  scientificName: string;
  category: SpeciesCategory;
  /** Semis à repiquer : sous abri, ou en pépinière pour le poireau. */
  sowIndoors?: readonly FortnightRange[];
  /** Semis en place. */
  sowOutdoors?: readonly FortnightRange[];
  plant?: readonly FortnightRange[];
  harvest?: readonly FortnightRange[];
  prune?: readonly FortnightRange[];
  spacingCm: { plants: number; rows?: number };
  exposure: Exposure;
  /** Rythme d'arrosage de la plante installée, par temps sec. Absent quand on ne propose pas d'arroser. */
  wateringEveryDays?: number;
  quantityUnit: QuantityUnit;
  harvestUnit: MeasureUnit;
  tips: readonly string[];
};

const modulo = (value: number) => ((value % fortnightCount) + fortnightCount) % fortnightCount;

const indexOf = (fortnight: Fortnight) => fortnights.indexOf(fortnight);

export function fortnightOf(date: DateOnly): Fortnight {
  return fortnights[(monthOf(date) - 1) * 2 + (dayOf(date) <= 15 ? 0 : 1)];
}

export const shiftFortnight = (fortnight: Fortnight, offset: number) => fortnights[modulo(indexOf(fortnight) + offset)];

export function rangeContains(range: FortnightRange, fortnight: Fortnight): boolean {
  const [from, to, at] = [indexOf(range.from), indexOf(range.to), indexOf(fortnight)];
  return from <= to ? from <= at && at <= to : at >= from || at <= to;
}

/** Le nombre de quinzaines d'une plage, bornes comprises. */
export const rangeLength = (range: FortnightRange) => modulo(indexOf(range.to) - indexOf(range.from)) + 1;

/**
 * Les plages d'une espèce pour un climat. Les fruitiers et les petits fruits ne sont pas décalés :
 * leurs fenêtres suivent le repos de la végétation et dépendent surtout de la variété.
 */
export function windowsFor(species: Species, kind: WindowKind, climate: Climate): FortnightRange[] {
  const ranges = species[kind] ?? [];
  const shifted = species.category === 'Vegetable' || species.category === 'Herb';
  const offset = shifted ? climateOffsets[climate] : 0;

  return ranges.map((range) => {
    const k = range.autumn ? -offset : offset;
    return { ...range, from: shiftFortnight(range.from, k), to: shiftFortnight(range.to, k) };
  });
}

export type ActiveWindow = { kind: WindowKind; range: FortnightRange };

/** « En ce moment » : les fenêtres de l'espèce, décalées selon le climat, qui couvrent ce jour. */
export function activeWindows(species: Species, on: DateOnly, climate: Climate): ActiveWindow[] {
  const fortnight = fortnightOf(on);

  return windowKinds.flatMap((kind) =>
    windowsFor(species, kind, climate)
      .filter((range) => rangeContains(range, fortnight))
      .map((range) => ({ kind, range })),
  );
}

const plantingKinds = ['sowIndoors', 'sowOutdoors', 'plant'] as const;
export type PlantingKind = (typeof plantingKinds)[number];

export type PlantingWindow = {
  kind: PlantingKind;
  range: FortnightRange;
  /** Dans combien de quinzaines elle s'ouvre : 0 quand elle couvre déjà ce jour. */
  opensIn: number;
};

/** La fenêtre de semis ou de plantation qui couvre ce jour, à défaut celle qui s'ouvre le plus tôt. */
export function nextPlantingWindow(species: Species, on: DateOnly, climate: Climate): PlantingWindow | undefined {
  const fortnight = fortnightOf(on);
  const windows = plantingKinds.flatMap((kind) =>
    windowsFor(species, kind, climate).map((range) => ({
      kind,
      range,
      opensIn: rangeContains(range, fortnight) ? 0 : modulo(indexOf(range.from) - indexOf(fortnight)),
    })),
  );

  return windows.sort((a, b) => a.opensIn - b.opensIn)[0];
}

const suggestedCategories: Record<SpaceKind, readonly SpeciesCategory[]> = {
  VegetableGarden: ['Vegetable', 'Herb'],
  Greenhouse: ['Vegetable', 'Herb'],
  Orchard: ['FruitTree'],
  SmallFruit: ['SmallFruit'],
  Firewood: [],
};

const byName = (a: Species, b: Species) => a.name.localeCompare(b.name, 'fr');

/**
 * Ce qu'on propose avant toute recherche : les espèces du type d'espace, de A à Z, avec à part
 * celles qu'on peut semer ou planter cette quinzaine ou la suivante.
 */
export function speciesSuggestions(catalog: readonly Species[], spaceKind: SpaceKind, on: DateOnly, climate: Climate) {
  const suggested = catalog.filter((species) => suggestedCategories[spaceKind].includes(species.category)).sort(byName);
  const isNow = (species: Species) => (nextPlantingWindow(species, on, climate)?.opensIn ?? Infinity) <= 1;

  return { now: suggested.filter(isNow), others: suggested.filter((species) => !isNow(species)) };
}

/** Pour comparer des noms sans tenir compte de la casse ni des accents : « Mâche » vaut « mache ». */
export const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')
    .trim();

/** La recherche couvre tout le catalogue, noms et synonymes. Un nom qui commence par la saisie passe devant. */
export function searchSpecies(catalog: readonly Species[], query: string): Species[] {
  const wanted = normalizeName(query);
  if (!wanted) return [];
  const rank = (species: Species) => (normalizeName(species.name).startsWith(wanted) ? 0 : 1);

  return catalog
    .filter((species) => [species.name, ...species.aliases].some((name) => normalizeName(name).includes(wanted)))
    .sort((a, b) => rank(a) - rank(b) || byName(a, b));
}
