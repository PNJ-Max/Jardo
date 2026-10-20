jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Le routeur réel exige une arborescence de navigation ; les tests ne vérifient que les
// appels de navigation.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
