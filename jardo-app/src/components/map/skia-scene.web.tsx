import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import type { SceneRendererProps } from './scene-renderer';

/** Sur le web, Skia attend CanvasKit (WebAssembly), chargé à la demande depuis public/. */
export function SkiaScene(props: SceneRendererProps) {
  return <WithSkiaWeb getComponent={() => import('./skia-scene-impl')} componentProps={props} />;
}
