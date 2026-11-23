// D'abord la bibliothèque de test : elle simule expo-linking, que le routeur charge ensuite.
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import { Text } from 'react-native';

import NotFoundScreen from '@/app/+not-found';

jest.unmock('expo-router');
jest.unmock('expo-router/react-navigation');

// Comme au build : le greffon d'expo-router recopie ses options dans `extra.router`, que le routeur lit.
jest.mock('expo-constants', () => {
  const actual = jest.requireActual('expo-constants');
  const { expo } = jest.requireActual('../../app.json');
  const plugin = expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-router');
  const router = Array.isArray(plugin) ? plugin[1] : {};
  return {
    ...actual,
    __esModule: true,
    default: { ...actual.default, expoConfig: { ...actual.default.expoConfig, extra: { router } } },
  };
});

describe('page introuvable', () => {
  it("dit en français qu'une adresse inconnue n'existe pas, et ramène au jardin", async () => {
    await renderRouter(
      { _layout: () => <Stack />, index: () => <Text>Accueil</Text>, '+not-found': NotFoundScreen },
      { initialUrl: '/adresse-inconnue' },
    );

    expect(screen.getByText("Cette page n'existe pas")).toBeOnTheScreen();
    expect(screen.queryByText('Unmatched Route')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Retour au jardin' }));

    expect(await screen.findByText('Accueil')).toBeOnTheScreen();
  });
});
