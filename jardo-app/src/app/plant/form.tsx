import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { usePlant, useSavePlant, useTasks } from '@/api/queries';
import type { Id, JournalEntryKind, Plant, QuantityUnit } from '@/api/types';
import { FormProposals } from '@/components/species-proposals';
import { SpeciesSelect } from '@/components/species-select';
import { ZoneSelect } from '@/components/zone-select';
import {
  fieldError,
  ChipSelect,
  DateField,
  Field,
  FormPending,
  FormScreen,
  leaveForm,
  useChanged,
} from '@/components/ui';
import { findSpecies } from '@/data/species';
import { proposeReminders } from '@/domain/reminder-proposals';
import { referenceClimate, type Species } from '@/domain/species';
import { decimalText, parseDecimal, quantityUnits } from '@/lib/garden';
import { useToday } from '@/lib/use-today';

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

  if (id) return <EditPlant id={id} />;
  return <PlantForm spaceId={spaceId!} defaultZoneId={zoneId || null} />;
}

function EditPlant({ id }: { id: Id }) {
  const plant = usePlant(id);
  if (plant.isPending || plant.error) {
    return <FormPending title="Modifier la plante" error={plant.error} onRetry={plant.refetch} />;
  }
  return <PlantForm plant={plant.data} spaceId={plant.data.spaceId} defaultZoneId={plant.data.zoneId} />;
}

function PlantForm({ plant, spaceId, defaultZoneId }: { plant?: Plant; spaceId: Id; defaultZoneId: Id | null }) {
  const save = useSavePlant();
  const [name, setName] = useState(plant?.name ?? '');
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [speciesId, setSpeciesId] = useState(plant?.speciesId ?? null);
  const [variety, setVariety] = useState(plant?.variety ?? '');
  const [quantityText, setQuantityText] = useState(plant ? decimalText(plant.quantity) : '1');
  const [unit, setUnit] = useState<QuantityUnit>(plant?.quantityUnit ?? 'Plants');
  const [unitChosen, setUnitChosen] = useState(!!plant);
  const [prefilledName, setPrefilledName] = useState<string | null>(null);
  const [sownDate, setSownDate] = useState(plant?.sownDate ?? null);
  const [plantedDate, setPlantedDate] = useState(plant?.plantedDate ?? null);
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [accepted, setAccepted] = useState<JournalEntryKind[]>([]);
  const changed = useChanged([name, species, speciesId, variety, quantityText, unit, sownDate, plantedDate, zoneId, accepted]);
  const day = useToday();
  const tasks = useTasks({ spaceId });

  const known = speciesId ? findSpecies(speciesId) : undefined;
  // En attendant le climat du jardin (étude, PR 7), celui pour lequel les fiches sont écrites.
  const proposals =
    known && tasks.data && !plant?.isArchived
      ? proposeReminders({
          species: known,
          plant: { id: plant?.id ?? null, zoneId, sownDate, plantedDate },
          tasks: tasks.data,
          on: day,
          climate: referenceClimate,
        })
      : [];

  // Validation locale minimale, pour guider la saisie. La vraie reste celle du service : ses
  // messages s'affichent sous les champs en cas de refus.
  const quantity = parseDecimal(quantityText);
  const quantityError = quantityText && !(quantity && quantity > 0) ? 'Un nombre positif' : undefined;

  // Le catalogue propose : il ne remplace jamais une saisie, seulement ce qu'il a lui-même rempli.
  const selectSpecies = (chosen: Species) => {
    setSpecies(chosen.name);
    setSpeciesId(chosen.id);
    setAccepted([]);
    if (!name.trim() || name === prefilledName) {
      setName(chosen.name);
      setPrefilledName(chosen.name);
    }
    if (!unitChosen) setUnit(chosen.quantityUnit);
  };

  const setFreeSpecies = (text: string) => {
    setSpecies(text);
    setSpeciesId(null);
    setAccepted([]);
  };

  const submit = () => {
    if (!quantity) return;
    save.mutate(
      {
        id: plant?.id,
        input: {
          name: name.trim(),
          species: species.trim() || null,
          speciesId,
          variety: variety.trim() || null,
          quantity,
          quantityUnit: unit,
          sownDate,
          plantedDate,
          spaceId,
          zoneId,
        },
        reminders: proposals.filter((proposal) => accepted.includes(proposal.kind)),
      },
      { onSuccess: leaveForm },
    );
  };

  return (
    <FormScreen
      title={plant ? 'Modifier la plante' : 'Nouvelle plante'}
      submitLabel={plant ? 'Enregistrer les modifications' : 'Créer la plante'}
      onSubmit={submit}
      loading={save.isPending}
      disabled={!name.trim() || !quantity || !!quantityError}
      error={save.error}
      dirty={changed}>
      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Tomates cerises"
        maxLength={100}
        autoFocus={!plant}
        error={fieldError(save.error, 'name')}
      />
      <SpeciesSelect
        spaceId={spaceId}
        species={species}
        speciesId={speciesId}
        onSelect={selectSpecies}
        onFreeText={setFreeSpecies}
        error={fieldError(save.error, 'species') ?? fieldError(save.error, 'speciesId')}
      />
      <FormProposals proposals={proposals} on={day} accepted={accepted} onChange={setAccepted} />
      <Field
        label="Variété"
        value={variety}
        onChangeText={setVariety}
        placeholder="Optionnel"
        maxLength={100}
        error={fieldError(save.error, 'variety')}
      />
      <Field
        label="Quantité"
        value={quantityText}
        onChangeText={setQuantityText}
        keyboardType="decimal-pad"
        error={quantityError ?? fieldError(save.error, 'quantity')}
      />
      <ChipSelect
        label="Unité"
        options={unitOptions}
        value={unit}
        onChange={(chosen) => {
          setUnit(chosen);
          setUnitChosen(true);
        }}
        error={fieldError(save.error, 'quantityUnit')}
      />
      <DateField
        label="Semis"
        optional
        value={sownDate}
        onChange={setSownDate}
        error={fieldError(save.error, 'sownDate')}
      />
      <DateField
        label="Plantation"
        optional
        value={plantedDate}
        onChange={setPlantedDate}
        error={fieldError(save.error, 'plantedDate')}
      />
      <ZoneSelect spaceId={spaceId} value={zoneId} onChange={setZoneId} error={fieldError(save.error, 'zoneId')} />
    </FormScreen>
  );
}
