import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useDeleteJournalEntry, useJournalEntry, useSaveJournalEntry, useSpace } from '@/api/queries';
import type { Id, JournalEntry, JournalEntryKind, MeasureUnit, Space } from '@/api/types';
import { FormTarget } from '@/components/form-target';
import {
  fieldError,
  Button,
  ChipSelect,
  DateField,
  ErrorView,
  Field,
  FormError,
  Loading,
  screenStyles,
} from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { today } from '@/lib/dates';
import {
  decimalText,
  entryKinds,
  entryKindsFor,
  harvestUnits,
  isWoodKind,
  measureUnits,
  parseDecimal,
  targetLabel,
} from '@/lib/garden';
import { goBack } from '@/lib/navigation';

type Target = { spaceId: Id; zoneId: Id | null; itemId: Id | null; label: string };

/**
 * Noter ou corriger une intervention. La cible vient de l'écran d'où l'on arrive.
 *   /entry/form?spaceId=1&zoneId=2&itemId=7&label=…   → nouvelle intervention
 *   /entry/form?id=30                                  → correction
 */
export default function EntryFormScreen() {
  const params = useLocalSearchParams<{ id?: string; spaceId?: string; zoneId?: string; itemId?: string; label?: string }>();

  if (params.id) return <EditEntry id={params.id} />;
  return (
    <EntryFormInSpace
      target={{
        spaceId: params.spaceId!,
        zoneId: params.zoneId || null,
        itemId: params.itemId || null,
        label: params.label ?? '',
      }}
    />
  );
}

function EditEntry({ id }: { id: Id }) {
  const entry = useJournalEntry(id);
  if (entry.isPending) return <Loading />;
  if (entry.error) return <ErrorView error={entry.error} onRetry={entry.refetch} />;
  return <EntryFormInSpace entry={entry.data} target={{ ...entry.data, label: targetLabel(entry.data) }} />;
}

/** Les types d'intervention proposés dépendent du type d'espace. */
function EntryFormInSpace({ entry, target }: { entry?: JournalEntry; target: Target }) {
  const space = useSpace(target.spaceId);
  if (space.isPending) return <Loading />;
  if (space.error) return <ErrorView error={space.error} onRetry={space.refetch} />;
  return <EntryForm entry={entry} target={target} space={space.data} />;
}

function EntryForm({ entry, target, space }: { entry?: JournalEntry; target: Target; space: Space }) {
  const save = useSaveJournalEntry();
  const remove = useDeleteJournalEntry();
  const [kind, setKind] = useState<JournalEntryKind | undefined>(entry?.kind);
  const [date, setDate] = useState(entry?.date ?? today());
  const [note, setNote] = useState(entry?.note ?? '');
  const [quantityText, setQuantityText] = useState(entry?.quantity ? decimalText(entry.quantity) : '');
  const [harvestUnit, setHarvestUnit] = useState<MeasureUnit>(
    entry?.quantityUnit && entry.quantityUnit !== 'Steres' ? entry.quantityUnit : 'Kilograms',
  );
  const [heightText, setHeightText] = useState(entry?.heightCm ? String(entry.heightCm) : '');
  const [problem, setProblem] = useState(entry?.problem ?? '');
  const [treatment, setTreatment] = useState(entry?.treatment ?? '');

  const isHarvest = kind === 'Harvest';
  const isWood = kind !== undefined && isWoodKind(kind);
  const hasHeight = kind === 'Observation';
  const hasCare = kind === 'Observation' || kind === 'Treatment';
  const quantity = parseDecimal(quantityText);
  const canSubmit = kind && (!isWood || quantity) && (kind !== 'Other' || note.trim());

  const submit = () => {
    if (!kind) return;
    // Seuls les champs du type choisi partent : changer de type en cours de saisie n'envoie
    // pas de valeur restée dans un champ masqué.
    const withQuantity = isHarvest || isWood;
    save.mutate(
      {
        id: entry?.id,
        input: {
          kind,
          date,
          note: note.trim() || null,
          quantity: withQuantity ? quantity : null,
          quantityUnit: withQuantity && quantity ? (isWood ? 'Steres' : harvestUnit) : null,
          heightCm: hasHeight ? parseDecimal(heightText) : null,
          problem: hasCare ? problem.trim() || null : null,
          treatment: hasCare ? treatment.trim() || null : null,
          spaceId: target.spaceId,
          zoneId: target.zoneId,
          itemId: target.itemId,
        },
      },
      { onSuccess: goBack },
    );
  };

  const deleteEntry = async () => {
    if (!entry || !(await confirm('Supprimer cette intervention ?', 'Elle disparaîtra du journal.'))) return;
    remove.mutate(entry.id, { onSuccess: goBack, onError: (e) => notify("L'intervention n'a pas été supprimée", e.message) });
  };

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: entry ? "Corriger l'intervention" : 'Noter une intervention' }} />

      {target.label ? <FormTarget label={target.label} /> : null}
      <ChipSelect
        label="Intervention"
        options={entryKindsFor(space.kind).map((value) => ({ value, label: entryKinds[value].label }))}
        value={kind}
        onChange={setKind}
        error={fieldError(save.error, 'kind')}
      />
      <DateField label="Date" noFuture value={date} onChange={setDate} error={fieldError(save.error, 'date')} />

      {(isHarvest || isWood) && (
        <Field
          label={isWood ? 'Volume en stères' : 'Quantité récoltée'}
          value={quantityText}
          onChangeText={setQuantityText}
          keyboardType="decimal-pad"
          placeholder={isWood ? undefined : 'Optionnel'}
          error={fieldError(save.error, 'quantity')}
        />
      )}
      {isHarvest && (
        <ChipSelect
          label="Unité"
          options={harvestUnits.map((value) => ({ value, label: measureUnits[value].many }))}
          value={harvestUnit}
          onChange={setHarvestUnit}
          error={fieldError(save.error, 'quantityUnit')}
        />
      )}
      {hasHeight && (
        <Field
          label="Hauteur (cm)"
          value={heightText}
          onChangeText={setHeightText}
          keyboardType="number-pad"
          placeholder="Optionnel"
          error={fieldError(save.error, 'heightCm')}
        />
      )}
      {hasCare && (
        <>
          <Field
            label="Problème constaté"
            value={problem}
            onChangeText={setProblem}
            placeholder="Optionnel"
            maxLength={500}
            error={fieldError(save.error, 'problem')}
          />
          <Field
            label="Traitement appliqué"
            value={treatment}
            onChangeText={setTreatment}
            placeholder="Optionnel"
            maxLength={500}
            error={fieldError(save.error, 'treatment')}
          />
        </>
      )}
      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder={kind === 'Other' ? 'Obligatoire : ce qui a été fait' : 'Optionnel'}
        maxLength={1000}
        multiline
        error={fieldError(save.error, 'note')}
      />

      <FormError error={save.error} />
      <Button title="Enregistrer" onPress={submit} loading={save.isPending} disabled={!canSubmit} />
      {entry && <Button title="Supprimer" icon="trash-outline" variant="danger" onPress={deleteEntry} loading={remove.isPending} />}
    </ScrollView>
  );
}
