import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { ApiError } from '@/api/client';
import { createStyles, useTheme } from '@/theme';

type FieldProps = TextInputProps & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, style, ...input }: FieldProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Liste de choix sous forme de pastilles : plus rapide au doigt qu'un menu déroulant. */
export function ChipSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
}) {
  const styles = useStyles();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/**
 * Erreur globale d'un formulaire. Les erreurs de validation par champ s'affichent déjà
 * sous chaque champ ; ce bloc ne montre que ce qui n'appartient à aucun champ
 * (zone introuvable, API injoignable…).
 */
export function FormError({ error }: { error: Error | null }) {
  const styles = useStyles();

  if (!error || (error instanceof ApiError && error.problem.errors)) return null;
  return <Text style={styles.error}>{error.message}</Text>;
}

/** Message de validation renvoyé par l'API pour un champ donné. */
export function apiFieldError(error: Error | null, field: string): string | undefined {
  return error instanceof ApiError ? error.fieldError(field) : undefined;
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  field: { gap: spacing.xs },
  label: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.text },
  chipTextSelected: { color: colors.primaryText },
}));
