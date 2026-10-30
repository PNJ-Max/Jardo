import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Le routeur réel exige une arborescence de navigation ; les tests ne vérifient que les
// appels de navigation.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Stack: { Screen: () => null },
  // Les boutons de l'en-tête de l'onglet Jardin sont déclarés par l'écran : on les y rend.
  Tabs: { Screen: ({ options }: { options?: { headerRight?: () => unknown } }) => options?.headerRight?.() ?? null },
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Skia ne tourne pas sous Jest : l'image d'un pictogramme n'y porte que sa clé, « type:thème ».
jest.mock('@/components/pictograms/picture', () => ({ pictogramUri: (key: string) => `pictogram:${key}` }));

// Le mock de Reanimated n'a pas useReducedMotion : par défaut, le téléphone ne réduit pas les animations.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: jest.fn(() => false) }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  performAndroidHapticsAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
  AndroidHaptics: { Confirm: 'confirm' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Skia ne tourne pas sous Jest : une vignette d'espace n'y est qu'une boîte vide de sa taille.
jest.mock('@/components/vignettes/space-vignette', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    SpaceVignette: ({ width, height }: { width: number; height: number }) => createElement(View, { style: { width, height } }),
  };
});
jest.mock('@/components/vignettes/sky-scene', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    SkyScene: ({ width, height }: { width: number; height: number }) => createElement(View, { style: { width, height } }),
  };
});

// Le module natif d'expo-crypto n'existe pas sous Jest ; Node tire des UUID v4 de la même façon.
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));

// Les tests n'appellent jamais le réseau : ceux de la météo bouchonnent fetch eux-mêmes.
global.fetch = jest.fn(async () => {
  throw new Error('Pas de réseau dans les tests.');
});
