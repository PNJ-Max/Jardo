import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { slotAt, ZONE_SLOTS, type Scene, type SlotKey } from '@/map/layouts';
import type { Point } from '@/map/scene';
import { createStyles } from '@/theme';

import { SkiaScene } from './skia-scene';
import type { LiveView } from './skia-scene-impl';

type SceneView = { scale: number; x: number; y: number };

const MAX_ZOOM = 5;
/** Le cadrage de départ remplit la largeur, quitte à rogner un peu les coins du jardin. */
const FIT_OVERFLOW = 1.1;
/** Les étiquettes des carrés n'apparaissent qu'à partir de ce zoom (étude de la carte). */
const ZONE_LABEL_ZOOM = 1.45;

type Size = { width: number; height: number };

function fitView(scene: Scene, { width, height }: Size): SceneView {
  const { minX, minY, maxX, maxY } = scene.focus;
  const scale = Math.min((width / (maxX - minX)) * FIT_OVERFLOW, height / (maxY - minY));
  return { scale, x: width / 2 - scale * ((minX + maxX) / 2), y: height / 2 - scale * ((minY + maxY) / 2) };
}

type MapViewportProps = {
  scene: Scene;
  /** Nom affiché sur chaque emplacement occupé. */
  labels: Partial<Record<SlotKey, string>>;
  /** Emplacements libres : dessinés en retrait. */
  free: SlotKey[];
  selected: SlotKey | null;
  onSelect: (key: SlotKey | null) => void;
  /** Change de valeur pour demander un recentrage. */
  recenter: number;
};

/**
 * Cadre de la carte : pincer pour zoomer, glisser pour se déplacer, double-toucher pour zoomer,
 * toucher pour sélectionner. La vue vit dans des valeurs partagées : Skia redessine la scène à
 * chaque image sur le thread UI, sans repasser par React.
 */
