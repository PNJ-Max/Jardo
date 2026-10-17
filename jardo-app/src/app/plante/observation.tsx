import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useAddObservation } from '@/api/queries';
import { apiFieldError, Button, Field, FormError, screenStyles } from '@/components/ui';
import { isDateOnly, today } from '@/lib/dates';
import { goBack } from '@/lib/navigation';

/** Nouvelle entrée de journal : /plante/observation?plantId=5 */
export default function ObservationFormScreen() {
  const plantId = Number(useLocalSearchParams<{ plantId: string }>().plantId);
  const add = useAddObservation();

  const [observedAt, setObservedAt] = useState(today());
  const [note, setNote] = useState('');
  const [height, setHeight] = useState('');
  const [problemNote, setProblemNote] = useState('');
  const [treatment, setTreatment] = useState('');

  const heightValue = Number(height);
  const heightError =
    height && !(Number.isInteger(heightValue) && heightValue >= 0 && heightValue <= 1000)
      ? 'Entre 0 et 1000 cm'
      : undefined;
  const dateError = !isDateOnly(observedAt) ? 'Format attendu : AAAA-MM-JJ' : undefined;
  const canSubmit = note.trim() && !heightError && !dateError;

  const submit = () =>
    add.mutate(
      {
        plantId,
        input: {
          observedAt,
          note: note.trim(),
          heightCm: height ? heightValue : null,
          problemNote: problemNote.trim() || null,
          treatment: treatment.trim() || null,
        },
      },
      { onSuccess: goBack },
    );

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: 'Nouvelle observation' }} />

      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder="Premières fleurs, feuilles jaunes…"
        maxLength={1000}
        multiline
        autoFocus
        error={apiFieldError(add.error, 'note')}
      />
      <Field
        label="Date"
        value={observedAt}
        onChangeText={setObservedAt}
        placeholder="AAAA-MM-JJ"
        error={dateError ?? apiFieldError(add.error, 'observedAt')}
      />
      <Field
        label="Hauteur (cm)"
        value={height}
        onChangeText={setHeight}
        keyboardType="number-pad"
        placeholder="Optionnel"
        error={heightError ?? apiFieldError(add.error, 'heightCm')}
      />
      <Field
        label="Problème constaté"
        value={problemNote}
        onChangeText={setProblemNote}
        placeholder="Maladie, parasite… (optionnel)"
        maxLength={500}
        error={apiFieldError(add.error, 'problemNote')}
      />
      <Field
        label="Traitement appliqué"
        value={treatment}
        onChangeText={setTreatment}
        placeholder="Optionnel"
        maxLength={500}
        error={apiFieldError(add.error, 'treatment')}
      />

      <FormError error={add.error} />
      <Button title="Enregistrer" onPress={submit} loading={add.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}
