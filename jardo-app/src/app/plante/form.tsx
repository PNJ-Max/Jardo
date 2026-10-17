import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { usePlant, useSavePlant, useZones } from '@/api/queries';
import type { Plant } from '@/api/types';
import {
  apiFieldError,
  Button,
  ChipSelect,
  ErrorView,
  Field,
  FormError,
  Loading,
  screenStyles,
} from '@/components/ui';
import { isDateOnly } from '@/lib/dates';
import { goBack } from '@/lib/navigation';
import { createStyles } from '@/theme';

/**
 * Création ou modification d'une plante.
 *   /plante/form            → nouvelle plante
 *   /plante/form?zoneId=2   → nouvelle plante, zone présélectionnée
 *   /plante/form?id=5       → modification
 */
export default function PlantFormScreen() {
  const { id, zoneId } = useLocalSearchParams<{ id?: string; zoneId?: string }>();

  if (!id) return <PlantForm defaultZoneId={zoneId ? Number(zoneId) : undefined} />;
  return <EditPlant id={Number(id)} />;
}

function EditPlant({ id }: { id: number }) {
  const plant = usePlant(id);
  if (plant.isPending) return <Loading />;
  if (plant.error) return <ErrorView error={plant.error} onRetry={plant.refetch} />;
  return <PlantForm plant={plant.data} />;
}

function PlantForm({ plant, defaultZoneId }: { plant?: Plant; defaultZoneId?: number }) {
  const styles = useStyles();
  const zones = useZones();
  const save = useSavePlant();

  const [name, setName] = useState(plant?.name ?? '');
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [plantedDate, setPlantedDate] = useState(plant?.plantedDate ?? '');
  const [intervalText, setIntervalText] = useState(String(plant?.wateringIntervalDays ?? 3));
  const [zoneId, setZoneId] = useState(plant?.zoneId ?? defaultZoneId);

  // Validation locale minimale, pour guider la saisie. La vraie validation reste celle
  // de l'API : ses messages s'affichent sous les champs en cas de refus.
  const intervalValue = Number(intervalText);
  const intervalError =
    intervalText && !(Number.isInteger(intervalValue) && intervalValue >= 1 && intervalValue <= 365)
      ? 'Entre 1 et 365 jours'
      : undefined;
  const dateError = plantedDate && !isDateOnly(plantedDate) ? 'Format attendu : AAAA-MM-JJ' : undefined;
  const canSubmit = name.trim() && intervalText && !intervalError && !dateError && zoneId;

  const submit = () => {
    if (!zoneId) return;
    save.mutate(
      {
        id: plant?.id,
        input: {
          name: name.trim(),
          species: species.trim() || null,
          plantedDate: plantedDate || null,
          wateringIntervalDays: intervalValue,
          zoneId,
        },
      },
      { onSuccess: goBack },
    );
  };

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: plant ? 'Modifier la plante' : 'Nouvelle plante' }} />

      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Tomate cerise"
        maxLength={100}
        autoFocus={!plant}
        error={apiFieldError(save.error, 'name')}
      />
      <Field
        label="Espèce"
        value={species}
        onChangeText={setSpecies}
        placeholder="Optionnel"
        maxLength={100}
        error={apiFieldError(save.error, 'species')}
      />
      <Field
        label="Arroser tous les … jours"
        value={intervalText}
        onChangeText={setIntervalText}
        keyboardType="number-pad"
        error={intervalError ?? apiFieldError(save.error, 'wateringIntervalDays')}
        hint="2 pour une tomate, 7 pour un arbuste établi"
      />
      <Field
        label="Date de plantation"
        value={plantedDate}
        onChangeText={setPlantedDate}
        placeholder="AAAA-MM-JJ (optionnel)"
        error={dateError ?? apiFieldError(save.error, 'plantedDate')}
      />

      {zones.isPending ? (
        <Loading />
      ) : zones.error ? (
        <ErrorView error={zones.error} onRetry={zones.refetch} />
      ) : zones.data.length === 0 ? (
        <Text style={styles.noZone}>Créez d’abord une zone dans l’onglet Zones.</Text>
      ) : (
        <ChipSelect
          label="Zone"
          options={zones.data.map((z) => ({ value: z.id, label: z.name }))}
          value={zoneId}
          onChange={setZoneId}
          error={apiFieldError(save.error, 'zoneId')}
        />
      )}

      <FormError error={save.error} />
      <Button title="Enregistrer" onPress={submit} loading={save.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const useStyles = createStyles(({ colors, typography }) => ({
  noZone: { ...typography.body, color: colors.danger },
}));
