import { focusManager, onlineManager, QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createQueryClient, refetchOnAppActive } from '@/api/query-client';

describe('le cache des écrans', () => {
  let client: QueryClient;

  // Ce que fait le navigateur quand le téléphone perd le réseau : l'événement « offline ».
  beforeEach(() => {
    client = createQueryClient();
    onlineManager.setOnline(false);
  });
  // Démonter, puis vider le cache, annule ses minuteurs de nettoyage, qui empêcheraient Jest de s'arrêter.
  afterEach(async () => {
    await cleanup();
    client.clear();
    onlineManager.setOnline(true);
  });

  function renderWithClient<T>(hook: () => T) {
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return renderHook(hook, { wrapper });
  }

  it('lit la base hors ligne, au lieu de rester en attente du réseau', async () => {
    const { result } = await renderWithClient(() => useQuery({ queryKey: ['jardin'], queryFn: async () => 'Mon jardin' }));

    await waitFor(() => expect(result.current.data).toBe('Mon jardin'));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('écrit hors ligne, sans attendre le retour du réseau', async () => {
    const write = jest.fn(async () => 'noté');
    // Sans délai de nettoyage : vider le cache n'annule pas le minuteur d'une mutation.
    const { result } = await renderWithClient(() => useMutation({ mutationFn: write, gcTime: 0 }));

    await act(() => result.current.mutateAsync());

    expect(write).toHaveBeenCalled();
    expect(result.current.isPaused).toBe(false);
  });
});

describe("le retour sur l'app", () => {
  afterEach(() => focusManager.setEventListener(() => undefined));

  it("compte comme le retour sur l'onglet : les écrans se relisent", () => {
    refetchOnAppActive();
    const [, listener] = jest.mocked(AppState.addEventListener).mock.lastCall!;
    const changeTo = listener as (state: AppStateStatus) => void;

    changeTo('background');
    expect(focusManager.isFocused()).toBe(false);

    changeTo('active');
    expect(focusManager.isFocused()).toBe(true);
  });
});
