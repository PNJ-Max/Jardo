import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import type { TextStyle } from 'react-native';

/** À passer à `useFonts` : les clés deviennent les noms de famille utilisables en style. */
export const fontAssets = {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
};

/**
 * Chaque graisse est une famille à part entière. Ne jamais l'accompagner d'un
 * `fontWeight` : Android et le web synthétiseraient un faux gras par-dessus.
 */
export const fonts = {
  heading: 'Nunito_800ExtraBold',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_600SemiBold',
  bodySemiBold: 'Nunito_700Bold',
} as const satisfies Record<string, keyof typeof fontAssets>;

export const typography = {
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30 },
  subtitle: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;
