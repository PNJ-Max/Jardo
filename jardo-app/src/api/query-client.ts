import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/** Le cache des écrans. Les données sont dans le téléphone : le réseau n'a rien à y voir. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Une lecture locale qui échoue échouera encore : pas de nouvelle tentative. Sur le web,
      // TanStack Query suspend par défaut lectures et écritures quand le navigateur se dit hors
      // ligne, ce qui figerait l'app.
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  });
}

/**
 * Sur téléphone, le retour sur l'app relit les écrans, comme le retour sur l'onglet du navigateur
 * le fait déjà sur le web : les échéances dépendent du jour.
 */
export function refetchOnAppActive() {
  if (Platform.OS === 'web') return;
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => subscription.remove();
  });
}
