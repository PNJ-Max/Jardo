import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';

import { createStyles, useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Pour un bouton qui replie ou déplie une zone : l'état est alors annoncé. */
  expanded?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, expanded, style }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isPrimary = variant === 'primary';
  const tint = isPrimary ? colors.primaryText : variant === 'danger' ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      // Le texte cède la place à l'indicateur pendant le chargement : le nom ne doit pas disparaître.
      accessibilityLabel={title}
      aria-busy={loading}
      aria-expanded={expanded}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonOutline,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={tint} />}
          <Text style={[styles.buttonText, { color: tint }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Bouton rond flottant en bas à droite : l'action « ajouter » d'un écran de liste. */
export function Fab({ onPress, icon = 'add', label = 'Ajouter' }: { onPress: () => void; icon?: IconName; label?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={28} color={colors.primaryText} />
    </Pressable>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.card },
  buttonDanger: { borderColor: colors.danger },
  buttonText: { ...typography.body, fontFamily: fonts.bodySemiBold },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
}));
