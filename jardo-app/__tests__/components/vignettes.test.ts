import { vignetteDrawing } from '@/components/vignettes/scenes';
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
