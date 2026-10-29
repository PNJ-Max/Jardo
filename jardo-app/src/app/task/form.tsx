import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useDeleteTask, useSaveTask, useSpace, useTask } from '@/api/queries';
import type { GardenTask, Id, ItemKind, JournalEntryKind, Space, TaskRecurrence } from '@/api/types';
import { FormTarget } from '@/components/form-target';
import {
  fieldError,
  Button,
  ChipSelect,
  DateField,
  Field,
  FormPending,
  FormScreen,
} from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { today } from '@/lib/dates';
import { entryKinds, recurrenceOptions, targetLabel, taskKindsFor } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

type Target = { spaceId: Id; zoneId: Id | null; itemId: Id | null; itemKind: ItemKind | null; label: string };

const startDateLabels: Record<TaskRecurrence, string> = {
  EveryNDays: 'Première échéance',
  Yearly: 'Date anniversaire',
  Once: 'Jour prévu',
};

/**
 * Créer ou modifier une tâche. La cible vient de l'écran d'où l'on arrive.
 *   /task/form?spaceId=1&itemId=7&itemKind=Plant&label=…   → nouvelle tâche
 *   /task/form?id=4                                        → modification
 */
export default function TaskFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    spaceId?: string;
    zoneId?: string;
    itemId?: string;
    itemKind?: ItemKind;
    label?: string;
  }>();

  if (params.id) return <EditTask id={params.id} />;
  return (
    <TaskFormInSpace
      target={{
        spaceId: params.spaceId!,
        zoneId: params.zoneId || null,
        itemId: params.itemId || null,
        itemKind: params.itemKind ?? null,
        label: params.label ?? '',
      }}
    />
  );
}

function EditTask({ id }: { id: Id }) {
  const task = useTask(id);
  if (task.isPending || task.error) {
    return <FormPending title="Modifier la tâche" error={task.error} onRetry={task.refetch} />;
  }
  return <TaskFormInSpace task={task.data} target={{ ...task.data, label: targetLabel(task.data) }} />;
}

/** Les types de tâche proposés dépendent de la cible : son élément, sinon son espace. */
function TaskFormInSpace({ task, target }: { task?: GardenTask; target: Target }) {
  const space = useSpace(target.spaceId);
  if (space.isPending || space.error) {
    return (
      <FormPending title={task ? 'Modifier la tâche' : 'Nouvelle tâche'} error={space.error} onRetry={space.refetch} />
    );
  }
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
    <FormScreen
      title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}
      submitLabel={task ? 'Enregistrer les modifications' : 'Créer la tâche'}
      onSubmit={submit}
      loading={save.isPending}
      disabled={!canSubmit}
      error={save.error}>
      {target.label ? <FormTarget label={target.label} /> : null}
      <ChipSelect
        label="À faire"
        options={taskKindsFor(space.kind, target.itemKind).map((value) => ({ value, label: entryKinds[value].verb }))}
        value={kind}
        onChange={setKind}
        error={fieldError(save.error, 'kind')}
      />
      <Field
        label="Titre"
        value={title}
        onChangeText={setTitle}
        placeholder={kind === 'Other' ? 'Obligatoire : Rentrer le bois…' : 'Optionnel'}
        maxLength={100}
        error={fieldError(save.error, 'title')}
      />
      <ChipSelect
        label="Rythme"
        options={recurrenceOptions}
        value={recurrence}
        onChange={setRecurrence}
        error={fieldError(save.error, 'recurrence')}
      />
      {recurrence === 'EveryNDays' && (
        <Field
          label="Tous les … jours"
          value={intervalText}
          onChangeText={setIntervalText}
          keyboardType="number-pad"
          error={intervalError ?? fieldError(save.error, 'intervalDays')}
        />
      )}
      <DateField
        label={startDateLabels[recurrence]}
        value={startDate}
        onChange={setStartDate}
        error={fieldError(save.error, 'startDate')}
      />

      {task && <Button title="Supprimer" icon="trash-outline" variant="danger" onPress={deleteTask} loading={remove.isPending} />}
    </FormScreen>
  );
}
