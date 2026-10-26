import { Text, View } from 'react-native';

import { today } from '@/lib/dates';
import { useTheme } from '@/theme';

import type { DateFieldProps } from './date-field-props';
import { useFieldStyles } from './form';

/**
 * Champ de date dans le navigateur. Le sélecteur natif d'Android n'existe pas sur le web : on
 * s'appuie sur <input type="date">, qui affiche le calendrier du navigateur et respecte `max`.
 */
export function DateField(props: DateFieldProps) {
  const { label, value, noFuture, optional, error, hint } = props;
  const { colors, fonts, radius, scheme, spacing } = useTheme();
  const fieldStyles = useFieldStyles();

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <input
        type="date"
        aria-label={label}
        value={value ?? ''}
        max={noFuture ? today() : undefined}
        required={!optional}
        onChange={(event) => {
          const next = event.target.value;
          if (next) props.onChange(next);
          else if (props.optional) props.onChange(null);
        }}
        style={{
          minHeight: 48,
          boxSizing: 'border-box',
          paddingInline: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${error ? colors.danger : colors.border}`,
          backgroundColor: colors.card,
          color: colors.text,
          fontFamily: fonts.body,
          fontSize: 16,
          // Le calendrier déroulant du navigateur suit alors le thème de l'app.
          colorScheme: scheme,
        }}
      />
      {error ? <Text style={fieldStyles.error}>{error}</Text> : hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
    </View>
  );
}
