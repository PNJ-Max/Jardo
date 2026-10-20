import type { SharedValue } from 'react-native-reanimated';

import type { Point } from '@/map/scene';
import type { Scene } from '@/map/terraced-long';

import { SkiaScene } from './skia-scene';
import { SvgScene } from './svg-scene';

/** Passage de la scène à l'écran : écran = scène × scale + (x, y). */
export type SceneView = { scale: number; x: number; y: number };

export type SceneRendererProps = {
  scene: Scene;
  size: { width: number; height: number };
  /** La vue courante, animée sur le thread UI. */
  view: { scale: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };
  /** La vue à la fin du dernier geste. */
  committed: SceneView;
  /** Emprise de l'emplacement sélectionné. */
  outline: Point[] | null;
};

export function SceneRenderer({ engine, ...props }: SceneRendererProps & { engine: 'svg' | 'skia' }) {
  return engine === 'skia' ? <SkiaScene {...props} /> : <SvgScene {...props} />;
}
