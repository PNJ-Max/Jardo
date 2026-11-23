import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import TabLayout from '@/app/(tabs)/_layout';
import SetupWelcomeScreen from '@/app/setup';
import SetupModelScreen from '@/app/setup/model';
import SetupReminderScreen from '@/app/setup/reminder';
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

    expect(screen.getByText('Étape 1 sur 3')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^Maison de campagne/ })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: /^Maison mitoyenne/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/setup/spaces', params: { layout: 'terraced-long' } });
  });

  it("crée les espaces cochés, pose la carte et passe au rappel du jour, sans retour possible", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ layout: 'terraced-long' });
    const { services } = await renderScreen(<SetupSpacesScreen />);

    // Les parcelles ne se proposent qu'avec le potager, et ne sont pas cochées d'office.
    expect(screen.queryByRole('checkbox', { name: 'Ajouter quatre parcelles' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Potager' }));
    expect(screen.getByRole('checkbox', { name: 'Ajouter quatre parcelles' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter quatre parcelles' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Verger' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Bois de chauffage' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon jardin' }));

    expect(router.replace).toHaveBeenCalledWith('/setup/reminder');
    expect(router.dismissTo).not.toHaveBeenCalled();
    const map = await services.gardenMap.get();
    expect(map.layout).toBe('terraced-long');
    expect(map.slots.map((slot) => [slot.slotKey, slot.zoneName ?? slot.spaceName])).toEqual([
      ['bed-1', 'Parcelle 1'],
      ['bed-2', 'Parcelle 2'],
      ['bed-3', 'Parcelle 3'],
      ['bed-4', 'Parcelle 4'],
      ['firewood', 'Bois de chauffage'],
      ['orchard', 'Verger'],
      ['vegetable', 'Potager'],
    ]);
  });

  it("sans espace coché, revient sur le Jardin sans proposer de rappel", async () => {
    await renderScreen(<SetupSpacesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher la carte' }));

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    expect(router.replace).not.toHaveBeenCalled();
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

describe('assistant : le rappel du jour', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  const storedSettings = async () => JSON.parse((await AsyncStorage.getItem('jardo.reminders')) ?? 'null');

  it("propose le rappel à l'heure par défaut, sans rien demander ni activer avant la réponse", async () => {
    await renderScreen(<SetupReminderScreen />);

    expect(await screen.findByRole('header', { name: 'Me rappeler chaque jour' })).toBeOnTheScreen();
    expect(screen.getByText('Étape 3 sur 3')).toBeOnTheScreen();
    expect(screen.getByText(/^Chaque jour à 8 h,/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Oui, me rappeler chaque jour à 8 h' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeOnTheScreen();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    await expect(storedSettings()).resolves.toBeNull();
  });

  it("« Plus tard » revient sur le Jardin sans demander la permission ni activer le rappel", async () => {
    await renderScreen(<SetupReminderScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Plus tard' }));

    expect(router.dismissTo).toHaveBeenCalledWith('/');
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    await expect(storedSettings()).resolves.toBeNull();
  });

  it("« Oui » demande la permission, active le rappel à 8 h, puis revient sur le Jardin", async () => {
    await renderScreen(<SetupReminderScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: /^Oui/ }));

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    await expect(storedSettings()).resolves.toEqual({ enabled: true, hour: 8, minute: 0 });
  });

  it("« Oui » refusé par le téléphone : le rappel reste éteint, et l'assistant se termine quand même", async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false, status: 'denied', canAskAgain: false } as never);
    await renderScreen(<SetupReminderScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: /^Oui/ }));

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    await expect(storedSettings()).resolves.toBeNull();
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
