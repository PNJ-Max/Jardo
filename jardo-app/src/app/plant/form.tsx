import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { usePlant, useSavePlant } from '@/api/queries';
import type { Plant, QuantityUnit } from '@/api/types';
import { ZoneSelect } from '@/components/zone-select';
import {
  apiFieldError,
  Button,
  ChipSelect,
  DateField,
  ErrorView,
  Field,
  FormError,
  Loading,
  screenStyles,
} from '@/components/ui';
import { decimalText, parseDecimal, quantityUnits } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

const unitOptions = (Object.keys(quantityUnits) as QuantityUnit[]).map((unit) => ({
  value: unit,
  label: quantityUnits[unit].many,
}));

/**
 * Création ou modification d'une plante.
 *   /plant/form?spaceId=1&zoneId=2   → nouvelle plante, zone présélectionnée
 *   /plant/form?id=5                 → modification
 */
export default function PlantFormScreen() {
  const { id, spaceId, zoneId } = useLocalSearchParams<{ id?: string; spaceId?: string; zoneId?: string }>();

  if (id) return <EditPlant id={Number(id)} />;
  return <PlantForm spaceId={Number(spaceId)} defaultZoneId={zoneId ? Number(zoneId) : null} />;
}

function EditPlant({ id }: { id: number }) {
  const plant = usePlant(id);
  if (plant.isPending) return <Loading />;
  if (plant.error) return <ErrorView error={plant.error} onRetry={plant.refetch} />;
  return <PlantForm plant={plant.data} spaceId={plant.data.spaceId} defaultZoneId={plant.data.zoneId} />;
}

function PlantForm({ plant, spaceId, defaultZoneId }: { plant?: Plant; spaceId: number; defaultZoneId: number | null }) {
  const save = useSavePlant();
  const [name, setName] = useState(plant?.name ?? '');
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [variety, setVariety] = useState(plant?.variety ?? '');
  const [quantityText, setQuantityText] = useState(plant ? decimalText(plant.quantity) : '1');
  const [unit, setUnit] = useState<QuantityUnit>(plant?.quantityUnit ?? 'Plants');
  const [sownDate, setSownDate] = useState(plant?.sownDate ?? null);
  const [plantedDate, setPlantedDate] = useState(plant?.plantedDate ?? null);
  const [zoneId, setZoneId] = useState(defaultZoneId);

  // Validation locale minimale, pour guider la saisie. La vraie reste celle de l'API : ses
  // messages s'affichent sous les champs en cas de refus.
  const quantity = parseDecimal(quantityText);
  const quantityError = quantityText && !(quantity && quantity > 0) ? 'Un nombre positif' : undefined;

  const submit = () => {
    if (!quantity) return;
    save.mutate(
      {
        id: plant?.id,
        input: {
          name: name.trim(),
          species: species.trim() || null,
          variety: variety.trim() || null,
          quantity,
          quantityUnit: unit,
          sownDate,
          plantedDate,
          spaceId,
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
        placeholder="Tomates cerises"
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
        label="Variété"
        value={variety}
        onChangeText={setVariety}
        placeholder="Optionnel"
        maxLength={100}
        error={apiFieldError(save.error, 'variety')}
      />
      <Field
        label="Quantité"
        value={quantityText}
        onChangeText={setQuantityText}
        keyboardType="decimal-pad"
        error={quantityError ?? apiFieldError(save.error, 'quantity')}
      />
      <ChipSelect
        label="Unité"
        options={unitOptions}
        value={unit}
        onChange={setUnit}
        error={apiFieldError(save.error, 'quantityUnit')}
      />
      <DateField
        label="Semis"
        optional
        value={sownDate}
        onChange={setSownDate}
        error={apiFieldError(save.error, 'sownDate')}
      />
      <DateField
        label="Plantation"
        optional
        value={plantedDate}
        onChange={setPlantedDate}
        error={apiFieldError(save.error, 'plantedDate')}
      />
      <ZoneSelect spaceId={spaceId} value={zoneId} onChange={setZoneId} error={apiFieldError(save.error, 'zoneId')} />

      <FormError error={save.error} />
      <Button
        title="Enregistrer"
        onPress={submit}
        loading={save.isPending}
        disabled={!name.trim() || !quantity || !!quantityError}
      />
    </ScrollView>
  );
}
