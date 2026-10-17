import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useSaveZone, useZone } from '@/api/queries';
import type { Zone } from '@/api/types';
import { apiFieldError, Button, ErrorView, Field, FormError, Loading, screenStyles } from '@/components/ui';
import { goBack } from '@/lib/navigation';

/** Création (sans paramètre) ou modification (?id=3) d'une zone. */
export default function ZoneFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const zoneId = id ? Number(id) : undefined;

  if (!zoneId) return <ZoneForm />;
  return <EditZone id={zoneId} />;
}

// Le formulaire n'est monté qu'une fois la zone chargée : ses useState partent ainsi
// directement des bonnes valeurs, sans effet de synchronisation à écrire.
function EditZone({ id }: { id: number }) {
  const zone = useZone(id);
  if (zone.isPending) return <Loading />;
  if (zone.error) return <ErrorView error={zone.error} onRetry={zone.refetch} />;
  return <ZoneForm zone={zone.data} />;
}

function ZoneForm({ zone }: { zone?: Zone }) {
  const [name, setName] = useState(zone?.name ?? '');
  const [description, setDescription] = useState(zone?.description ?? '');
  const save = useSaveZone();

  const submit = () =>
    save.mutate(
      { id: zone?.id, input: { name: name.trim(), description: description.trim() || null } },
      { onSuccess: goBack },
    );

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: zone ? 'Modifier la zone' : 'Nouvelle zone' }} />

      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Potager, Carré nord…"
        maxLength={100}
        autoFocus={!zone}
        error={apiFieldError(save.error, 'name')}
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optionnel"
        maxLength={500}
        multiline
        error={apiFieldError(save.error, 'description')}
      />

      <FormError error={save.error} />
      <Button title="Enregistrer" onPress={submit} loading={save.isPending} disabled={!name.trim()} />
    </ScrollView>
  );
}
