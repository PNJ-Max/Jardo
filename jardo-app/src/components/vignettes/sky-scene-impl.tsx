import { BlurMask, Canvas, Circle, createPicture, Group, LinearGradient, Picture, Rect, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { drawShapes } from '@/components/map/skia-scene-impl';
import type { Bounds } from '@/map/scene';
import { useTheme } from '@/theme';

import { horizonDrawing, type VignetteDrawing, type VignetteScheme } from './scenes';

export type SkySceneProps = {
  width: number;
  height: number;
  /** Hauteur réservée à l'horizon, en bas. */
  horizonHeight: number;
};

const toPicture = ({ shapes, bounds: { minX, minY, maxX, maxY } }: VignetteDrawing) =>
  createPicture((canvas) => drawShapes(canvas, shapes), Skia.XYWHRect(minX, minY, maxX - minX, maxY - minY));

const cache = new Map<VignetteScheme, { scene: SkPicture; fireflies: SkPicture | null; bounds: Bounds }>();

function horizon(scheme: VignetteScheme) {
  let entry = cache.get(scheme);
  if (!entry) {
    const { scene, fireflies } = horizonDrawing(scheme);
    entry = { scene: toPicture(scene), fireflies: fireflies && toPicture(fireflies), bounds: scene.bounds };
    cache.set(scheme, entry);
  }
  return entry;
}

const fireflyCycleMs = 3400;

/** Le ciel du jour : fondu de `skyTop` vers le fond, soleil le jour, horizon du jardin en bas, lucioles la nuit. */
export default function SkyScene({ width, height, horizonHeight }: SkySceneProps) {
  const { scheme, colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const { scene, fireflies, bounds } = horizon(scheme);
  const sceneWidth = bounds.maxX - bounds.minX;
  const sceneHeight = bounds.maxY - bounds.minY;
  const scale = Math.min((width - 16) / sceneWidth, horizonHeight / sceneHeight);
  const x = width - 8 - sceneWidth * scale - bounds.minX * scale;
  const y = height - sceneHeight * scale - bounds.minY * scale;

  const blink = useSharedValue(1);
  useEffect(() => {
    if (!fireflies || reduceMotion) return;
    blink.set(withRepeat(withTiming(0.2, { duration: fireflyCycleMs / 2, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [blink, fireflies, reduceMotion]);
  const fireflyOpacity = useDerivedValue(() => blink.get());

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 0, y: height }} colors={[colors.skyTop, colors.background]} />
      </Rect>
      {!fireflies && (
        <Group>
          <Circle cx={width - 44} cy={height - horizonHeight - 18} r={30} color={colors.glow} opacity={0.35}>
            <BlurMask blur={12} style="normal" />
          </Circle>
          <Circle cx={width - 44} cy={height - horizonHeight - 18} r={15} color={colors.glow} />
        </Group>
      )}
      <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
        <Picture picture={scene} />
        {fireflies && (
          <Group opacity={fireflyOpacity}>
            <Picture picture={fireflies} />
          </Group>
        )}
      </Group>
    </Canvas>
  );
}
