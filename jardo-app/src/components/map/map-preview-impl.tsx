import { Canvas, createPicture, Group, Picture, Rect, Skia, type SkPicture } from '@shopify/react-native-skia';

import type { Scene } from '@/map/layouts';
import { sceneOf, type DrawnLayout } from '@/map/scenes';
import { useTheme } from '@/theme';

import { drawShapes } from './skia-scene-impl';

export type MapPreviewProps = { layout: DrawnLayout; width: number; height: number };

// Une image par modèle et par thème, enregistrée une fois : l'aperçu est immobile.
const cache = new Map<string, { picture: SkPicture; scene: Scene }>();

function preview(layout: DrawnLayout, scheme: 'light' | 'dark') {
  const key = `${layout}/${scheme}`;
  let entry = cache.get(key);
  if (!entry) {
    const scene = sceneOf(layout, scheme);
    const { minX, minY, maxX, maxY } = scene.bounds;
    const picture = createPicture(
      (canvas) => scene.parts.forEach((part) => drawShapes(canvas, part.shapes)),
      Skia.XYWHRect(minX, minY, maxX - minX, maxY - minY),
    );
    entry = { picture, scene };
    cache.set(key, entry);
  }
  return entry;
}

/** Le modèle de carte dessiné au repos, cadré sur le jardin comme la carte à son ouverture. */
export default function MapPreview({ layout, width, height }: MapPreviewProps) {
  const { scheme } = useTheme();
  const { picture, scene } = preview(layout, scheme);
  const { minX, minY, maxX, maxY } = scene.focus;
  const scale = Math.min((width / (maxX - minX)) * 1.1, height / (maxY - minY));
  const x = width / 2 - scale * ((minX + maxX) / 2);
  const y = height / 2 - scale * ((minY + maxY) / 2);

  return (
    <Canvas style={{ width, height }} aria-hidden __destroyWebGLContextAfterRender>
      <Rect x={0} y={0} width={width} height={height} color={scene.background} />
      <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}