export function MapViewport({ scene, labels, free, selected, onSelect, recenter }: MapViewportProps) {
  const [size, setSize] = useState<Size | null>(null);
  const fit = useMemo(() => (size ? fitView(scene, size) : null), [scene, size]);
  const muted = useMemo<Point[][]>(() => free.map((key) => scene.slots[key].hit), [scene, free]);

  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0, focalX: 0, focalY: 0 });

  // Au premier affichage, la scène est cadrée d'emblée ; ensuite, le recentrage est animé.
  const framed = useRef(false);
  useEffect(() => {
    if (!fit) return;
    const duration = framed.current ? 280 : 0;
    framed.current = true;
    scale.set(withTiming(fit.scale, { duration }));
    x.set(withTiming(fit.x, { duration }));
    y.set(withTiming(fit.y, { duration }));
  }, [fit, recenter, scale, x, y]);

  const select = useCallback(
    (sceneX: number, sceneY: number) => onSelect(slotAt(scene, [sceneX, sceneY])),
    [scene, onSelect],
  );

  const gesture = useMemo(() => {
    const { minX, minY, maxX, maxY } = scene.limits;
    const width = size?.width ?? 0;
    const height = size?.height ?? 0;
    // On ne dézoome pas au-delà des limites : l'écran reste couvert.
    const minScale = Math.max(width / (maxX - minX), height / (maxY - minY));
    const maxScale = (fit?.scale ?? 1) * MAX_ZOOM;

    // L'écran reste couvert par le dessin ; s'il est plus petit, il est centré.
    const limit = (t: number, lo: number, hi: number) => {
      'worklet';
      return lo > hi ? (lo + hi) / 2 : Math.min(Math.max(t, lo), hi);
    };
    const clamp = (s: number, nx: number, ny: number) => {
      'worklet';
      return { s, cx: limit(nx, width - s * maxX, -s * minX), cy: limit(ny, height - s * maxY, -s * minY) };
    };
    const zoomAround = (factor: number, fx: number, fy: number, from: SceneView) => {
      'worklet';
      const s = Math.min(Math.max(from.scale * factor, minScale), maxScale);
      const k = s / from.scale;
      return clamp(s, fx - (fx - from.x) * k, fy - (fy - from.y) * k);
    };
    const current = () => {
      'worklet';
      return { scale: scale.get(), x: x.get(), y: y.get() };
    };
    const apply = ({ s, cx, cy }: { s: number; cx: number; cy: number }, duration = 0) => {
      'worklet';
      scale.set(duration ? withTiming(s, { duration }) : s);
      x.set(duration ? withTiming(cx, { duration }) : cx);
      y.set(duration ? withTiming(cy, { duration }) : cy);
    };

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        start.set({ ...current(), focalX: e.focalX, focalY: e.focalY });
      })
      .onUpdate((e) => {
        const from = start.get();
        const zoomed = zoomAround(e.scale, from.focalX, from.focalY, from);
        // Le point focal suit les doigts : on ajoute son déplacement depuis le début du geste.
        apply(clamp(zoomed.s, zoomed.cx + e.focalX - from.focalX, zoomed.cy + e.focalY - from.focalY));
      });

    const pan = Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .onStart(() => {
        start.set({ ...start.get(), x: x.get(), y: y.get() });
      })
      .onUpdate((e) => {
        apply(clamp(scale.get(), start.get().x + e.translationX, start.get().y + e.translationY));
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((e) => apply(zoomAround(2, e.x, e.y, current()), 220));

    const tap = Gesture.Tap().onEnd((e) => {
      scheduleOnRN(select, (e.x - x.get()) / scale.get(), (e.y - y.get()) / scale.get());
    });

    return Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(doubleTap, tap));
  }, [scene, size, fit, scale, x, y, start, select]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  };

  return (
    <View style={[styles.frame, styles.clip, { backgroundColor: scene.background }]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.frame} onLayout={onLayout} collapsable={false}>
          {size && (
            <SkiaScene
              scene={scene}
              size={size}
              view={{ scale, x, y }}
              muted={muted}
              outline={selected ? scene.slots[selected].outline : null}
            />
          )}
        </View>
      </GestureDetector>
      {fit && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {(Object.entries(labels) as [SlotKey, string][]).map(([key, text]) => (
            <MapLabel
              key={key}
              text={text}
              anchor={scene.slots[key].anchor}
              minScale={ZONE_SLOTS.includes(key) ? fit.scale * ZONE_LABEL_ZOOM : 0}
              view={{ scale, x, y }}
              selected={selected === key}
              onPress={() => onSelect(key)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const LABEL_WIDTH = 180;
const LABEL_HEIGHT = 40;

type MapLabelProps = {
  text: string;
  anchor: [number, number];
  /** Échelle en dessous de laquelle l'étiquette est cachée. */
  minScale: number;
  view: LiveView;
  selected: boolean;
  onPress: () => void;
};

/** Étiquette d'un emplacement, de taille fixe, dont la pointe suit la carte. */
function MapLabel({ text, anchor, minScale, view, selected, onPress }: MapLabelProps) {
  const styles = useLabelStyles();
  const animatedStyle = useAnimatedStyle(() => {
    const s = view.scale.get();
    const shown = s >= minScale;
    return {
      opacity: shown ? 1 : 0,
      transform: [
        { translateX: anchor[0] * s + view.x.get() - LABEL_WIDTH / 2 },
        { translateY: anchor[1] * s + view.y.get() - LABEL_HEIGHT },
        { scale: shown ? 1 : 0 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.label, animatedStyle]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${text}`}
        style={[styles.pill, selected && styles.pillSelected]}>
        <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
          {text}
        </Text>
      </Pressable>
      <View style={[styles.tip, selected && styles.tipSelected]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  // Sur le web, un conteneur overflow: hidden défile quand une étiquette qui dépasse reçoit le
  // focus, et décale toute la carte ; overflow: clip rogne sans jamais défiler.
  clip: Platform.OS === 'web' ? ({ overflow: 'clip' } as unknown as ViewStyle) : {},
});

const useLabelStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  label: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.caption, fontFamily: fonts.bodySemiBold, color: colors.text },
  textSelected: { color: colors.primaryText },
  tip: {
    width: 8,
    height: 8,
    marginTop: -5,
    marginBottom: 1,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
}));
