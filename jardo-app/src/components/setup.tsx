import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles, useTheme } from '@/theme';

/** Quitte l'assistant, d'où qu'on l'ait ouvert, vers l'onglet Jardin : la carte, ou la liste si on a passé. */
export const leaveSetup = () => router.dismissTo('/');

type SetupPageProps = {
  /** « Étape 1 sur 2 » ; rien sur l'accueil, qui n'a pas de retour. */
  step?: string;
  title: string;
  intro: string;
  /** Un dessin pleine largeur, sous la barre du haut. */
  hero?: ReactNode;
  footer: ReactNode;
  children?: ReactNode;
};

/** Une page de l'assistant : retour et « Passer » en haut, le contenu qui défile, l'action ancrée en bas. */
export function SetupPage({ step, title, intro, hero, footer, children }: SetupPageProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
        {step ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={({ pressed }) => [styles.barButton, pressed && { opacity: 0.6 }]}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.barButton} />
        )}
        <Pressable
          onPress={leaveSetup}
          accessibilityRole="button"
          accessibilityLabel="Passer l'assistant"
          style={({ pressed }) => [styles.barButton, styles.skip, pressed && { opacity: 0.6 }]}>
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {hero}
        <View style={styles.text}>
          {step && <Text style={styles.step}>{step}</Text>}
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.intro}>{intro}</Text>
        </View>
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  page: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  barButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  skip: { paddingHorizontal: spacing.md },
  skipText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.primary },
  body: { flex: 1 },
  content: { paddingBottom: spacing.lg, gap: spacing.md },
  text: { paddingHorizontal: spacing.md, gap: spacing.xs },
  step: { ...typography.caption, fontFamily: fonts.bodySemiBold, color: colors.textMuted },
  title: { ...typography.display, color: colors.text },
  intro: { ...typography.body, color: colors.textMuted },
  footer: { paddingHorizontal: spacing.md, paddingTop: 12, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
}));
