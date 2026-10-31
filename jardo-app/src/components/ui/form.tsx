import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { ProblemError } from '@/data/problem';
import { createStyles, useTheme } from '@/theme';

// Le navigateur dessine sinon son propre anneau de focus par-dessus celui du thème.
const noBrowserRing = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

type FieldProps = TextInputProps & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, style, onFocus, onBlur, ...input }: FieldProps) {
  const { colors } = useTheme();
  const styles = useFieldStyles();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        // Le libellé est un Text voisin : sans ceci, le lecteur d'écran annonce un champ sans nom.
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, noBrowserRing, input.multiline && styles.inputMultiline, focused && styles.inputFocused, error ? styles.inputError : null, style]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...input}
      />
      <FieldMessage error={error} hint={hint} />
    </View>
  );
}

/** L'erreur d'un champ (annoncée à son apparition), à défaut son indication. */
export function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  const styles = useFieldStyles();

  if (error) {
    return (
      <Text accessibilityLiveRegion="polite" style={styles.error}>
        {error}
      </Text>
    );
  }
  return hint ? <Text style={styles.hint}>{hint}</Text> : null;
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
        accessibilityRole="radio"
        aria-selected={selected}
        aria-checked={selected}
        // Le pictogramme est décoratif : seul le texte nomme la pastille.
        accessibilityLabel={option.label}
        // 40 de haut, 48 au doigt : la marge ne mord pas sur la pastille voisine (8 d'écart).
        hitSlop={{ top: 4, bottom: 4 }}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={label}>
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {chips}
        </View>
      )}
      <FieldMessage error={error} hint={hint} />
    </View>
  );
}

/**
 * Erreur globale d'un formulaire. Les erreurs de validation par champ s'affichent déjà
 * sous chaque champ ; ce bloc ne montre que ce qui n'appartient à aucun champ
 * (zone introuvable, règle métier refusée…).
 */
export function FormError({ error }: { error: Error | null }) {
  if (!error || (error instanceof ProblemError && error.problem.errors)) return null;
  return <FieldMessage error={error.message} />;
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
    // L'anneau de focus ou d'erreur prend la place de cette bordure transparente : rien ne bouge.
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSunken,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: { minHeight: 96, paddingTop: spacing.sm + 4, textAlignVertical: 'top' },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceSunken,
  },
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingVertical: 6 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTile: { backgroundColor: colors.tile, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.text },
  chipTextSelected: { color: colors.primaryText },
  chipTextTile: { color: colors.primary, fontFamily: fonts.bodySemiBold },
}));
