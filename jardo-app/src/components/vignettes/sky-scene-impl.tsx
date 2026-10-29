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

import { horizonDrawing, horizonSun, type VignetteDrawing, type VignetteScheme } from './scenes';

export type SkySceneProps = {
  width: number;
  height: number;
  /** Hauteur réservée à l'horizon, en bas. */
  horizonHeight: number;
};

const toPicture = ({ shapes, bounds: { minX, minY, maxX, maxY } }: VignetteDrawing) =>
  createPicture((canvas) => drawShapes(canvas, shapes), Skia.XYWHRect(minX, minY, maxX - minX, maxY - minY));

type Horizon = { ground: SkPicture; groundBottom: number; scene: SkPicture; fireflies: SkPicture | null; bounds: Bounds };

const cache = new Map<VignetteScheme, Horizon>();

function horizon(scheme: VignetteScheme) {
  let entry = cache.get(scheme);
  if (!entry) {
    const { ground, scene, fireflies } = horizonDrawing(scheme);
    entry = {
      ground: toPicture(ground),
      groundBottom: ground.bounds.maxY,
      scene: toPicture(scene),
      fireflies: fireflies && toPicture(fireflies),
      bounds: scene.bounds,
    };
    cache.set(scheme, entry);
  }
  return entry;
}

const fireflyCycleMs = 3400;
const sideMargin = 12;
const groundFade = 16;

/** Le ciel du jour : fondu de `skyTop` vers le fond, soleil le jour, horizon du jardin en bas, lucioles la nuit. */
export default function SkyScene({ width, height, horizonHeight }: SkySceneProps) {
  const { scheme, colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const { ground, groundBottom, scene, fireflies, bounds } = horizon(scheme);
  // Cadré sur les éléments, calés à droite ; la pelouse, plus longue, déborde des deux côtés.
  const scale = Math.min((width - 2 * sideMargin) / (bounds.maxX - bounds.minX), horizonHeight / (groundBottom - bounds.minY));
  const x = width - sideMargin - bounds.maxX * scale;
  const y = height - groundBottom * scale;

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
      <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
        {!fireflies && (
          <Group>
            <Circle cx={horizonSun[0]} cy={horizonSun[1]} r={48} color={colors.glow} opacity={0.35}>
              <BlurMask blur={18} style="normal" />
            </Circle>
            <Circle cx={horizonSun[0]} cy={horizonSun[1]} r={26} color={colors.glow} />
          </Group>
        )}
        <Picture picture={ground} />
        <Picture picture={scene} />
        {fireflies && (
          <Group opacity={fireflyOpacity}>
            <Picture picture={fireflies} />
          </Group>
        )}
      </Group>
      {/* La pelouse se fond dans le fond de l'écran plutôt que de s'arrêter net sur la semaine. */}
      <Rect x={0} y={height - groundFade} width={width} height={groundFade}>
        <LinearGradient
          start={{ x: 0, y: height - groundFade }}
          end={{ x: 0, y: height }}
          colors={[`${colors.background}00`, colors.background]}
        />
      </Rect>
    </Canvas>
  );
}
