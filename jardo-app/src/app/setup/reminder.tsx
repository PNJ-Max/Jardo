import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { useEnableReminders, useReminderSettings } from '@/api/reminder-queries';
import { leaveSetup, SetupPage } from '@/components/setup';
import { Button, Card } from '@/components/ui';
import { defaultReminderSettings, formatReminderTime } from '@/lib/reminders';
import { createStyles, useTheme } from '@/theme';

/**
 * Dernière étape de l'assistant, sur un téléphone : proposer le rappel du jour. Rien ne s'active
 * sans « Oui », et la permission des notifications n'est demandée qu'à ce moment-là.
 */
export default function SetupReminderScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const settings = useReminderSettings().data ?? defaultReminderSettings;
  const enable = useEnableReminders();
  const time = formatReminderTime(settings);

  return (
    <SetupPage
      step="Étape 3 sur 3"
      back={false}
      title="Me rappeler chaque jour"
      intro={`Chaque jour à ${time}, une notification dit ce qui attend au jardin. Les jours sans rien à faire, pas de notification.`}
      footer={
        <>
          <Button
            title="Oui"
            accessibleName={`Oui, me rappeler chaque jour à ${time}`}
            icon="notifications-outline"
            loading={enable.isPending}
            onPress={() => enable.mutate(settings, { onSettled: leaveSetup })}
          />
          <Button title="Plus tard" variant="secondary" disabled={enable.isPending} onPress={leaveSetup} />
        </>
      }>
      <View style={styles.preview} accessibilityLabel={`Exemple de rappel, à ${time}`}>
        <Card style={styles.notification}>
          <View style={styles.header}>
            <Ionicons aria-hidden name="leaf" size={16} color={colors.primary} />
            <Text style={styles.app}>Jardo</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          <Text style={styles.body}>3 choses au jardin aujourd&apos;hui : arroser (Potager), tailler (Verger), récolter (Framboisiers).</Text>
        </Card>
      </View>
      <Text style={styles.note}>L&apos;heure se change ensuite dans Réglages, comme le rappel lui-même.</Text>
    </SetupPage>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  preview: { paddingHorizontal: spacing.md },
  notification: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  app: { ...typography.caption, fontFamily: fonts.bodySemiBold, color: colors.text, flex: 1 },
  time: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.text },
  note: { ...typography.body, color: colors.text, paddingHorizontal: spacing.md },
}));
