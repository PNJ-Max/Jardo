import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator } from 'react-native';

import { useTheme } from '@/theme';

import type { SkiaSceneProps } from './skia-scene-impl';

/**
 * Sur le web, Skia attend CanvasKit (WebAssembly, copié dans public/ par le script postinstall),
 * chargé à la première ouverture de la carte.
 */
export function SkiaScene(props: SkiaSceneProps) {
  const { colors } = useTheme();
  return (
    <WithSkiaWeb
      getComponent={() => import('./skia-scene-impl')}
      componentProps={props}
      fallback={<ActivityIndicator color={colors.primary} style={{ flex: 1 }} />}
    />
  );
}
