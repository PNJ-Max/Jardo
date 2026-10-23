import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { UndoProvider } from '@/components/undo';
import { createServices, ServicesProvider, type Services } from '@/data/services';

import { createTestDb } from './db';

/** Les services sur une base neuve en mémoire, migrée comme l'app l'ouvre : de quoi préparer un écran. */
export const createTestServices = async () => createServices(await createTestDb());

/**
 * Monte l'écran sur la couche locale, une vraie SQLite en mémoire : sur `services` s'ils sont
 * donnés (déjà remplis par le test), sinon sur une base neuve.
 *
 * Un cache neuf par test, sans nouvelle tentative : une erreur doit s'afficher tout de suite.
 * Un gcTime infini ne programme aucun minuteur de nettoyage, qui empêcherait Jest de s'arrêter.
 */
export async function renderScreen(ui: ReactElement, services?: Services) {
  const resolved = services ?? (await createTestServices());
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const utils = await render(
    <ServicesProvider services={resolved}>
      <QueryClientProvider client={queryClient}>
        <UndoProvider>{ui}</UndoProvider>
      </QueryClientProvider>
    </ServicesProvider>,
  );
  return { ...utils, queryClient, services: resolved };
}
