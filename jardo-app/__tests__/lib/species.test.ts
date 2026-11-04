import type { FortnightRange, PlantingKind, PlantingWindow } from '@/domain/species';
import { plantingHint, suggestionsTitle } from '@/lib/species';

const hint = (window: Partial<PlantingWindow>) =>
  plantingHint({ kind: 'plant', range: { from: 'Oct2', to: 'Nov2' }, opensIn: 0, ...window });

describe('ce qui vient pour une espèce', () => {
  it("une fenêtre ouverte dit jusqu'à quand", () => {
    expect(hint({})).toBe("À planter jusqu'à fin novembre");
    expect(hint({ kind: 'sowOutdoors', range: { from: 'Oct1', to: 'Nov1' } })).toBe("À semer jusqu'à mi-novembre");
    expect(hint({ kind: 'sowIndoors' })).toBe("À semer sous abri jusqu'à fin novembre");
  });

  it("une fenêtre qui s'ouvre à la prochaine quinzaine dit à partir de quand", () => {
    expect(hint({ range: { from: 'Nov2', to: 'Dec1' }, opensIn: 1 })).toBe('À planter à partir de mi-novembre');
    expect(hint({ range: { from: 'Apr1', to: 'May2' }, opensIn: 1 })).toBe("À planter à partir d'avril");
  });

  it('une fenêtre plus lointaine dit sa période', () => {
    const later = (kind: PlantingKind, from: FortnightRange['from'], to: FortnightRange['to']) =>
      hint({ kind, range: { from, to }, opensIn: 6 });

    expect(later('sowIndoors', 'Feb1', 'Mar2')).toBe('Semis sous abri de février à mars');
    expect(later('sowOutdoors', 'Apr1', 'May2')).toBe("Semis en place d'avril à mai");
    expect(later('plant', 'Apr2', 'May1')).toBe('Plantation de mi-avril à mi-mai');
    expect(later('plant', 'Aug1', 'Oct2')).toBe("Plantation d'août à octobre");
    expect(later('plant', 'Mar1', 'Mar2')).toBe('Plantation en mars');
    expect(later('plant', 'Mar1', 'Mar1')).toBe('Plantation début mars');
    expect(later('plant', 'Mar2', 'Mar2')).toBe('Plantation fin mars');
  });
});

describe('le titre des suggestions', () => {
  it("nomme le type d'espace", () => {
    expect(suggestionsTitle('VegetableGarden')).toBe('Pour le potager');
    expect(suggestionsTitle('Greenhouse')).toBe('Pour la serre');
    expect(suggestionsTitle('Orchard')).toBe('Pour le verger');
    expect(suggestionsTitle('SmallFruit')).toBe('Pour les petits fruits');
  });
});
