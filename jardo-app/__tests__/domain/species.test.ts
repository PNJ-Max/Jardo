import {
  activeWindows,
  climates,
  fortnightOf,
  fortnights,
  normalizeName,
  rangeContains,
  rangeLength,
  shiftFortnight,
  windowsFor,
  type Climate,
  type FortnightRange,
  type Species,
} from '@/domain/species';

const species = (overrides: Partial<Species>): Species => ({
  id: 'test',
  name: 'Essai',
  aliases: [],
  scientificName: 'Planta probationis',
  category: 'Vegetable',
  spacingCm: { plants: 10 },
  exposure: 'Sun',
  quantityUnit: 'Plants',
  harvestUnit: 'Kilograms',
  tips: [],
  ...overrides,
});

const bounds = (ranges: FortnightRange[]) => ranges.map(({ from, to }) => `${from}-${to}`);

describe('quinzaines', () => {
  it('compte 24 quinzaines, de Jan1 à Dec2', () => {
    expect(fortnights).toHaveLength(24);
    expect(fortnights[0]).toBe('Jan1');
    expect(fortnights[23]).toBe('Dec2');
  });

  it.each([
    ['2026-01-01', 'Jan1'],
    ['2026-01-15', 'Jan1'],
    ['2026-01-16', 'Jan2'],
    ['2026-02-28', 'Feb2'],
    ['2024-02-29', 'Feb2'],
    ['2026-06-15', 'Jun1'],
    ['2026-12-31', 'Dec2'],
  ])('le %s tombe dans la quinzaine %s', (date, fortnight) => {
    expect(fortnightOf(date)).toBe(fortnight);
  });

  it('se décale à travers le Nouvel An, dans les deux sens', () => {
    expect(shiftFortnight('Dec2', 1)).toBe('Jan1');
    expect(shiftFortnight('Dec1', 2)).toBe('Jan1');
    expect(shiftFortnight('Jan1', -1)).toBe('Dec2');
    expect(shiftFortnight('Jan2', -2)).toBe('Dec2');
    expect(shiftFortnight('May2', 24)).toBe('May2');
    expect(shiftFortnight('May2', 0)).toBe('May2');
  });

  it('une plage qui chevauche le Nouvel An couvre décembre et janvier', () => {
    const leekHarvest: FortnightRange = { from: 'Sep1', to: 'Mar1' };

    expect((['Sep1', 'Dec2', 'Jan1', 'Mar1'] as const).every((f) => rangeContains(leekHarvest, f))).toBe(true);
    expect(rangeContains(leekHarvest, 'Mar2')).toBe(false);
    expect(rangeContains(leekHarvest, 'Aug2')).toBe(false);
    expect(rangeLength(leekHarvest)).toBe(13);
  });

  it("une plage d'une seule quinzaine ne couvre qu'elle", () => {
    const range: FortnightRange = { from: 'Mar1', to: 'Mar1' };

    expect(rangeContains(range, 'Mar1')).toBe(true);
    expect(rangeContains(range, 'Mar2')).toBe(false);
    expect(rangeContains(range, 'Feb2')).toBe(false);
    expect(rangeLength(range)).toBe(1);
  });
});

