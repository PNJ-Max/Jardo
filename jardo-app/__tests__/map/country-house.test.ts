import { countryHouseScene, WORLD } from '@/map/country-house';
import { SLOT_KEYS, slotAt } from '@/map/layouts';
import { project, unproject, type Point } from '@/map/scene';

describe('scène country-house', () => {
  it.each(['light', 'dark'] as const)('dessine tous les emplacements en mode %s', (scheme) => {
    const scene = countryHouseScene(scheme);

    expect(scene.shapes.length).toBeGreaterThan(500);
    expect(Object.keys(scene.slots).sort()).toEqual([...SLOT_KEYS].sort());
  });

  it.each([
    ['orchard', [4.2, 12.0, 0]],
    ['small-fruit', [16.9, 17, 0.4]],
    ['vegetable', [5.1, 25.4, 0]],
    ['bed-1', [3.3, 24, 0.4]],
    ['bed-2', [6.9, 24, 0.4]],
    ['bed-3', [3.3, 26.8, 0.4]],
    ['bed-4', [6.9, 26.8, 0.4]],
    ['greenhouse', [12.6, 25, 1.0]],
    ['firewood', [15.85, 10.9, 1.4]],
  ] as const)('reconnaît un toucher sur %s', (key, [x, y, z]) => {
    expect(slotAt(countryHouseScene('light'), project(x, y, z))).toBe(key);
  });

  it('ignore le décor', () => {
    const scene = countryHouseScene('light');

    expect(slotAt(scene, project(9, 5.5, 5))).toBeNull();
    expect(slotAt(scene, project(5, -4.5, 0))).toBeNull();
    expect(slotAt(scene, project(-10, 15, 0))).toBeNull();
  });

  it("couvre de décor tout ce qu'on peut atteindre en se déplaçant", () => {
    const { minX, minY, maxX, maxY } = countryHouseScene('light').limits;

    for (const corner of [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]] satisfies Point[]) {
      const [x, y] = unproject(corner);
      expect(x).toBeGreaterThanOrEqual(WORLD.x0);
      expect(x).toBeLessThanOrEqual(WORLD.x1);
      expect(y).toBeGreaterThanOrEqual(WORLD.y0);
      expect(y).toBeLessThanOrEqual(WORLD.y1);
    }
  });
});
