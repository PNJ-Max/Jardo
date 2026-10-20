import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { UndoProvider } from '@/components/undo';

/** Un cache neuf par test, sans nouvelle tentative : une erreur de l'API doit s'afficher tout de suite. */
export async function renderScreen(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const utils = await render(
    <QueryClientProvider client={queryClient}>
      <UndoProvider>{ui}</UndoProvider>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}
