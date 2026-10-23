import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useSaveZone, useZone } from '@/api/queries';
import type { Id, Zone } from '@/api/types';
import { fieldError, Button, ErrorView, Field, FormError, Loading, screenStyles } from '@/components/ui';
import { goBack } from '@/lib/navigation';

/**
 * Création ou modification d'une zone.
 *   /zone/form?spaceId=1   → nouvelle zone dans l'espace 1
 *   /zone/form?id=4        → modification
 */
export default function ZoneFormScreen() {
  const { id, spaceId } = useLocalSearchParams<{ id?: string; spaceId?: string }>();
  return id ? <EditZone id={id} /> : <ZoneForm spaceId={spaceId!} />;
}

function EditZone({ id }: { id: Id }) {
  const zone = useZone(id);
  if (zone.isPending) return <Loading />;
  if (zone.error) return <ErrorView error={zone.error} onRetry={zone.refetch} />;
  return <ZoneForm zone={zone.data} spaceId={zone.data.spaceId} />;
}

function ZoneForm({ zone, spaceId }: { zone?: Zone; spaceId: Id }) {
  const save = useSaveZone();
  const [name, setName] = useState(zone?.name ?? '');
  const [description, setDescription] = useState(zone?.description ?? '');

  const submit = () =>
    save.mutate(
      { id: zone?.id, spaceId, input: { name: name.trim(), description: description.trim() || null } },
      { onSuccess: goBack },
    );

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: zone ? 'Modifier la zone' : 'Nouvelle zone' }} />

      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Carré 1"
        maxLength={100}
        autoFocus={!zone}
        error={fieldError(save.error, 'name')}
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optionnel"
        maxLength={500}
        multiline
        error={fieldError(save.error, 'description')}
      />

      <FormError error={save.error} />
      <Button title="Enregistrer" onPress={submit} loading={save.isPending} disabled={!name.trim()} />
    </ScrollView>
  );
}
