import Ionicons from '@expo/vector-icons/Ionicons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, Text, View } from 'react-native';

import { formatLongDate, parseDateOnly, toDateOnly } from '@/lib/dates';
import { createStyles, useTheme } from '@/theme';

import type { DateFieldProps } from './date-field-props';
import { FieldMessage, useFieldStyles } from './form';

/**
 * Champ de date sur téléphone : un tap ouvre le calendrier natif d'Android. On passe par l'API
 * impérative, recommandée sur Android, plutôt que par le composant qui s'afficherait en ligne.
 */
export function DateField(props: DateFieldProps) {
  const { label, value, noFuture, optional, error, hint } = props;
  const { colors } = useTheme();
  const fieldStyles = useFieldStyles();
  const styles = useStyles();

  const open = () =>
    DateTimePickerAndroid.open({
      value: value ? parseDateOnly(value) : new Date(),
      mode: 'date',
      maximumDate: noFuture ? new Date() : undefined,
      onValueChange: (_event, date) => props.onChange(toDateOnly(date)),
    });

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${value ? formatLongDate(value) : 'aucune date'}`}
          style={({ pressed }) => [
            fieldStyles.input,
            styles.input,
            error ? fieldStyles.inputError : null,
            pressed && { opacity: 0.7 },
          ]}>
          <Ionicons aria-hidden name="calendar-outline" size={20} color={colors.primary} />
          <Text style={value ? styles.value : styles.placeholder}>
            {value ? formatLongDate(value) : 'Choisir une date'}
          </Text>
        </Pressable>
        {optional && value && (
          <Pressable
            onPress={() => props.optional && props.onChange(null)}
            accessibilityRole="button"
            accessibilityLabel={`Effacer : ${label}`}
            hitSlop={8}
            style={styles.clear}>
            <Ionicons aria-hidden name="close-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <FieldMessage error={error} hint={hint} />
    </View>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: { ...typography.body, color: colors.text },
  placeholder: { ...typography.body, color: colors.textMuted },
  clear: { padding: spacing.xs },
}));
