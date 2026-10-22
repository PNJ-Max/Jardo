import { memo, useEffect, useMemo } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, Polygon, RadialGradient, Stop } from 'react-native-svg';

import type { Scene } from '@/map/layouts';
import type { Point, Shape } from '@/map/scene';
import { useTheme } from '@/theme';

/** Passage de la scène à l'écran : écran = scène × scale + (x, y). */
export type SceneView = { scale: number; x: number; y: number };

export type LiveView = { scale: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };

type SvgSceneProps = {
  scene: Scene;
  size: { width: number; height: number };
  /** La vue courante, animée sur le thread UI. */
  view: LiveView;
  /** La vue à laquelle la scène est dessinée : celle de la fin du dernier geste. */
  committed: SceneView;
  /** Contour de l'emplacement sélectionné. */
  outline: Point[] | null;
};

const gradientId = (color: string) => `glow-${color.slice(1)}`;

/**
 * Rendu react-native-svg. Sur Android, la vue SVG est dessinée dans une image à sa taille :
 * l'agrandir par une transformation la rendrait floue. Pendant un geste, la vue entière est
 * transformée (rapide) ; à la fin, la scène est redessinée à la nouvelle échelle (nette).
 */
export function SvgScene({ scene, size, view, committed, outline }: SvgSceneProps) {
  const { colors } = useTheme();
  const drawn = useSharedValue(committed);

  useEffect(() => {
    drawn.set(committed);
  }, [committed, drawn]);

  const animatedStyle = useAnimatedStyle(() => {
    const c = drawn.get();
    const k = view.scale.get() / c.scale;
    return {
      transform: [{ translateX: view.x.get() - k * c.x }, { translateY: view.y.get() - k * c.y }, { scale: k }],
    };
  });

  return (
    <Animated.View style={[{ width: size.width, height: size.height, transformOrigin: 'left top' }, animatedStyle]}>
      <Svg width={size.width} height={size.height}>
        <G transform={`translate(${committed.x} ${committed.y}) scale(${committed.scale})`}>
          <SvgShapes shapes={scene.shapes} />
          {outline && (
            <Polygon
              points={outline.map((p) => p.join(',')).join(' ')}
              fill={colors.primary}
              fillOpacity={0.25}
              stroke={colors.primary}
              strokeWidth={3 / committed.scale}
              strokeLinejoin="round"
            />
          )}
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Les formes ne changent qu'avec la scène : React ne les compare pas à chaque geste. */
const SvgShapes = memo(function SvgShapes({ shapes }: { shapes: Shape[] }) {
  const glowColors = useMemo(
    () => [...new Set(shapes.flatMap((s) => (s.kind === 'glow' ? [s.color] : [])))],
    [shapes],
  );

  return (
    <>
      <Defs>
        {glowColors.map((color) => (
          <RadialGradient key={color} id={gradientId(color)}>
            <Stop offset="0" stopColor={color} stopOpacity={0.6} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {shapes.map((shape, i) => {
        switch (shape.kind) {
          case 'polygon':
            return (
              <Polygon
                key={i}
                points={pointsAttribute(shape.points)}
                fill={shape.fill ?? 'none'}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                strokeLinejoin="round"
                opacity={shape.opacity}
              />
            );
          case 'circle':
            return (
              <Circle
                key={i}
                cx={shape.cx}
                cy={shape.cy}
                r={shape.r}
                fill={shape.fill}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                opacity={shape.opacity}
              />
            );
          case 'line':
            return (
              <Line
                key={i}
                x1={shape.x1}
                y1={shape.y1}
                x2={shape.x2}
                y2={shape.y2}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                strokeLinecap="round"
                opacity={shape.opacity}
              />
            );
          case 'glow':
            return (
              <Ellipse
                key={i}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
                fill={`url(#${gradientId(shape.color)})`}
                opacity={shape.opacity}
              />
            );
        }
      })}
    </>
  );
});

function pointsAttribute(points: number[]) {
  let out = '';
  for (let i = 0; i < points.length; i += 2) {
    out += `${i ? ' ' : ''}${points[i].toFixed(1)},${points[i + 1].toFixed(1)}`;
  }
  return out;
}
