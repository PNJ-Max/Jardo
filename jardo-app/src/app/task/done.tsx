import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useDefaultHarvestUnit, useTask } from '@/api/queries';
import type { GardenTask, MeasureUnit } from '@/api/types';
import { FormTarget } from '@/components/form-target';
import { taskTitle, useMarkDone } from '@/components/tasks';
import { ChipSelect, DateField, Field, FormPending, FormScreen, leaveForm, useChanged } from '@/components/ui';
import { today } from '@/lib/dates';
import { harvestUnits, measureUnits, parseDecimal, targetLabel } from '@/lib/garden';

/**
 * « Fait » en précisant le jour (une saisie oubliée), une note et, pour une récolte, la quantité.
 * Ouvert par un appui long sur le bouton « Fait » ; le simple tap, lui, note aujourd'hui sans rien
 * demander.
 *   /task/done?id=4
 */
export default function TaskDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);
  const unit = useDefaultHarvestUnit(task.data?.kind === 'Harvest' ? task.data.itemId : null);

  if (task.isPending || task.error || unit.isLoading) {
    return <FormPending title="Fait" error={task.error} onRetry={task.refetch} />;
  }
  return <TaskDoneForm task={task.data} defaultUnit={unit.data ?? 'Kilograms'} />;
}

function TaskDoneForm({ task, defaultUnit }: { task: GardenTask; defaultUnit: MeasureUnit }) {
  const { markDone, isPending } = useMarkDone();
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [quantityText, setQuantityText] = useState('');
  const [harvestUnit, setHarvestUnit] = useState(defaultUnit);

  const changed = useChanged([date, note, quantityText, harvestUnit]);
  const quantity = parseDecimal(quantityText);

  const submit = () =>
    markDone(
      task,
      { date, note: note.trim() || null, quantity, quantityUnit: quantity ? harvestUnit : null },
      leaveForm,
    );

  return (
    <FormScreen title={taskTitle(task)} submitLabel="Noter comme fait" onSubmit={submit} loading={isPending} dirty={changed}>
      <FormTarget label={targetLabel(task)} />
      <DateField
        label="Fait le"
        noFuture
        notBefore={task.recurrence === 'Once' ? task.openedOn : undefined}
        value={date}
        onChange={setDate}
      />
      {task.kind === 'Harvest' && (
        <>
          <Field
            label="Quantité récoltée"
            value={quantityText}
            onChangeText={setQuantityText}
            keyboardType="decimal-pad"
            placeholder="Optionnel"
          />
          <ChipSelect
            label="Unité"
            options={harvestUnits.map((value) => ({ value, label: measureUnits[value].many }))}
            value={harvestUnit}
            onChange={setHarvestUnit}
          />
        </>
      )}
      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder={task.title ?? 'Optionnel'}
        maxLength={1000}
        multiline
      />
    </FormScreen>
  );
}
