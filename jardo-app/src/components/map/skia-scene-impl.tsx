import {
  Canvas,
  createPicture,
  Group,
  Path,
  Picture,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
} from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { fireflyShapes } from '@/map/decor';
import type { Scene, SlotKey } from '@/map/layouts';
import { bounceAt, fireflyAt, swayAt } from '@/map/motion';
import { UNIT, type Point, type Shape } from '@/map/scene';
import { useTheme } from '@/theme';

/** La vue courante, animée sur le thread UI : écran = scène × scale + (x, y). */
export type LiveView = { scale: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };

/** Le rebond en cours : l'emplacement touché et le temps écoulé depuis le toucher, en ms. */
export type LiveBounce = { slot: SharedValue<SlotKey | null>; elapsed: SharedValue<number> };

export type SkiaSceneProps = {
  scene: Scene;
  size: { width: number; height: number };
  view: LiveView;
  bounce: LiveBounce;
  /** Silhouettes des emplacements libres, voilées pour rester discrètes. */
  muted: Point[][];
  /** Contour de l'emplacement sélectionné. */
  outline: Point[] | null;
};

/** Le balancement et les lucioles sont lents : 30 images par seconde leur suffisent. */
const MOTION_FRAME_MS = 1000 / 30;
const FIREFLY_RADIUS = 0.3 * UNIT;
const FIREFLY_BOUNDS = Skia.XYWHRect(-FIREFLY_RADIUS, -FIREFLY_RADIUS, 2 * FIREFLY_RADIUS, 2 * FIREFLY_RADIUS);

/**
 * Rendu Skia : la scène est enregistrée une fois, en tranches (SkPicture), puis redessinée par
 * le GPU à chaque image avec la matrice de la vue, sans repasser par React. Les tranches animées
 * (feuillages, emplacement touché) et les lucioles ne reçoivent qu'une transformation par image :
 * l'image de chaque image ne fait que rejouer les tranches enregistrées.
 */
export default function SkiaScene({ scene, size, view, bounce, muted, outline }: SkiaSceneProps) {
  const { colors } = useTheme();
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();

  const { layers, pivots, bounds } = useMemo(() => {
    const { minX, minY, maxX, maxY } = scene.bounds;
    const rect = Skia.XYWHRect(minX, minY, maxX - minX, maxY - minY);
    return {
      layers: scene.parts.map((part) => ({
        picture: createPicture((canvas) => drawShapes(canvas, part.shapes), rect),
        sway: part.sway ?? null,
        tags: part.tags ?? [],
      })),
      pivots: Object.fromEntries(Object.entries(scene.slots).map(([key, slot]) => [key, slot.pivot])) as Record<SlotKey, Point>,
      bounds: rect,
    };
  }, [scene]);
  const firefly = useMemo(() => createPicture((canvas) => drawShapes(canvas, fireflyShapes()), FIREFLY_BOUNDS), []);
  const fireflies = scene.fireflies;

  // Horloge des animations, coupée quand l'onglet n'est pas affiché ou que l'appareil réduit les animations.
  const clock = useSharedValue(0);
  const ticker = useFrameCallback(({ timestamp }) => {
    if (timestamp - clock.get() >= MOTION_FRAME_MS) clock.set(timestamp);
  }, false);
  const still = reduceMotion;
  useEffect(() => {
    ticker.setActive(focused && !still);
  }, [ticker, focused, still]);

  const frame = useDerivedValue(() => {
    const time = still ? null : clock.get();
    const slot = bounce.slot.get();
    const lift = slot === null ? 1 : bounceAt(still ? null : bounce.elapsed.get());
    return createPicture((canvas) => {
      for (const { picture, sway, tags } of layers) {
        const skew = sway ? swayAt(sway, time) : 0;
        const scale = lift !== 1 && slot !== null && tags.includes(slot) ? lift : 1;
        if (skew === 0 && scale === 1) {
          canvas.drawPicture(picture);
          continue;
        }
        canvas.save();
        if (scale !== 1 && slot !== null) {
          const [px, py] = pivots[slot];
          canvas.translate(px, py);
          canvas.scale(scale, scale);
          canvas.translate(-px, -py);
        }
        if (sway && skew !== 0) {
          const [px, py] = sway.pivot;
          canvas.translate(px, py);
          canvas.skew(skew, 0);
          canvas.translate(-px, -py);
        }
        canvas.drawPicture(picture);
        canvas.restore();
      }
      if (fireflies.length === 0) return;
      const glow = Skia.Paint();
      for (const spot of fireflies) {
        const { x, y, opacity } = fireflyAt(spot, time);
        glow.setAlphaf(opacity);
        canvas.save();
        canvas.translate(x, y);
        canvas.saveLayer(glow, FIREFLY_BOUNDS);
        canvas.drawPicture(firefly);
        canvas.restore();
        canvas.restore();
      }
    }, bounds);
  });

  const mutedPaths = useMemo(() => muted.map((points) => polygonPath(points.flat())), [muted]);
  const outlinePath = useMemo(() => (outline ? polygonPath(outline.flat()) : null), [outline]);

  const transform = useDerivedValue(() => [
    { translateX: view.x.get() },
    { translateY: view.y.get() },
    { scale: view.scale.get() },
  ]);
  const strokeWidth = useDerivedValue(() => 3 / view.scale.get());

  return (
    <Canvas style={{ width: size.width, height: size.height }}>
      <Group transform={transform}>
        <Picture picture={frame} />
        {mutedPaths.map((path, i) => (
          <Path key={i} path={path} color={scene.background} opacity={0.55} />
        ))}
        {outlinePath && (
          <>
            <Path path={outlinePath} color={colors.primary} opacity={0.25} />
            <Path path={outlinePath} color={colors.primary} style="stroke" strokeWidth={strokeWidth} strokeJoin="round" />
          </>
        )}
      </Group>
    </Canvas>
  );
}

