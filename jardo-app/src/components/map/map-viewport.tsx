import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { slotAt, type Scene, type SlotKey } from '@/map/terraced-long';

import { SceneRenderer, type SceneView } from './scene-renderer';

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 5;
const MARGIN = 12;

type Size = { width: number; height: number };

function fitView(scene: Scene, { width, height }: Size): SceneView {
  const { minX, minY, maxX, maxY } = scene.bounds;
  const scale = Math.min((width - 2 * MARGIN) / (maxX - minX), (height - 2 * MARGIN) / (maxY - minY));
  return { scale, x: width / 2 - scale * ((minX + maxX) / 2), y: height / 2 - scale * ((minY + maxY) / 2) };
}

type MapViewportProps = {
  scene: Scene;
  engine: 'svg' | 'skia';
  selected: SlotKey | null;
  onSelect: (key: SlotKey | null) => void;
  /** Change de valeur pour demander un recentrage. */
  recenter: number;
};

/**
 * Cadre de la carte : pincer pour zoomer, glisser pour se déplacer, double-toucher pour zoomer,
 * toucher pour sélectionner. La vue vit dans des valeurs partagées (thread UI) ; `drawn` est la
 * vue à laquelle le rendu SVG a dessiné la scène, mise à jour à la fin de chaque geste pour
 * rester net.
 */
export function MapViewport({ scene, engine, selected, onSelect, recenter }: MapViewportProps) {
  const [size, setSize] = useState<Size | null>(null);
  const fit = useMemo(() => (size ? fitView(scene, size) : null), [scene, size]);
  // Une vue enregistrée après un recentrage ou un changement de cadre est périmée.
  const frame = `${fit?.scale}:${fit?.x}:${fit?.y}:${recenter}`;
  const [committed, setCommitted] = useState<{ frame: string; view: SceneView } | null>(null);
  const drawn = committed?.frame === frame ? committed.view : fit;

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

  const commit = useCallback(
    (view: SceneView) => setCommitted({ frame, view }),
    [frame],
  );

  const select = useCallback(
    (sceneX: number, sceneY: number) => onSelect(slotAt(scene, [sceneX, sceneY])),
    [scene, onSelect],
  );

  const gesture = useMemo(() => {
    const { minX, minY, maxX, maxY } = scene.bounds;
    const width = size?.width ?? 0;
    const height = size?.height ?? 0;
    const minScale = (fit?.scale ?? 1) * MIN_ZOOM;
    const maxScale = (fit?.scale ?? 1) * MAX_ZOOM;

    // Garde le centre de l'écran sur la scène.
    const clamp = (s: number, nx: number, ny: number) => {
      'worklet';
      return {
        s,
        cx: Math.min(Math.max(nx, width / 2 - s * maxX), width / 2 - s * minX),
        cy: Math.min(Math.max(ny, height / 2 - s * maxY), height / 2 - s * minY),
      };
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
      })
      .onEnd(() => scheduleOnRN(commit, current()));

    const pan = Gesture.Pan()
      .averageTouches(true)
      .onStart(() => {
        start.set({ ...start.get(), x: x.get(), y: y.get() });
      })
      .onUpdate((e) => {
        apply(clamp(scale.get(), start.get().x + e.translationX, start.get().y + e.translationY));
      })
      .onEnd(() => scheduleOnRN(commit, current()));

    // La vue d'arrivée est dessinée tout de suite : pendant l'animation, la transformation fait le lien.
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((e) => {
        const target = zoomAround(2, e.x, e.y, current());
        apply(target, 220);
        scheduleOnRN(commit, { scale: target.s, x: target.cx, y: target.cy });
      });

    const tap = Gesture.Tap().onEnd((e) => {
      scheduleOnRN(select, (e.x - x.get()) / scale.get(), (e.y - y.get()) / scale.get());
    });

    return Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(doubleTap, tap));
  }, [scene, size, fit, scale, x, y, start, commit, select]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.frame} onLayout={onLayout} collapsable={false}>
        {size && drawn && (
          <SceneRenderer
            engine={engine}
            scene={scene}
            size={size}
            view={{ scale, x, y }}
            committed={drawn}
            outline={selected ? scene.slots[selected].outline : null}
          />
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
});
