import { horizonDrawing, vignetteDrawing } from '@/components/vignettes/scenes';
import { spaceKinds } from '@/domain/types';

describe("vignettes d'espace", () => {
  it.each(spaceKinds.flatMap((kind) => [[kind, 'light'], [kind, 'dark']] as const))('dessine %s en mode %s', (kind, scheme) => {
    const { shapes, bounds } = vignetteDrawing(kind, scheme);

    expect(shapes.length).toBeGreaterThan(20);
    for (const value of Object.values(bounds)) expect(Number.isFinite(value)).toBe(true);
  });

  it('passe de nuit en mode sombre', () => {
    const fill = (scheme: 'light' | 'dark') => {
      const first = vignetteDrawing('Orchard', scheme).shapes[0];
      return first.kind === 'polygon' ? first.fill : null;
    };

    expect(fill('dark')).not.toBe(fill('light'));
  });
});

describe('jardin au repos', () => {
  it('allume la lampe la nuit seulement', () => {
    const glows = (scheme: 'light' | 'dark') => vignetteDrawing('Resting', scheme).shapes.filter((s) => s.kind === 'glow');

    expect(glows('light')).toHaveLength(0);
    expect(glows('dark').length).toBeGreaterThan(0);
  });
});

describe("horizon du ciel d'Aujourd'hui", () => {
  it('dessine le jardin de jour, sans lucioles', () => {
    const { scene, fireflies } = horizonDrawing('light');

    expect(scene.shapes.length).toBeGreaterThan(50);
    expect(fireflies).toBeNull();
  });

  it('allume les lucioles la nuit, à part pour clignoter', () => {
    const { fireflies } = horizonDrawing('dark');

    expect(fireflies?.shapes.length).toBeGreaterThan(0);
  });
});
