import type { JournalEntryKind } from '@/api/types';
import { categoryMarks, kindMarks, PICTOGRAM_SIZE, SPECIES_CATEGORIES, tabMarks, type Mark } from '@/components/pictograms/drawings';
import { entryKinds } from '@/lib/garden';

const kinds = Object.keys(entryKinds) as JournalEntryKind[];
const paths = (marks: Mark[]) => marks.flatMap((mark) => (mark.kind === 'glow' ? [] : [mark]));
const colors = (marks: Mark[]) =>
  marks.flatMap((mark) => (mark.kind === 'glow' ? [mark.color] : [mark.fill, mark.stroke].filter((c) => c !== undefined)));

function expectDrawnInSquare(marks: Mark[]) {
  expect(paths(marks).length).toBeGreaterThan(2);
  for (const { d } of paths(marks)) {
    // Coordonnées absolues et déplacements relatifs des arcs restent dans le carré.
    for (const n of d.match(/-?\d+(\.\d+)?/g)!.map(Number)) expect(Math.abs(n)).toBeLessThanOrEqual(PICTOGRAM_SIZE);
  }
  for (const color of colors(marks)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
}

describe('pictogrammes', () => {
  it.each(kinds)('dessine %s dans le carré de 32, en clair comme en sombre', (kind) => {
    for (const scheme of ['light', 'dark'] as const) expectDrawnInSquare(kindMarks(kind, scheme));
  });

  it.each(SPECIES_CATEGORIES)('dessine la catégorie %s dans le carré de 32, avec un dessin par thème', (category) => {
    for (const scheme of ['light', 'dark'] as const) expectDrawnInSquare(categoryMarks(category, scheme));
    expect(categoryMarks(category, 'dark')).not.toEqual(categoryMarks(category, 'light'));
  });

  it("trace à l'encre du thème, la nuit plus claire que le jour", () => {
    const strokes = (scheme: 'light' | 'dark') => new Set(paths(kindMarks('Other', scheme)).flatMap((m) => m.stroke ?? []));
    expect(strokes('light')).toEqual(new Set(['#2E4A31']));
    expect(strokes('dark')).toEqual(new Set(['#CFE3D1']));
  });

  it('ne fait luire que le feu, et seulement la nuit', () => {
    const glowing = (scheme: 'light' | 'dark') => kinds.filter((kind) => kindMarks(kind, scheme).some((m) => m.kind === 'glow'));
    expect(glowing('light')).toEqual([]);
    expect(glowing('dark')).toEqual(['WoodConsumption']);
  });

  it("ne remplit l'onglet que s'il est actif", () => {
    expect(paths(tabMarks('garden', '#1B5E20', '#B3D6A9')).some((m) => m.fill === '#B3D6A9')).toBe(true);
    expect(paths(tabMarks('garden', '#4D6B50')).every((m) => m.fill === undefined && m.stroke === '#4D6B50')).toBe(true);
  });
});
