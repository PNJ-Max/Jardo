import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useSaveSpace, useSpace } from '@/api/queries';
import type { Id, Space, SpaceKind } from '@/api/types';
import { SpaceKindSelect } from '@/components/space-kind-select';
import { fieldError, Field, FormPending, FormScreen } from '@/components/ui';
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
  if (space.isPending || space.error) {
    return <FormPending title="Modifier l'espace" error={space.error} onRetry={space.refetch} />;
  }
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
    <FormScreen
      title={space ? "Modifier l'espace" : 'Nouvel espace'}
      submitLabel={space ? 'Enregistrer les modifications' : "Créer l'espace"}
      onSubmit={submit}
      loading={save.isPending}
      disabled={!name.trim() || !kind}
      error={save.error}>
      <Field
        label="Nom"
        value={name}
        onChangeText={setName}
        placeholder="Potager du bas"
        maxLength={100}
        autoFocus={!space}
        error={fieldError(save.error, 'name')}
      />
      <SpaceKindSelect value={kind} onChange={setKind} error={fieldError(save.error, 'kind')} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optionnel"
        maxLength={500}
        multiline
        error={fieldError(save.error, 'description')}
      />
    </FormScreen>
  );
}
