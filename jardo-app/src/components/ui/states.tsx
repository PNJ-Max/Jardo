import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Text, View } from 'react-native';

import { createStyles, useTheme } from '@/theme';

import { Button, type IconName } from './button';

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
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
      <Text style={styles.centerText}>{error.message}</Text>
      {onRetry && <Button title="Réessayer" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Empty({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={48} color={colors.primary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint && <Text style={styles.centerText}>{hint}</Text>}
    </View>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  centerText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptyTitle: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
}));
