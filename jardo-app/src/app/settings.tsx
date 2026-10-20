import { ScrollView } from 'react-native';

import { ChipSelect, screenStyles } from '@/components/ui';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/theme';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

/** Réglages de l'app, mémorisés sur l'appareil. */
export default function SettingsScreen() {
  const preference = useThemePreference();

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <ChipSelect
        label="Apparence"
        options={themeOptions}
        value={preference}
        onChange={setThemePreference}
        hint="« Système » suit le mode clair ou sombre du téléphone."
      />
    </ScrollView>
  );
}
