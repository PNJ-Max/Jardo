import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { createStyles, useTheme } from '@/theme';

/** Rappelle en tête de formulaire sur quoi porte l'intervention ou la tâche. */
export function FormTarget({ label }: { label: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <Ionicons aria-hidden name="location-outline" size={18} color={colors.textMuted} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  text: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.textMuted, flex: 1 },
}));