describe('fenêtres selon le climat', () => {
  const tomato = species({ plant: [{ from: 'May2', to: 'Jun2' }] });

  it.each<[Climate, string]>([
    ['Mediterranean', 'Apr2-May2'],
    ['Mild', 'May1-Jun1'],
    ['Temperate', 'May2-Jun2'],
    ['Cool', 'Jun1-Jul1'],
    ['Mountain', 'Jun2-Jul2'],
  ])('une plage de printemps en climat %s devient %s', (climate, expected) => {
    expect(bounds(windowsFor(tomato, 'plant', climate))).toEqual([expected]);
  });

  it.each<[Climate, string]>([
    ['Mediterranean', 'Aug2-Oct2'],
    ['Mild', 'Aug1-Oct1'],
    ['Temperate', 'Jul2-Sep2'],
    ['Cool', 'Jul1-Sep1'],
    ['Mountain', 'Jun2-Aug2'],
  ])("une plage d'automne en climat %s devient %s", (climate, expected) => {
    const lambLettuce = species({ sowOutdoors: [{ from: 'Jul2', to: 'Sep2', autumn: true }] });

    expect(bounds(windowsFor(lambLettuce, 'sowOutdoors', climate))).toEqual([expected]);
  });

  it('une plage de printemps qui finit en décembre déborde sur janvier en climat frais', () => {
    const late = species({ harvest: [{ from: 'Nov2', to: 'Dec2' }] });

    expect(bounds(windowsFor(late, 'harvest', 'Cool'))).toEqual(['Dec1-Jan1']);
    expect(bounds(windowsFor(late, 'harvest', 'Mountain'))).toEqual(['Dec2-Jan2']);
  });

  it('une plage de printemps qui commence en janvier recule sur décembre en climat doux', () => {
    const early = species({ sowIndoors: [{ from: 'Jan1', to: 'Feb1' }] });

    expect(bounds(windowsFor(early, 'sowIndoors', 'Mild'))).toEqual(['Dec2-Jan2']);
    expect(bounds(windowsFor(early, 'sowIndoors', 'Mediterranean'))).toEqual(['Dec1-Jan1']);
  });

  it("une plage d'automne qui chevauche le Nouvel An se décale sans perdre sa longueur", () => {
    const winterHarvest = species({ harvest: [{ from: 'Oct2', to: 'Mar1', autumn: true }] });

    expect(bounds(windowsFor(winterHarvest, 'harvest', 'Mountain'))).toEqual(['Sep2-Feb1']);
    expect(bounds(windowsFor(winterHarvest, 'harvest', 'Mediterranean'))).toEqual(['Nov2-Apr1']);
    for (const climate of climates) {
      expect(rangeLength(windowsFor(winterHarvest, 'harvest', climate)[0])).toBe(10);
    }
  });

  it("chaque plage d'une fiche suit son propre sens", () => {
    const garlic = species({
      plant: [
        { from: 'Oct2', to: 'Dec1', autumn: true },
        { from: 'Feb2', to: 'Mar2' },
      ],
    });

    expect(bounds(windowsFor(garlic, 'plant', 'Mountain'))).toEqual(['Sep2-Nov1', 'Mar2-Apr2']);
    expect(windowsFor(garlic, 'plant', 'Mountain')[0].autumn).toBe(true);
  });

  it.each(['FruitTree', 'SmallFruit'] as const)("les fenêtres d'un %s ne bougent pas", (category) => {
    const fruit = species({ category, harvest: [{ from: 'Aug2', to: 'Oct1' }] });

    for (const climate of climates) {
      expect(bounds(windowsFor(fruit, 'harvest', climate))).toEqual(['Aug2-Oct1']);
    }
  });

  it('une aromatique se décale comme un légume', () => {
    const herb = species({ category: 'Herb', sowOutdoors: [{ from: 'Apr1', to: 'May1' }] });

    expect(bounds(windowsFor(herb, 'sowOutdoors', 'Mountain'))).toEqual(['May1-Jun1']);
  });

  it("une fiche sans fenêtre d'un type n'en donne aucune", () => {
    expect(windowsFor(tomato, 'prune', 'Temperate')).toEqual([]);
  });
});

describe('en ce moment', () => {
  const radish = species({
    sowOutdoors: [
      { from: 'Mar1', to: 'May2' },
      { from: 'Aug2', to: 'Sep2', autumn: true },
    ],
    harvest: [
      { from: 'Apr1', to: 'Jun2' },
      { from: 'Sep2', to: 'Oct2', autumn: true },
    ],
  });

  it('donne les fenêtres qui couvrent le jour, avec leur type', () => {
    expect(activeWindows(radish, '2026-04-20', 'Temperate')).toEqual([
      { kind: 'sowOutdoors', range: { from: 'Mar1', to: 'May2' } },
      { kind: 'harvest', range: { from: 'Apr1', to: 'Jun2' } },
    ]);
  });

  it("ne donne rien en dehors des fenêtres", () => {
    expect(activeWindows(radish, '2026-07-10', 'Temperate')).toEqual([]);
  });

  it('tient compte du climat', () => {
    expect(activeWindows(radish, '2026-03-05', 'Mountain')).toEqual([]);
    expect(activeWindows(radish, '2026-08-05', 'Mountain')).toEqual([
      { kind: 'sowOutdoors', range: { from: 'Jul2', to: 'Aug2', autumn: true } },
    ]);
  });

  it("couvre le dernier jour de l'année et le premier", () => {
    const leek = species({ harvest: [{ from: 'Sep1', to: 'Mar1' }] });

    expect(activeWindows(leek, '2026-12-31', 'Temperate')).toHaveLength(1);
    expect(activeWindows(leek, '2027-01-01', 'Temperate')).toHaveLength(1);
  });
});

describe('noms', () => {
  it('ignore la casse, les accents et les espaces autour', () => {
    expect(normalizeName('Mâche')).toBe('mache');
    expect(normalizeName('  ÉPINARD ')).toBe('epinard');
    expect(normalizeName('Haricot à rames')).toBe('haricot a rames');
    expect(normalizeName('Céleri')).toBe(normalizeName('celeri'));
  });
});
