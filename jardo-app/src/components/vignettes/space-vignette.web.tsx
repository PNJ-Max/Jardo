import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

import type { SpaceVignetteProps } from './space-vignette-impl';

export type { SpaceVignetteProps } from './space-vignette-impl';

// Comme la carte : CanvasKit est chargé une fois, au premier affichage d'une vignette.
const Vignette = lazy(async () => {
  await LoadSkiaWeb();
  return import('./space-vignette-impl');
});

export function SpaceVignette(props: SpaceVignetteProps) {
  return (
    <Suspense fallback={<View style={{ width: props.width, height: props.height }} />}>
      <Vignette {...props} />
    </Suspense>
  );
}
