import { project, unproject, type Point } from '@/map/scene';
import { SLOT_KEYS, slotAt } from '@/map/layouts';
import { terracedLongScene, WORLD } from '@/map/terraced-long';

describe('scène terraced-long', () => {
  it.each(['light', 'dark'] as const)('dessine tous les emplacements en mode %s', (scheme) => {
    const scene = terracedLongScene(scheme);

    expect(scene.parts.flatMap((part) => part.shapes).length).toBeGreaterThan(500);
    expect(Object.keys(scene.slots).sort()).toEqual([...SLOT_KEYS].sort());
  });

  it.each([
    ['orchard', [1.7, 5.4, 0]],
    ['small-fruit', [7.05, 7.8, 0.4]],
    ['vegetable', [4.0, 19.65, 0]],
    ['bed-1', [2.25, 18.3, 0.4]],
    ['bed-2', [5.75, 18.3, 0.4]],
    ['bed-3', [2.25, 21.0, 0.4]],
    ['bed-4', [5.75, 21.0, 0.4]],
    ['greenhouse', [6.1, 14.2, 1.0]],
    ['firewood', [1.65, 24.0, 1.4]],
  ] as const)('reconnaît un toucher sur %s', (key, [x, y, z]) => {
    expect(slotAt(terracedLongScene('light'), project(x, y, z))).toBe(key);
  });

  it('ignore le décor', () => {
    const scene = terracedLongScene('light');

    expect(slotAt(scene, project(4, -3, 5))).toBeNull();
    expect(slotAt(scene, project(4, 1.5, 0))).toBeNull();
    expect(slotAt(scene, project(-1.6, 13.2, 0))).toBeNull();
  });

  it("couvre de décor tout ce qu'on peut atteindre en se déplaçant", () => {
    const { minX, minY, maxX, maxY } = terracedLongScene('light').limits;

    for (const corner of [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]] satisfies Point[]) {
      const [x, y] = unproject(corner);
      expect(x).toBeGreaterThanOrEqual(WORLD.x0);
      expect(x).toBeLessThanOrEqual(WORLD.x1);
      expect(y).toBeGreaterThanOrEqual(WORLD.y0);
      expect(y).toBeLessThanOrEqual(WORLD.y1);
    }
  });
});
