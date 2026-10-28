import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';

import { ProblemError } from '@/data/problem';
import { createStyles, useTheme } from '@/theme';

type FieldProps = TextInputProps & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, style, ...input }: FieldProps) {
  const { colors } = useTheme();
  const styles = useFieldStyles();

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
  hint,
  scrollable,
}: {
  label: string;
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  /** Une seule ligne qui défile, pour une longue liste : les filtres d'une liste, par exemple. */
  scrollable?: boolean;
}) {
  const styles = useFieldStyles();
  // Un pictogramme disparaîtrait sur l'aplat `primary` : le choix passe alors sur la tuile.
  const illustrated = options.some((option) => option.icon);
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        style={[
          styles.chip,
          option.icon !== undefined && styles.chipWithIcon,
          selected && (illustrated ? styles.chipTile : styles.chipSelected),
        ]}>
        {option.icon}
        <Text style={[styles.chipText, selected && (illustrated ? styles.chipTextTile : styles.chipTextSelected)]}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.chips}>{chips}</View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * Erreur globale d'un formulaire. Les erreurs de validation par champ s'affichent déjà
 * sous chaque champ ; ce bloc ne montre que ce qui n'appartient à aucun champ
 * (zone introuvable, règle métier refusée…).
 */
export function FormError({ error }: { error: Error | null }) {
  const styles = useFieldStyles();

  if (!error || (error instanceof ProblemError && error.problem.errors)) return null;
  return <Text style={styles.error}>{error.message}</Text>;
}

/** Message de validation d'un champ, renvoyé par un service. */
export function fieldError(error: Error | null, field: string): string | undefined {
  return error instanceof ProblemError ? error.fieldError(field) : undefined;
}

/** Styles communs des champs, partagés avec le sélecteur de date. */
export const useFieldStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  field: { gap: spacing.xs },
  label: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
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
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingVertical: 6 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTile: { backgroundColor: colors.tile, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.text },
  chipTextSelected: { color: colors.primaryText },
  chipTextTile: { color: colors.primary, fontFamily: fonts.bodySemiBold },
}));
