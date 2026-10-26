import Constants from 'expo-constants';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useExportGarden, useGarden, useImportGarden, useReadBackupFile, useSaveGarden } from '@/api/queries';
import type { Garden, GardenBackup } from '@/api/types';
import { fieldError, Button, Card, ChipSelect, Field, FormError, screenStyles, SectionTitle } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { formatLongDate, toDateOnly } from '@/lib/dates';
import { formatQuantity } from '@/lib/garden';
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
  // Le champ du nom garde sa saisie : après un import, il repart du nom du jardin importé.
  const [imports, setImports] = useState(0);

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={styles.screen}>
      <View style={styles.section}>
        <SectionTitle>Jardin</SectionTitle>
        {garden.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : garden.error ? (
          <Text style={styles.error}>{garden.error.message}</Text>
        ) : (
          <GardenName key={imports} garden={garden.data} />
        )}
      </View>

      <GardenBackupSection onImported={() => setImports((count) => count + 1)} />

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

const count = (value: number, one: string, many: string) => formatQuantity(value, { one, many });

/** Ce que le fichier apporte, pour que la confirmation dise ce qui va remplacer le jardin. */
function describeBackup({ exportedAt, tables }: GardenBackup): string {
  const contents = [
    count(tables.spaces.length, 'espace', 'espaces'),
    count(tables.garden_items.length, 'plante ou tas de bois', 'plantes et tas de bois'),
    count(tables.journal_entries.length, 'entrée du journal', 'entrées du journal'),
    count(tables.garden_tasks.length, 'tâche', 'tâches'),
  ];
  return (
    `Le fichier contient le jardin « ${tables.gardens[0].name} », exporté le ` +
    `${formatLongDate(toDateOnly(new Date(exportedAt)))} : ${contents.join(', ')}.`
  );
}

/** Export et import d'un fichier : sans serveur, c'est la sauvegarde du jardin hors du téléphone. */
function GardenBackupSection({ onImported }: { onImported: () => void }) {
  const styles = useStyles();
  const exportGarden = useExportGarden();
  const readFile = useReadBackupFile();
  const importGarden = useImportGarden();
  const importError = readFile.error ?? importGarden.error;

  function chooseFile() {
    exportGarden.reset();
    importGarden.reset();
    // Pas d'indicateur d'attente : un navigateur ne signale pas toujours que l'on renonce au choix.
    readFile.mutate(undefined, {
      onSuccess: async (file) => {
        if (!file) return;
        const confirmed = await confirm(
          'Remplacer le jardin actuel ?',
          `${describeBackup(file)}\n\nTout le jardin actuel sera remplacé par celui du fichier, sans retour possible.`,
          'Remplacer',
        );
        if (confirmed) importGarden.mutate(file, { onSuccess: onImported });
      },
    });
  }

  return (
    <View style={styles.section}>
      <SectionTitle>Sauvegarde</SectionTitle>
      <Text style={styles.muted}>
        Le fichier exporté contient tout le jardin : espaces, zones, plantes, tas de bois, journal, tâches et carte.
        Gardez-le en lieu sûr, et ne l&apos;envoyez qu&apos;à quelqu&apos;un qui peut tout voir.
      </Text>
      <Button
        title="Exporter mon jardin"
        icon="share-outline"
        loading={exportGarden.isPending}
        onPress={() => {
          importGarden.reset();
          exportGarden.mutate();
        }}
      />
      {exportGarden.isSuccess && <Text style={styles.muted}>Fichier exporté : {exportGarden.data}.</Text>}
      {exportGarden.error && <Text style={styles.error}>Export impossible : {exportGarden.error.message}</Text>}

      <Button title="Importer un jardin" icon="download-outline" variant="secondary" loading={importGarden.isPending} onPress={chooseFile} />
      <Text style={styles.muted}>L&apos;import remplace tout le jardin actuel par celui du fichier, après confirmation.</Text>
      {importGarden.isSuccess && <Text style={styles.text}>Jardin importé.</Text>}
      {importError && <Text style={styles.error}>Import impossible, rien n&apos;a été modifié. {importError.message}</Text>}
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
