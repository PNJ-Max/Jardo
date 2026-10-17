// Aucune couleur n'est codée en dur ailleurs dans l'app : tout passe par useTheme ou createStyles.

import type { Theme as NavigationTheme } from 'expo-router';
import { StyleSheet, useColorScheme } from 'react-native';

import type { WateringStatus } from '@/api/types';

import { palettes, type ColorScheme, type Colors } from './colors';
import { fonts, typography } from './typography';

export type { ColorScheme, Colors } from './colors';
export { fontAssets, fonts, typography } from './typography';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };

export const radius = 12;

type WateringStyle = { color: string; background: string; label: string };

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  /**
   * Le voyant : une couleur ET un libellé, pour ne jamais compter sur la couleur seule.
   * `color` reste lisible en texte sur `background` comme sur le fond de l'écran.
   */
  watering: Record<WateringStatus, WateringStyle>;
  typography: typeof typography;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radius: number;
  /** À passer au ThemeProvider d'Expo Router : en-têtes, onglets et fonds d'écran. */
  navigation: NavigationTheme;
};

function createTheme(scheme: ColorScheme): Theme {
  const colors = palettes[scheme];
  const navigationFont = (fontFamily: string) => ({ fontFamily, fontWeight: 'normal' as const });

  return {
    scheme,
    colors,
    watering: {
      Ok: { color: colors.success, background: colors.successTint, label: 'OK' },
      DueSoon: { color: colors.water, background: colors.waterTint, label: "Aujourd'hui" },
      Overdue: { color: colors.danger, background: colors.dangerTint, label: 'En retard' },
    },
    typography,
    fonts,
    spacing,
    radius,
    navigation: {
      dark: scheme === 'dark',
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
      fonts: {
        regular: navigationFont(fonts.body),
        medium: navigationFont(fonts.bodyMedium),
        bold: navigationFont(fonts.bodySemiBold),
        heavy: navigationFont(fonts.bodySemiBold),
      },
    },
  };
}

const themes: Record<ColorScheme, Theme> = {
  light: createTheme('light'),
  dark: createTheme('dark'),
};

/** Le thème qui suit le réglage clair / sombre du téléphone. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/**
 * Déclare des styles qui dépendent du thème, au niveau module comme un StyleSheet.create.
 * Les deux variantes sont calculées une fois pour toutes ; le hook renvoie la bonne.
 *
 *   const useStyles = createStyles((theme) => ({ title: { color: theme.colors.text } }));
 *   const styles = useStyles();
 */
export function createStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  const sheets: Record<ColorScheme, T> = {
    light: StyleSheet.create(factory(themes.light)),
    dark: StyleSheet.create(factory(themes.dark)),
  };

  return function useStyles(): T {
    return sheets[useTheme().scheme];
  };
}
