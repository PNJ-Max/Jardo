import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import type { TextStyle } from 'react-native';

/** À passer à `useFonts` : les clés deviennent les noms de famille utilisables en style. */
export const fontAssets = {
  Fraunces_600SemiBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
};

/**
 * Chaque graisse est une famille à part entière. Ne jamais l'accompagner d'un
 * `fontWeight` : Android et le web synthétiseraient un faux gras par-dessus.
 */
export const fonts = {
  heading: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const satisfies Record<string, keyof typeof fontAssets>;

export const typography = {
  title: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;
