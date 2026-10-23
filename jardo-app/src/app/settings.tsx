import Constants from 'expo-constants';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useGarden, useSaveGarden } from '@/api/queries';
import type { Garden } from '@/api/types';
import { fieldError, Button, Card, ChipSelect, Field, FormError, screenStyles, SectionTitle } from '@/components/ui';
import { createStyles, setThemePreference, useTheme, useThemePreference, type ThemePreference } from '@/theme';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

/** Réglages : le jardin, enregistré dans la base locale ; l'apparence, mémorisée sur l'appareil. */
export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const garden = useGarden();
  const preference = useThemePreference();

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={styles.screen}>
      <View style={styles.section}>
        <SectionTitle>Jardin</SectionTitle>
        {garden.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : garden.error ? (
          <Text style={styles.error}>{garden.error.message}</Text>
        ) : (
          <GardenName garden={garden.data} />
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle>Apparence</SectionTitle>
        <ChipSelect
          label="Thème"
          options={themeOptions}
          value={preference}
          onChange={setThemePreference}
          hint="« Système » suit le mode clair ou sombre du téléphone."
        />
      </View>

      <View style={styles.section}>
        <SectionTitle>À propos</SectionTitle>
        <Card style={styles.about}>
          <Text style={styles.appName}>Jardo</Text>
          <Text style={styles.text}>Version {Constants.expoConfig?.version ?? 'inconnue'}</Text>
          <Text style={styles.muted}>Ce que contient le jardin, ce qu&apos;on y fait, et ce qui reste à faire.</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function GardenName({ garden }: { garden: Garden }) {
  const styles = useStyles();
  const save = useSaveGarden();
  const [name, setName] = useState(garden.name);
  const trimmed = name.trim();
  const changed = trimmed !== garden.name;

  return (
    <View style={styles.section}>
      <Field
        label="Nom du jardin"
        value={name}
        onChangeText={(text) => {
          setName(text);
          save.reset();
        }}
        maxLength={100}
        error={fieldError(save.error, 'Name')}
        hint={save.isSuccess && !changed ? 'Nom enregistré.' : "Il s'affiche en tête de l'onglet Jardin."}
      />
      <FormError error={save.error} />
      {changed && (
        <Button
          title="Enregistrer le nom"
          icon="checkmark"
          disabled={trimmed === ''}
          loading={save.isPending}
          onPress={() => save.mutate({ name: trimmed })}
        />
      )}
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  screen: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.lg * 2 },
  section: { gap: spacing.sm },
  error: { ...typography.body, color: colors.danger },
  about: { gap: spacing.xs },
  appName: { ...typography.subtitle, color: colors.text },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
}));
