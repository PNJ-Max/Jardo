import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import TabLayout from '@/app/(tabs)/_layout';
import SetupWelcomeScreen from '@/app/setup';
import SetupModelScreen from '@/app/setup/model';
import SetupSpacesScreen from '@/app/setup/spaces';
import { ServicesProvider } from '@/data/services';

import { createTestServices, renderScreen } from '../../test/render';

// Les onglets réels exigent un navigateur : un repère dit seulement si le layout les affiche.
beforeAll(() => {
  const expoRouter = jest.requireMock<{ Tabs: unknown }>('expo-router');
  expoRouter.Tabs = Object.assign(() => <Text>Onglets</Text>, { Screen: () => null });
});

describe('assistant de la carte', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useIsFocused).mockReturnValue(true);
  });

  it("de l'accueil au choix du modèle", async () => {
    await renderScreen(<SetupWelcomeScreen />);

    expect(screen.getByRole('header', { name: 'Votre jardin, dessiné' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Dessiner mon jardin' }));

    expect(router.push).toHaveBeenCalledWith('/setup/model');
  });

  it('passe le modèle choisi à l’étape des espaces', async () => {
    await renderScreen(<SetupModelScreen />);

    expect(screen.getByRole('radio', { name: /^Maison de campagne/ })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: /^Maison mitoyenne/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/setup/spaces', params: { layout: 'terraced-long' } });
  });

  it('crée les espaces cochés, pose la carte et revient sur le Jardin', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ layout: 'terraced-long' });
    const { services } = await renderScreen(<SetupSpacesScreen />);

    // Les carrés ne se proposent qu'avec le potager, et ne sont pas cochés d'office.
    expect(screen.queryByRole('checkbox', { name: 'Ajouter quatre carrés' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Potager' }));
    expect(screen.getByRole('checkbox', { name: 'Ajouter quatre carrés' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter quatre carrés' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Verger' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Bois de chauffage' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon jardin' }));

    expect(router.dismissTo).toHaveBeenCalledWith('/');
    const map = await services.gardenMap.get();
    expect(map.layout).toBe('terraced-long');
    expect(map.slots.map((slot) => [slot.slotKey, slot.zoneName ?? slot.spaceName])).toEqual([
      ['bed-1', 'Carré 1'],
      ['bed-2', 'Carré 2'],
      ['bed-3', 'Carré 3'],
      ['bed-4', 'Carré 4'],
      ['firewood', 'Bois de chauffage'],
      ['orchard', 'Verger'],
      ['vegetable', 'Potager'],
    ]);
  });

  it("se passe à tout moment, sans rien écrire", async () => {
    const { services } = await renderScreen(<SetupSpacesScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Serre' }));
    await fireEvent.press(screen.getByRole('button', { name: "Passer l'assistant" }));

    expect(router.dismissTo).toHaveBeenCalledWith('/');
    await expect(services.gardenMap.get()).resolves.toEqual({ layout: null, slots: [] });
    await expect(services.spaces.getAll(true)).resolves.toEqual([]);
  });
});

describe('premier lancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useIsFocused).mockReturnValue(true);
  });

  it("ouvre l'assistant sur un jardin vide, puis montre les onglets à son retour", async () => {
    const { rerender, services, queryClient } = await renderScreen(<TabLayout />);
    // Le même arbre, rendu à nouveau après un changement de focus.
    const renderAgain = () =>
      rerender(
        <ServicesProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <TabLayout />
          </QueryClientProvider>
        </ServicesProvider>,
      );

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/setup'));
    expect(screen.queryByText('Onglets')).not.toBeOnTheScreen();

    jest.mocked(useIsFocused).mockReturnValue(false);
    await renderAgain();
    expect(screen.queryByText('Onglets')).not.toBeOnTheScreen();
    jest.mocked(useIsFocused).mockReturnValue(true);
    await renderAgain();

    expect(screen.getByText('Onglets')).toBeOnTheScreen();
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("n'ouvre pas l'assistant sur un jardin qui a des espaces", async () => {
    const services = await createTestServices();
    await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
    await renderScreen(<TabLayout />, services);

    expect(await screen.findByText('Onglets')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });
});
