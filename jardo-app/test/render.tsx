import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

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

/**
 * `action`, puis l'app quitte le premier plan (téléphone verrouillé, autre app ouverte) : seules
 * les écoutes d'AppState posées pendant `action` l'apprennent, pas celles des tests précédents.
 */
export async function thenLeaveForeground(action: () => Promise<unknown>) {
  const addListener = jest.mocked(AppState.addEventListener);
  const since = addListener.mock.calls.length;
  await action();
  await act(async () => {
    addListener.mock.calls
      .slice(since)
      .forEach(([type, listener]) => type === 'change' && (listener as (state: AppStateStatus) => void)('background'));
  });
}

type RenderedNode = { props?: { source?: { uri?: string } }; children?: (RenderedNode | string)[] | null };

/** Les pictogrammes affichés, « type:thème » (voir le mock de test/setup.ts), dans l'ordre de l'écran. */
export function pictogramsOnScreen(): string[] {
  const found: string[] = [];
  const visit = (node: RenderedNode | string | null) => {
    if (!node || typeof node === 'string') return;
    const uri = node.props?.source?.uri;
    if (uri?.startsWith('pictogram:')) found.push(uri.slice('pictogram:'.length));
    node.children?.forEach(visit);
  };
  const tree = screen.toJSON() as RenderedNode | RenderedNode[] | null;
  (Array.isArray(tree) ? tree : [tree]).forEach(visit);
  return found;
}
