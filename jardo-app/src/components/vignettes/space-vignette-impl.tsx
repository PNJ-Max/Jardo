import { Canvas, createPicture, Group, LinearGradient, Picture, Rect, Skia, type SkPicture } from '@shopify/react-native-skia';

import { drawShapes } from '@/components/map/skia-scene-impl';
import type { Bounds } from '@/map/scene';
import { useTheme } from '@/theme';

import { vignetteDrawing, type VignetteKind, type VignetteScheme } from './scenes';

export type SpaceVignetteProps = {
  kind: VignetteKind;
  width: number;
  height: number;
  /** Marge laissée autour de la scène ; `top` s'ajoute à la marge commune (bouton posé dessus, encoche). */
  padding?: number;
  paddingTop?: number;
  /** Ciel du jour fondu vers le fond de l'écran, derrière la scène : l'en-tête d'une fiche. */
  sky?: boolean;
};

// Une scène par type et par thème, enregistrée une fois pour toute l'app : une ligne de liste ne
// fait que reposer l'image.
const cache = new Map<string, { picture: SkPicture; bounds: Bounds }>();

function vignette(kind: VignetteKind, scheme: VignetteScheme) {
  const key = `${kind}/${scheme}`;
  let entry = cache.get(key);
  if (!entry) {
    const { shapes, bounds } = vignetteDrawing(kind, scheme);
    const { minX, minY, maxX, maxY } = bounds;
    const picture = createPicture((canvas) => drawShapes(canvas, shapes), Skia.XYWHRect(minX, minY, maxX - minX, maxY - minY));
    entry = { picture, bounds };
    cache.set(key, entry);
  }
  return entry;
}

export default function SpaceVignette({ kind, width, height, padding = 0, paddingTop = 0, sky = false }: SpaceVignetteProps) {
  const { scheme, colors } = useTheme();
  const { picture, bounds } = vignette(kind, scheme);
  const sceneWidth = bounds.maxX - bounds.minX;
  const sceneHeight = bounds.maxY - bounds.minY;
  const boxWidth = Math.max(0, width - 2 * padding);
  const boxHeight = Math.max(0, height - 2 * padding - paddingTop);
  const scale = Math.min(boxWidth / sceneWidth, boxHeight / sceneHeight);
  const x = (width - sceneWidth * scale) / 2 - bounds.minX * scale;
  const y = padding + paddingTop + (boxHeight - sceneHeight * scale) / 2 - bounds.minY * scale;

  return (
    // Sur le web, un dessin immobile n'a pas besoin de garder son contexte WebGL : une liste de
    // vignettes dépasserait sinon la limite du navigateur.
    <Canvas style={{ width, height }} aria-hidden __destroyWebGLContextAfterRender>
      {sky && (
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 0, y: height }} colors={[colors.skyTop, colors.background]} />
        </Rect>
      )}
      <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}
