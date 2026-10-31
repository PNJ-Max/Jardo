import { findSpecies, speciesCatalog } from '@/data/species';
import {
  activeWindows,
  climates,
  exposures,
  fortnights,
  normalizeName,
  rangeContains,
  rangeLength,
  speciesCategories,
  windowKinds,
  windowsFor,
  type Climate,
  type WindowKind,
} from '@/domain/species';
import { measureUnits, quantityUnits } from '@/domain/types';

const allRanges = speciesCatalog.flatMap((species) =>
  windowKinds.flatMap((kind) => (species[kind] ?? []).map((range) => ({ species, kind, range }))),
);

const ids = speciesCatalog.map((species) => [species.id]);

/** Les espèces dont une fenêtre de ce type couvre ce jour. */
const inSeason = (kind: WindowKind, on: string, climate: Climate = 'Temperate') =>
  speciesCatalog
    .filter((species) => activeWindows(species, on, climate).some((window) => window.kind === kind))
    .map((species) => species.id);

describe("catalogue d'espèces", () => {
  // Une fois publiés, les identifiants ne changent plus : on n'ajoute à cette liste que de nouveaux.
  it('garde ses identifiants publiés', () => {
    expect(speciesCatalog.map((species) => species.id)).toEqual([
      'tomato',
      'zucchini',
      'lettuce',
      'carrot',
      'radish',
      'bean',
      'potato',
      'leek',
      'lamb-lettuce',
      'garlic',
      'apple-tree',
      'raspberry',
    ]);
  });

  it('a des identifiants uniques, en anglais minuscule et à tirets', () => {
    const all = speciesCatalog.map((species) => species.id);

    expect(new Set(all).size).toBe(all.length);
    for (const id of all) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('a des noms et des synonymes uniques, sans tenir compte de la casse ni des accents', () => {
    const names = speciesCatalog.flatMap((species) => [species.name, ...species.aliases]).map(normalizeName);

    expect(new Set(names).size).toBe(names.length);
  });

  it('retrouve une fiche par son identifiant', () => {
    expect(findSpecies('lamb-lettuce')?.name).toBe('Mâche');
    expect(findSpecies('mandrake')).toBeUndefined();
  });
});

describe.each(ids)('fiche %s', (id) => {
  const species = findSpecies(id)!;

  it('est complète', () => {
    expect(species.name.trim()).not.toBe('');
    expect(species.scientificName.trim()).not.toBe('');
    expect(speciesCategories).toContain(species.category);
    expect(exposures).toContain(species.exposure);
    expect(species.harvest?.length).toBeGreaterThan(0);

    if (species.category === 'Vegetable' || species.category === 'Herb') {
      const starts = [...(species.sowIndoors ?? []), ...(species.sowOutdoors ?? []), ...(species.plant ?? [])];
      expect(starts.length).toBeGreaterThan(0);
    } else {
      expect(species.plant?.length).toBeGreaterThan(0);
      expect(species.prune?.length).toBeGreaterThan(0);
    }
  });

  it('a des unités prises dans celles du modèle', () => {
    expect(quantityUnits).toContain(species.quantityUnit);
    expect(measureUnits).toContain(species.harvestUnit);
    expect(species.harvestUnit).not.toBe('Steres');
  });

  it('a des espacements positifs, le rang au moins aussi large que le plant', () => {
    const { plants, rows } = species.spacingCm;

    expect(plants).toBeGreaterThan(0);
    if (rows !== undefined) expect(rows).toBeGreaterThanOrEqual(plants);
  });

  it("a un rythme d'arrosage entier, de 1 à 14 jours, sauf pour un fruitier", () => {
    const days = species.wateringEveryDays;

    if (species.category === 'FruitTree') expect(days).toBeUndefined();
    else if (days !== undefined) {
      expect(Number.isInteger(days)).toBe(true);
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(14);
    }
  });

  it('a au plus trois conseils, en une phrase courte chacun', () => {
    expect(species.tips.length).toBeGreaterThan(0);
    expect(species.tips.length).toBeLessThanOrEqual(3);
    for (const tip of species.tips) {
      expect(tip.length).toBeLessThanOrEqual(140);
      expect(tip).toMatch(/^\p{Lu}.*\.$/u);
    }
  });

  it("a des plages dans l'année, d'au plus huit mois", () => {
    for (const { range } of allRanges.filter((entry) => entry.species === species)) {
      expect(fortnights).toContain(range.from);
      expect(fortnights).toContain(range.to);
      expect(rangeLength(range)).toBeLessThanOrEqual(16);
    }
  });

  it("ne marque une plage d'automne que sur un légume ou une aromatique, qui seuls se décalent", () => {
    const autumn = allRanges.filter((entry) => entry.species === species && entry.range.autumn);

    if (species.category === 'FruitTree' || species.category === 'SmallFruit') expect(autumn).toEqual([]);
  });

  it.each(climates)("n'a pas deux plages du même type qui se chevauchent en climat %s", (climate) => {
    for (const kind of windowKinds) {
      const ranges = windowsFor(species, kind, climate);
      for (const [i, a] of ranges.entries()) {
        for (const b of ranges.slice(i + 1)) {
          expect(fortnights.some((f) => rangeContains(a, f) && rangeContains(b, f))).toBe(false);
        }
      }
    }
  });
});

describe('en ce moment, dans le catalogue', () => {
  it("fin octobre en climat tempéré : planter ail et framboisier, récolter ce qui tient l'hiver", () => {
    expect(inSeason('sowIndoors', '2026-10-31')).toEqual([]);
    expect(inSeason('sowOutdoors', '2026-10-31')).toEqual([]);
    expect(inSeason('plant', '2026-10-31')).toEqual(['garlic', 'raspberry']);
    expect(inSeason('harvest', '2026-10-31')).toEqual([
      'lettuce',
      'carrot',
      'radish',
      'leek',
      'lamb-lettuce',
      'apple-tree',
    ]);
  });

  it('mi-janvier : tailler, planter les fruitiers, récolter poireaux et mâche', () => {
    expect(inSeason('prune', '2026-01-10')).toEqual(['apple-tree', 'raspberry']);
    expect(inSeason('plant', '2026-01-10')).toEqual(['apple-tree', 'raspberry']);
    expect(inSeason('harvest', '2026-01-10')).toEqual(['leek', 'lamb-lettuce']);
  });

  it('après la mi-mai : planter les tomates en climat tempéré, pas encore en montagne', () => {
    expect(inSeason('plant', '2026-05-20')).toEqual(['tomato', 'zucchini', 'lettuce', 'leek']);
    expect(inSeason('sowOutdoors', '2026-05-20')).toEqual(['zucchini', 'lettuce', 'carrot', 'radish', 'bean']);
    expect(inSeason('plant', '2026-05-20', 'Mountain')).toEqual(['lettuce', 'potato']);
    expect(inSeason('plant', '2026-05-01', 'Mediterranean')).toContain('tomato');
  });

  it('début septembre : semer la mâche, plus tôt en montagne, plus tard dans le Midi', () => {
    expect(inSeason('sowOutdoors', '2026-09-01')).toContain('lamb-lettuce');
    expect(inSeason('sowOutdoors', '2026-09-01', 'Mountain')).not.toContain('lamb-lettuce');
    expect(inSeason('sowOutdoors', '2026-06-20', 'Mountain')).toContain('lamb-lettuce');
    expect(inSeason('sowOutdoors', '2026-10-05', 'Mediterranean')).toContain('lamb-lettuce');
  });

  it("l'ail d'automne se plante plus tôt en climat froid, plus tard en climat doux", () => {
    expect(inSeason('plant', '2026-09-20', 'Mountain')).toContain('garlic');
    expect(inSeason('plant', '2026-09-20')).not.toContain('garlic');
    expect(inSeason('plant', '2026-11-25', 'Mountain')).not.toContain('garlic');
    expect(inSeason('plant', '2026-12-20', 'Mediterranean')).toContain('garlic');
  });

  it('le framboisier et le pommier gardent leurs dates en montagne', () => {
    expect(inSeason('harvest', '2026-09-01', 'Mountain')).toEqual(
      expect.arrayContaining(['apple-tree', 'raspberry']),
    );
    expect(inSeason('prune', '2026-01-10', 'Mountain')).toEqual(['apple-tree', 'raspberry']);
  });
});
