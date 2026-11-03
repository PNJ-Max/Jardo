import { act, render, waitFor } from '@testing-library/react-native';
import { Stack, ThemeProvider } from 'expo-router';

import RootLayout from '@/app/_layout';
import { setThemePreference } from '@/theme';
import { palettes } from '@/theme/colors';

// La pile n'est que ses options, et le thème de navigation que sa valeur : le test lit celles du
// dernier rendu.
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  Stack: Object.assign(
    jest.fn(() => null),
    { Screen: () => null },
  ),
  ThemeProvider: jest.fn(({ children }: { children: unknown }) => children),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
// Comme le vrai : un `memo` qui ne compare que les réglages de la base, jamais les enfants. La
// racine qui se rend de nouveau ne fait donc pas se rendre ce qu'il contient.
jest.mock('expo-sqlite', () => {
  const { memo } = require('react');
  return {
    SQLiteProvider: memo(
      ({ children }: { children: unknown }) => children,
      () => true,
    ),
    useSQLiteContext: () => ({}),
  };
});

const last = <T,>(component: unknown) => jest.mocked(component as jest.Mock).mock.lastCall![0] as T;

describe('changer de thème en cours de route', () => {
  beforeEach(() => act(() => setThemePreference('light')));
  afterAll(() => act(() => setThemePreference('system')));

  it('recolore la navigation : fonds, en-têtes et titres', async () => {
    await render(<RootLayout />);
    await waitFor(() => expect(Stack).toHaveBeenCalled());
    expect(last<{ value: { colors: { background: string } } }>(ThemeProvider).value.colors.background).toBe(
      palettes.light.background,
    );

    await act(() => setThemePreference('dark'));

    expect(last<{ value: { colors: { background: string; card: string } } }>(ThemeProvider).value.colors).toMatchObject({
      background: palettes.dark.background,
      card: palettes.dark.card,
    });
    expect(last<{ screenOptions: { headerTitleStyle: { color: string } } }>(Stack).screenOptions.headerTitleStyle.color).toBe(
      palettes.dark.text,
    );
  });
});
