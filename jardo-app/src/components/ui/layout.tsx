import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { createStyles, spacing } from '@/theme';

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const styles = useStyles();

  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }, style]}>
      {children}
    </Pressable>
  );
}

/** Les lignes d'une section sur une même surface, séparées d'un filet, plutôt qu'une carte par ligne. */
export function Group({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useStyles();

  return (
    <View style={[styles.group, style]}>
      {Children.toArray(children).map((child, index) => (
        <Fragment key={isValidElement(child) && child.key !== null ? child.key : index}>
          {index > 0 && <View style={styles.separator} />}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

/** `count` : le nombre de lignes de la section, en retrait ; `danger` pour « En retard ». */
export function SectionTitle({ children, count, danger = false }: { children: ReactNode; count?: number; danger?: boolean }) {
  const styles = useStyles();
  return (
    <Text accessibilityRole="header" style={[styles.sectionTitle, danger && styles.sectionTitleDanger]}>
      {children}
      {count !== undefined && <Text style={styles.sectionCount}> {count}</Text>}
    </Text>
  );
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
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: colors.border },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginTop: spacing.md,
  },
  sectionTitleDanger: { color: colors.danger },
  sectionCount: { color: colors.textMuted, fontVariant: ['tabular-nums'] },
}));
