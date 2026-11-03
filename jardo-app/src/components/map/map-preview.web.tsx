import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useIsFocused } from 'expo-router';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

import type { MapPreviewProps } from './map-preview-impl';

export type { MapPreviewProps } from './map-preview-impl';

// Comme les vignettes : l'assistant peut s'ouvrir directement (/setup/…), le fichier WebAssembly se
// cherche alors depuis la racine.
const Preview = lazy(async () => {
  await LoadSkiaWeb({ locateFile: (file) => `/${file}` });
  return import('./map-preview-impl');
});

/** Comme la carte et les vignettes, le canvas n'existe que tant que l'écran a le focus ; la place reste réservée. */
export function MapPreview(props: MapPreviewProps) {
  const focused = useIsFocused();
  const placeholder = <View style={{ width: props.width, height: props.height }} />;
  if (!focused) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <Preview {...props} />
    </Suspense>
  );
}
