import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useDeleteTask, useSaveTask, useSpace, useTask } from '@/api/queries';
import type { GardenTask, JournalEntryKind, Space, TaskRecurrence } from '@/api/types';
import { FormTarget } from '@/components/form-target';
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
import { confirm, notify } from '@/lib/confirm';
import { today } from '@/lib/dates';
import { entryKinds, recurrenceOptions, targetLabel, taskKindsFor } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

type Target = { spaceId: number; zoneId: number | null; itemId: number | null; label: string };

const startDateLabels: Record<TaskRecurrence, string> = {
  EveryNDays: 'Première échéance',
  Yearly: 'Date anniversaire',
  Once: 'Jour prévu',
};

/**
 * Créer ou modifier une tâche. La cible vient de l'écran d'où l'on arrive.
 *   /task/form?spaceId=1&itemId=7&label=…   → nouvelle tâche
 *   /task/form?id=4                         → modification
 */
export default function TaskFormScreen() {
  const params = useLocalSearchParams<{ id?: string; spaceId?: string; zoneId?: string; itemId?: string; label?: string }>();

  if (params.id) return <EditTask id={Number(params.id)} />;
  return (
    <TaskFormInSpace
      target={{
        spaceId: Number(params.spaceId),
        zoneId: params.zoneId ? Number(params.zoneId) : null,
        itemId: params.itemId ? Number(params.itemId) : null,
        label: params.label ?? '',
      }}
    />
  );
}

function EditTask({ id }: { id: number }) {
  const task = useTask(id);
  if (task.isPending) return <Loading />;
  if (task.error) return <ErrorView error={task.error} onRetry={task.refetch} />;
  return <TaskFormInSpace task={task.data} target={{ ...task.data, label: targetLabel(task.data) }} />;
}

/** Les types de tâche proposés dépendent du type d'espace. */
function TaskFormInSpace({ task, target }: { task?: GardenTask; target: Target }) {
  const space = useSpace(target.spaceId);
  if (space.isPending) return <Loading />;
  if (space.error) return <ErrorView error={space.error} onRetry={space.refetch} />;
  return <TaskForm task={task} target={target} space={space.data} />;
}

function TaskForm({ task, target, space }: { task?: GardenTask; target: Target; space: Space }) {
  const save = useSaveTask();
  const remove = useDeleteTask();
  const [kind, setKind] = useState<JournalEntryKind | undefined>(task?.kind);
  const [title, setTitle] = useState(task?.title ?? '');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(task?.recurrence ?? 'EveryNDays');
  const [intervalText, setIntervalText] = useState(String(task?.intervalDays ?? 3));
  const [startDate, setStartDate] = useState(task?.startDate ?? today());

  const interval = Number(intervalText);
  const intervalError =
    recurrence === 'EveryNDays' && !(Number.isInteger(interval) && interval >= 1 && interval <= 365)
      ? 'Entre 1 et 365 jours'
      : undefined;
  const canSubmit = kind && !intervalError && (kind !== 'Other' || title.trim());

  const submit = () => {
    if (!kind) return;
    save.mutate(
      {
        id: task?.id,
        input: {
          kind,
          title: title.trim() || null,
          recurrence,
          intervalDays: recurrence === 'EveryNDays' ? interval : null,
          startDate,
          spaceId: target.spaceId,
          zoneId: target.zoneId,
          itemId: target.itemId,
        },
      },
      { onSuccess: goBack },
    );
  };

  const deleteTask = async () => {
    if (!task || !(await confirm('Supprimer cette tâche ?', 'Le journal garde les interventions déjà notées.'))) return;
    remove.mutate(task.id, { onSuccess: goBack, onError: (e) => notify("La tâche n'a pas été supprimée", e.message) });
  };

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: task ? 'Modifier la tâche' : 'Nouvelle tâche' }} />

      {target.label ? <FormTarget label={target.label} /> : null}
      <ChipSelect
        label="À faire"
        options={taskKindsFor(space.kind).map((value) => ({ value, label: entryKinds[value].verb }))}
        value={kind}
        onChange={setKind}
        error={apiFieldError(save.error, 'kind')}
      />
      <Field
        label="Titre"
        value={title}
        onChangeText={setTitle}
        placeholder={kind === 'Other' ? 'Obligatoire : Rentrer le bois…' : 'Optionnel'}
        maxLength={100}
        error={apiFieldError(save.error, 'title')}
      />
      <ChipSelect
        label="Rythme"
        options={recurrenceOptions}
        value={recurrence}
        onChange={setRecurrence}
        error={apiFieldError(save.error, 'recurrence')}
      />
      {recurrence === 'EveryNDays' && (
        <Field
          label="Tous les … jours"
          value={intervalText}
          onChangeText={setIntervalText}
          keyboardType="number-pad"
          error={intervalError ?? apiFieldError(save.error, 'intervalDays')}
        />
      )}
      <DateField
        label={startDateLabels[recurrence]}
        value={startDate}
        onChange={setStartDate}
        error={apiFieldError(save.error, 'startDate')}
      />

      <FormError error={save.error} />
      <Button title="Enregistrer" onPress={submit} loading={save.isPending} disabled={!canSubmit} />
      {task && <Button title="Supprimer" icon="trash-outline" variant="danger" onPress={deleteTask} loading={remove.isPending} />}
    </ScrollView>
  );
}
