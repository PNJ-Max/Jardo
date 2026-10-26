import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useIsFocused } from 'expo-router';
import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

import { useTheme } from '@/theme';

import type { SkiaSceneProps } from './skia-scene-impl';

// Au niveau du module : une fois chargée, la scène se remonte sans repasser par l'indicateur.
const Scene = lazy(async () => {
  await LoadSkiaWeb();
  return import('./skia-scene-impl');
});

/**
 * Sur le web, Skia attend CanvasKit (WebAssembly, copié dans public/ par le script postinstall),
 * chargé à la première ouverture de la carte.
 *
 * Le canvas n'existe que tant que l'écran a le focus. Un écran quitté passe en display: none : le
 * canvas mesure alors 0 × 0, et Skia web 2.6 recrée à chaque changement de taille un contexte
 * WebGL sur le même canvas sans libérer l'ancien. Après un aller-retour, le navigateur affichait
 * des restes d'images en double.
 */
export function SkiaScene(props: SkiaSceneProps) {
  const { colors } = useTheme();
  const focused = useIsFocused();
  if (!focused) return null;
  return (
    <Suspense fallback={<ActivityIndicator color={colors.primary} style={{ flex: 1 }} />}>
      <Scene {...props} />
    </Suspense>
  );
}
