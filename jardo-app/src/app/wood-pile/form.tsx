import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useSaveWoodPile, useWoodPile } from '@/api/queries';
import type { Id, WoodPile } from '@/api/types';
import { ZoneSelect } from '@/components/zone-select';
import { fieldError, DateField, Field, FormPending, FormScreen } from '@/components/ui';
import { today } from '@/lib/dates';
import { decimalText, parseDecimal } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

/**
 * Création ou modification d'un tas de bois, dans un espace bois de chauffage.
 *   /wood-pile/form?spaceId=4   → nouveau tas
 *   /wood-pile/form?id=12       → modification
 */
export default function WoodPileFormScreen() {
  const { id, spaceId, zoneId } = useLocalSearchParams<{ id?: string; spaceId?: string; zoneId?: string }>();

  if (id) return <EditWoodPile id={id} />;
  return <WoodPileForm spaceId={spaceId!} defaultZoneId={zoneId || null} />;
}

function EditWoodPile({ id }: { id: Id }) {
  const pile = useWoodPile(id);
  if (pile.isPending || pile.error) {
    return <FormPending title="Modifier le tas" error={pile.error} onRetry={pile.refetch} />;
  }
  return <WoodPileForm pile={pile.data} spaceId={pile.data.spaceId} defaultZoneId={pile.data.zoneId} />;
}

function WoodPileForm({ pile, spaceId, defaultZoneId }: { pile?: WoodPile; spaceId: Id; defaultZoneId: Id | null }) {
  const save = useSaveWoodPile();
  const [name, setName] = useState(pile?.name ?? '');
  const [species, setSpecies] = useState(pile?.woodSpecies ?? '');
  const [steresText, setSteresText] = useState(pile ? decimalText(pile.initialSteres) : '');
  const [logLengthText, setLogLengthText] = useState(pile?.logLengthCm ? String(pile.logLengthCm) : '');
  const [cutDate, setCutDate] = useState(pile?.cutDate ?? today());
  const [dryingText, setDryingText] = useState(String(pile?.dryingMonths ?? 24));
  const [zoneId, setZoneId] = useState(defaultZoneId);

  const steres = parseDecimal(steresText);
  const logLength = parseDecimal(logLengthText);
  const dryingMonths = parseDecimal(dryingText);
  const canSubmit = name.trim() && steres && dryingMonths !== null;

  const submit = () => {
    if (!steres || dryingMonths === null) return;
    save.mutate(
      {
        id: pile?.id,
        input: {
          name: name.trim(),
          woodSpecies: species.trim() || null,
          initialSteres: steres,
          logLengthCm: logLength,
          cutDate,
          dryingMonths,
          spaceId,
          zoneId,
        },
      },
      { onSuccess: goBack },
    );
  };

  return (
    <FormScreen
      title={pile ? 'Modifier le tas' : 'Nouveau tas de bois'}
      submitLabel={pile ? 'Enregistrer les modifications' : 'Créer le tas'}
      onSubmit={submit}
      loading={save.isPending}
      disabled={!canSubmit}
      error={save.error}>
      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Chêne 2026"
        maxLength={100}
        autoFocus={!pile}
        error={fieldError(save.error, 'name')}
      />
      <Field
        label="Essence"
        value={species}
        onChangeText={setSpecies}
        placeholder="Chêne, hêtre, charme… (optionnel)"
        maxLength={100}
        error={fieldError(save.error, 'woodSpecies')}
      />
      <Field
        label="Volume en stères"
        value={steresText}
        onChangeText={setSteresText}
        keyboardType="decimal-pad"
        error={fieldError(save.error, 'initialSteres')}
      />
      <Field
        label="Longueur des bûches (cm)"
        value={logLengthText}
        onChangeText={setLogLengthText}
        keyboardType="number-pad"
        placeholder="Optionnel"
        error={fieldError(save.error, 'logLengthCm')}
      />
      <DateField label="Date de coupe" value={cutDate} onChange={setCutDate} error={fieldError(save.error, 'cutDate')} />
      <Field
        label="Durée de séchage (mois)"
        value={dryingText}
        onChangeText={setDryingText}
        keyboardType="number-pad"
        hint="0 pour du bois acheté sec"
        error={fieldError(save.error, 'dryingMonths')}
      />
      <ZoneSelect spaceId={spaceId} value={zoneId} onChange={setZoneId} error={fieldError(save.error, 'zoneId')} />
    </FormScreen>
  );
}
