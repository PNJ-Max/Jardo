import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, useWindowDimensions, View } from 'react-native';

import { SpaceVignette } from '@/components/vignettes/space-vignette';
import { createStyles, useTheme } from '@/theme';

import { Button } from './button';

export function Loading() {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.center}>
      <Ionicons aria-hidden name="cloud-offline-outline" size={40} color={colors.textMuted} />
      <Text style={styles.centerText}>{error.message}</Text>
      {onRetry && <Button title="Réessayer" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

const illustrationRatio = 0.62;

/** Le jardin au repos, une phrase, puis les actions qui débloquent (`children`). */
export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  const styles = useStyles();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 64, 280);

  return (
    <View style={styles.empty}>
      <SpaceVignette kind="Resting" width={width} height={Math.round(width * illustrationRatio)} />
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {hint && <Text style={styles.centerText}>{hint}</Text>}
      </View>
      {children && <View style={styles.emptyActions}>{children}</View>}
    </View>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  centerText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  // Grandit dans une liste vide pour s'y centrer ; garde sa hauteur dans une page qui défile.
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  emptyText: { gap: spacing.xs, maxWidth: 320 },
  emptyTitle: { ...typography.section, color: colors.text, textAlign: 'center' },
  emptyActions: { width: '100%', maxWidth: 360, gap: spacing.sm },
}));
