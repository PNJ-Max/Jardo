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
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { Scene } from '@/map/layouts';
import type { Point, Shape } from '@/map/scene';
import { useTheme } from '@/theme';

/** La vue courante, animée sur le thread UI : écran = scène × scale + (x, y). */
export type LiveView = { scale: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };

export type SkiaSceneProps = {
  scene: Scene;
  size: { width: number; height: number };
  view: LiveView;
  /** Contour de l'emplacement sélectionné. */
  outline: Point[] | null;
};

/**
 * Rendu Skia : la scène est enregistrée une fois dans une image vectorielle (SkPicture), puis
 * redessinée par le GPU à chaque image avec la matrice de la vue, sans repasser par React.
 */
export default function SkiaScene({ scene, size, view, outline }: SkiaSceneProps) {
  const { colors } = useTheme();
  const picture = useMemo(() => {
    const { minX, minY, maxX, maxY } = scene.bounds;
    return createPicture((canvas) => drawShapes(canvas, scene.shapes), Skia.XYWHRect(minX, minY, maxX - minX, maxY - minY));
  }, [scene]);
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
        <Picture picture={picture} />
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

function drawShapes(canvas: SkCanvas, shapes: Shape[]) {
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
