import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useIsFocused } from 'expo-router';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

import type { SkySceneProps } from './sky-scene-impl';

export type { SkySceneProps } from './sky-scene-impl';

// Comme les vignettes (space-vignette.web.tsx) : CanvasKit chargé au premier affichage, canvas
// seulement tant que l'écran a le focus.
const Sky = lazy(async () => {
  await LoadSkiaWeb({ locateFile: (file) => `/${file}` });
  return import('./sky-scene-impl');
});

export function SkyScene(props: SkySceneProps) {
  const focused = useIsFocused();
  const placeholder = <View style={{ width: props.width, height: props.height }} />;
  if (!focused) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <Sky {...props} />
    </Suspense>
  );
}
