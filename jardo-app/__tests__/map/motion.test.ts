import { countryHouseScene } from '@/map/country-house';
import { SLOT_KEYS, type Scene } from '@/map/layouts';
import {
  BOUNCE_DURATION,
  BOUNCE_LEAD,
  bounceAt,
  FIREFLY_DRIFT,
  FIREFLY_REST,
  fireflyAt,
  swayAt,
  swayOf,
  type Sway,
} from '@/map/motion';
import { Painter } from '@/map/scene';
import { terracedLongScene } from '@/map/terraced-long';

const times = Array.from({ length: 400 }, (_, i) => i * 97);
const sways = (scene: Scene) => scene.parts.flatMap((part) => (part.sway ? [part.sway] : []));

describe('balancement des feuillages', () => {
  const sway = swayOf([120, 340], 0.05);

  it("reste dans son amplitude et s'en approche", () => {
    const skews = times.map((t) => swayAt(sway, t));

    expect(Math.max(...skews.map(Math.abs))).toBeLessThanOrEqual(0.05);
    expect(Math.max(...skews)).toBeGreaterThan(0.025);
    expect(Math.min(...skews)).toBeLessThan(-0.025);
  });

  it('décale la phase et la période de chaque feuillage', () => {
    const a = swayOf([120, 340], 0.05);
    const b = swayOf([128, 352], 0.05);

    expect(a.phase).not.toBeCloseTo(b.phase);
    expect(a.period).not.toBeCloseTo(b.period);
    expect(times.filter((t) => Math.sign(swayAt(a, t)) !== Math.sign(swayAt(b, t))).length).toBeGreaterThan(40);
  });

  it("donne une phase reproductible d'un lancement à l'autre", () => {
    expect(swayOf([120, 340], 0.05)).toEqual(sway);
  });

  it('balance arbres et buissons, chacun à son rythme', () => {
    const all = sways(countryHouseScene('light'));
    const phases = new Set(all.map((s: Sway) => s.phase.toFixed(3)));

    expect(all.length).toBeGreaterThan(20);
    expect(phases.size).toBe(all.length);
    for (const s of all) {
      expect(s.amplitude).toBeGreaterThan(0);
      expect(s.amplitude).toBeLessThan(0.25);
    }
  });
});

describe('lucioles', () => {
  it('flottent autour de leur place et clignotent', () => {
    const poses = times.map((t) => fireflyAt([300, 500], t));

    for (const { x, y, opacity } of poses) {
      expect(Math.abs(x - 300)).toBeLessThanOrEqual(FIREFLY_DRIFT);
      expect(Math.abs(y - 500)).toBeLessThanOrEqual(FIREFLY_DRIFT);
      expect(opacity).toBeGreaterThanOrEqual(0.15);
      expect(opacity).toBeLessThanOrEqual(1);
    }
    expect(Math.min(...poses.map((p) => p.opacity))).toBeLessThan(0.3);
    expect(Math.max(...poses.map((p) => p.opacity))).toBeGreaterThan(0.9);
  });

  it('ne bougent pas ensemble', () => {
    expect(fireflyAt([300, 500], 5000).x - 300).not.toBeCloseTo(fireflyAt([420, 260], 5000).x - 420);
  });

  it.each([
    ['country-house', countryHouseScene],
    ['terraced-long', terracedLongScene],
  ])("n'apparaissent que la nuit (%s)", (_, sceneOf) => {
    expect(sceneOf('light').fireflies).toEqual([]);
    expect(sceneOf('dark').fireflies.length).toBeGreaterThan(5);
  });
});

describe('rebond au toucher', () => {
  it('monte vite, culmine quand la navigation part, puis revient au repos', () => {
    expect(bounceAt(0)).toBe(1);
    expect(bounceAt(BOUNCE_LEAD / 2)).toBeGreaterThan(1);
    expect(bounceAt(BOUNCE_LEAD)).toBeCloseTo(1.06);
    for (let t = 0; t <= BOUNCE_DURATION; t += 10) expect(bounceAt(t)).toBeLessThanOrEqual(1.06 + 1e-9);
    expect(bounceAt(BOUNCE_DURATION)).toBe(1);
    expect(bounceAt(BOUNCE_DURATION + 500)).toBe(1);
  });

  it('reste discret et rapide', () => {
    expect(BOUNCE_LEAD).toBeLessThanOrEqual(100);
    expect(BOUNCE_DURATION).toBeLessThanOrEqual(400);
  });

  it.each([
    ['country-house', countryHouseScene],
    ['terraced-long', terracedLongScene],
  ])('fait rebondir le dessin de chaque emplacement (%s)', (_, sceneOf) => {
    const tags = new Set(sceneOf('light').parts.flatMap((part) => part.tags ?? []));

    expect([...tags].sort()).toEqual([...SLOT_KEYS].sort());
  });
});

describe('animations réduites', () => {
  it('laissent la carte immobile', () => {
    for (const sway of sways(countryHouseScene('dark'))) expect(swayAt(sway, null)).toBe(0);
    expect(fireflyAt([300, 500], null)).toEqual({ x: 300, y: 500, opacity: FIREFLY_REST });
    expect(bounceAt(null)).toBe(1);
  });
});

describe('scène en tranches', () => {
  it("garde l'ordre d'affichage et regroupe le décor fixe", () => {
    const p = new Painter('#000000', '#000000');
    const box = (z: number) => () => p.box(0, 0, z, 1, 1, z + 1, '#808080');
    p.object(3, box(3));
    p.object(1, box(1), 0, { x: 0, y: 0, height: 2, reach: 0.1 });
    p.within('orchard', () => p.object(2, box(2)));
    p.object(4, box(4));
    p.object(0, box(0));

    const { parts } = p.parts();

    expect(parts.flatMap((part) => part.shapes)).toEqual(p.shapes().shapes);
    expect(parts.map((part) => [!!part.sway, part.tags ?? []])).toEqual([
      [false, []],
      [true, []],
      [false, ['orchard']],
      [false, []],
    ]);
  });
});
