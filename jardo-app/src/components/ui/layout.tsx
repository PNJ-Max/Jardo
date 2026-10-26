import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { createStyles, spacing } from '@/theme';

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const styles = useStyles();

  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }, style]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// Le fond vient du thème de navigation : les écrans n'ont pas à le redéclarer.
export const screenStyles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 96 },
  form: { padding: spacing.md, gap: spacing.md },
});

const useStyles = createStyles(({ colors, typography, spacing, radius }) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginTop: spacing.md,
  },
}));
