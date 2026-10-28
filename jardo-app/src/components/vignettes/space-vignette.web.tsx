import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useIsFocused } from 'expo-router';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

import type { SpaceVignetteProps } from './space-vignette-impl';

export type { SpaceVignetteProps } from './space-vignette-impl';

// Comme la carte : CanvasKit est chargé une fois, au premier affichage d'une vignette.
const Vignette = lazy(async () => {
  await LoadSkiaWeb();
  return import('./space-vignette-impl');
});

/**
 * Comme la carte (skia-scene.web.tsx), le canvas n'existe que tant que l'écran a le focus : un écran
 * quitté passe en display: none, et Skia web redessinerait alors à la taille 0 × 0, ce qui lève une
 * erreur. La place reste réservée pour que rien ne bouge au retour.
 */
export function SpaceVignette(props: SpaceVignetteProps) {
  const focused = useIsFocused();
  const placeholder = <View style={{ width: props.width, height: props.height }} />;
  if (!focused) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <Vignette {...props} />
    </Suspense>
  );
}
