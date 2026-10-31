import Ionicons from '@expo/vector-icons/Ionicons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';

import {
  useEnableReminders,
  useNotificationPermission,
  useReminderScheduling,
  useReminderSettings,
  useSaveReminderSettings,
} from '@/api/reminder-queries';
import { Button, SectionTitle } from '@/components/ui';
import { useFieldStyles } from '@/components/ui/form';
import { onReminderOpened, remindersSupported } from '@/lib/notifications';
import { formatReminderTime, type ReminderSettings } from '@/lib/reminders';
import { createStyles, useTheme } from '@/theme';

/** Sous la racine de l'app : programme les rappels et ouvre Aujourd'hui quand on en touche un. Rien sur le web. */
export function Reminders() {
  return remindersSupported ? <ReminderScheduler /> : null;
}

function ReminderScheduler() {
  useReminderScheduling();
  useEffect(() => onReminderOpened((href) => router.navigate(href)), []);
  return null;
}

/** Réglages : le rappel du jour. Le web n'a pas de notifications : la section n'y figure pas. */
export function RemindersSection() {
  return remindersSupported ? <RemindersSettings /> : null;
}

function RemindersSettings() {
  const { colors } = useTheme();
  const styles = useStyles();
  const settings = useReminderSettings();
  const permission = useNotificationPermission();
  const enable = useEnableReminders();
  const save = useSaveReminderSettings();

  if (!settings.data) return null;
  const current = settings.data;
  // Refusée au moment d'activer, ou retirée depuis dans les réglages du téléphone.
  const blocked = permission.data === 'denied' && (current.enabled || enable.data === 'denied');
  const error = enable.error ?? save.error;

  function toggle(on: boolean) {
    if (on) enable.mutate(current);
    else save.mutate({ ...current, enabled: false });
  }

  const chooseTime = () =>
    DateTimePickerAndroid.open({
      value: new Date(2000, 0, 1, current.hour, current.minute),
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, date) => save.mutate({ ...current, hour: date.getHours(), minute: date.getMinutes() }),
    });

  return (
    <View style={styles.section}>
      <SectionTitle>Rappels</SectionTitle>
      <Text style={styles.muted}>
        Chaque jour à l&apos;heure choisie, une notification dit ce qui attend au jardin. Les jours sans rien à faire, pas de
        notification.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Rappel du jour</Text>
        <Switch
          accessibilityLabel="Rappel du jour"
          value={current.enabled}
          disabled={enable.isPending || save.isPending}
          onValueChange={toggle}
          trackColor={{ true: colors.primary }}
        />
      </View>

      {current.enabled && <TimeField settings={current} onPress={chooseTime} />}

      {blocked && (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            Les notifications de Jardo sont bloquées sur ce téléphone : autorisez-les dans ses réglages pour recevoir le rappel.
          </Text>
          <Button title="Ouvrir les réglages du téléphone" icon="settings-outline" variant="secondary" onPress={() => Linking.openSettings()} />
        </>
      )}
      {error && <Text style={styles.error}>{error.message}</Text>}
    </View>
  );
}

function TimeField({ settings, onPress }: { settings: ReminderSettings; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fieldStyles = useFieldStyles();
  const time = formatReminderTime(settings);

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>Heure du rappel</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Heure du rappel : ${time}`}
        style={({ pressed }) => [fieldStyles.input, styles.time, pressed && { opacity: 0.7 }]}>
        <Ionicons aria-hidden name="time-outline" size={20} color={colors.primary} />
        <Text style={styles.text}>{time}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: spacing.sm },
  label: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text, flexShrink: 1 },
  time: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
}));
