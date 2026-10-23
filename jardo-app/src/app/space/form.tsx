import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useSaveSpace, useSpace } from '@/api/queries';
import type { Id, Space, SpaceKind } from '@/api/types';
import { fieldError, Button, ChipSelect, ErrorView, Field, FormError, Loading, screenStyles } from '@/components/ui';
import { spaceKindOptions } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

/**
 * Création ou modification d'un espace.
 *   /space/form        → nouvel espace
 *   /space/form?id=3   → modification
 */
export default function SpaceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return id ? <EditSpace id={id} /> : <SpaceForm />;
}

function EditSpace({ id }: { id: Id }) {
  const space = useSpace(id);
  if (space.isPending) return <Loading />;
  if (space.error) return <ErrorView error={space.error} onRetry={space.refetch} />;
  return <SpaceForm space={space.data} />;
}

function SpaceForm({ space }: { space?: Space }) {
  const save = useSaveSpace();
  const [name, setName] = useState(space?.name ?? '');
  const [kind, setKind] = useState<SpaceKind | undefined>(space?.kind);
  const [description, setDescription] = useState(space?.description ?? '');

  const submit = () => {
    if (!kind) return;
    save.mutate(
      { id: space?.id, input: { name: name.trim(), kind, description: description.trim() || null } },
      { onSuccess: goBack },
    );
  };

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: space ? "Modifier l'espace" : 'Nouvel espace' }} />

      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Potager du bas"
        maxLength={100}
        autoFocus={!space}
        error={fieldError(save.error, 'name')}
      />
      <ChipSelect
        label="Type"
        options={spaceKindOptions}
        value={kind}
        onChange={setKind}
        error={fieldError(save.error, 'kind')}
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
      <Button title="Enregistrer" onPress={submit} loading={save.isPending} disabled={!name.trim() || !kind} />
    </ScrollView>
  );
}
