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

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Le module natif d'expo-crypto n'existe pas sous Jest ; Node tire des UUID v4 de la même façon.
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
