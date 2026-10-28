import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useEffect, useState } from 'react';

import type { pictogramUri } from './picture';

type Renderer = typeof pictogramUri;

// Skia ne s'importe qu'une fois CanvasKit chargé (WebAssembly) : les pictogrammes restent vides
// jusque-là, une seule fois pour toute l'app.
let renderer: Renderer | undefined;
const loading = LoadSkiaWeb()
  .then(() => import('./picture'))
  .then((module) => (renderer = module.pictogramUri));

export function usePictogramRenderer(): Renderer | undefined {
  const [current, setCurrent] = useState(() => renderer);
  useEffect(() => {
    if (!current) loading.then((loaded) => setCurrent(() => loaded));
  }, [current]);
  return current;
}
