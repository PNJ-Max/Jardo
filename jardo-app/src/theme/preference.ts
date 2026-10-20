import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

import type { ColorScheme } from './colors';

/** L'apparence choisie dans les réglages de l'app ; `system` suit le téléphone. */
export type ThemePreference = 'system' | ColorScheme;

const storageKey = 'jardo.themePreference';

let preference: ThemePreference = 'system';
const listeners = new Set<() => void>();

function apply(next: ThemePreference) {
  preference = next;
  // Les composants natifs (sélecteur de date, clavier) suivent Appearance et non le thème de l'app.
  // Appearance.setColorScheme n'existe pas sur le web.
  if (Platform.OS !== 'web') Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  listeners.forEach((listener) => listener());
}

/** À attendre avant d'afficher l'app, pour ne pas la montrer un instant dans l'autre thème. */
export async function loadThemePreference() {
  const stored = await AsyncStorage.getItem(storageKey).catch(() => null);
  if (stored === 'light' || stored === 'dark') apply(stored);
}

export function setThemePreference(next: ThemePreference) {
  apply(next);
  // Si l'appareil refuse l'écriture, le choix vaut jusqu'à la fermeture de l'app.
  AsyncStorage.setItem(storageKey, next).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference);
}
