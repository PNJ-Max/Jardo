// D'abord la bibliothèque de test : elle simule expo-linking, que le routeur charge ensuite.
import { renderRouter, screen } from 'expo-router/testing-library';
import { Stack } from 'expo-router';
import { Text } from 'react-native';

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

describe('plan des écrans généré par Expo Router', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('n’est pas joignable par un lien : son code lit window.location, absent sur un téléphone', async () => {
    // Le plan tomberait ici sans ce bouchon : le test vérifie qu'il n'est plus affiché, pas qu'il plante.
    Object.assign(window, { location: { origin: 'jardo://' } });

    await renderRouter({ _layout: () => <Stack />, index: () => <Text>Accueil</Text> }, { initialUrl: '/_sitemap' });

    expect(screen.queryByTestId('expo-router-sitemap')).toBeNull();
    expect(screen.getByText('Unmatched Route')).toBeOnTheScreen();
  });
});