function polygonPath(points: number[]) {
  const builder = Skia.PathBuilder.Make().moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) builder.lineTo(points[i], points[i + 1]);
  return builder.close().detach();
}

export function drawShapes(canvas: SkCanvas, shapes: Shape[]) {
  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  const stroke = Skia.Paint();
  stroke.setAntiAlias(true);
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeJoin(StrokeJoin.Round);
  stroke.setStrokeCap(StrokeCap.Round);

  const paint = (target: typeof fill, color: string, opacity = 1) => {
    target.setColor(Skia.Color(color));
    target.setAlphaf(opacity);
    return target;
  };

  for (const shape of shapes) {
    switch (shape.kind) {
      case 'polygon': {
        const path = polygonPath(shape.points);
        if (shape.fill) canvas.drawPath(path, paint(fill, shape.fill, shape.opacity));
        if (shape.stroke) {
          stroke.setStrokeWidth(shape.strokeWidth ?? 1);
          canvas.drawPath(path, paint(stroke, shape.stroke, shape.opacity));
        }
        break;
      }
      case 'circle':
        canvas.drawCircle(shape.cx, shape.cy, shape.r, paint(fill, shape.fill, shape.opacity));
        if (shape.stroke) {
          stroke.setStrokeWidth(shape.strokeWidth ?? 1);
          canvas.drawCircle(shape.cx, shape.cy, shape.r, paint(stroke, shape.stroke, shape.opacity));
        }
        break;
      case 'line':
        stroke.setStrokeWidth(shape.strokeWidth);
        canvas.drawLine(shape.x1, shape.y1, shape.x2, shape.y2, paint(stroke, shape.stroke, shape.opacity));
        break;
      case 'glow': {
        const glow = Skia.Paint();
        glow.setAntiAlias(true);
        glow.setAlphaf(shape.opacity);
        const color = (alpha: number) => {
          const c = Skia.Color(shape.color);
          c[3] = alpha;
          return c;
        };
        glow.setShader(
          Skia.Shader.MakeRadialGradient({ x: 0, y: 0 }, shape.rx, [color(0.6), color(0.22), color(0)], [0, 0.45, 1], TileMode.Clamp),
        );
        canvas.save();
        canvas.translate(shape.cx, shape.cy);
        canvas.scale(1, shape.ry / shape.rx);
        canvas.drawCircle(0, 0, shape.rx, glow);
        canvas.restore();
        break;
      }
    }
  }
}
