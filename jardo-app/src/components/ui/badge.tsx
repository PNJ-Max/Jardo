import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { createStyles } from '@/theme';

import type { IconName } from './button';

/** Pastille d'état : couleur, icône et texte ensemble, jamais la couleur seule. */
export function Badge({
  color,
  background,
  icon,
  text,
}: {
  color: string;
  background?: string;
  icon: IconName;
  text: string;
}) {
  const styles = useStyles();

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: background }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const useStyles = createStyles(({ fonts, typography, spacing }) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: { ...typography.caption, fontFamily: fonts.bodySemiBold },
}));
