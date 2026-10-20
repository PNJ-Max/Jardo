import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useTask } from '@/api/queries';
import type { GardenTask } from '@/api/types';
import { FormTarget } from '@/components/form-target';
import { taskTitle, useMarkDone } from '@/components/tasks';
import { Button, DateField, ErrorView, Field, Loading, screenStyles } from '@/components/ui';
import { today } from '@/lib/dates';
import { targetLabel } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

/**
 * « Fait » en précisant le jour (une saisie oubliée) ou une note. Ouvert par un appui long sur
 * le bouton « Fait » ; le simple tap, lui, note aujourd'hui sans rien demander.
 *   /task/done?id=4
 */
export default function TaskDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(Number(id));

  if (task.isPending) return <Loading />;
  if (task.error) return <ErrorView error={task.error} onRetry={task.refetch} />;
  return <TaskDoneForm task={task.data} />;
}

function TaskDoneForm({ task }: { task: GardenTask }) {
  const { markDone, isPending } = useMarkDone();
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  const submit = () => markDone(task, { date, note: note.trim() || null }, goBack);

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.form}>
      <Stack.Screen options={{ title: taskTitle(task) }} />

      <FormTarget label={targetLabel(task)} />
      <DateField label="Fait le" noFuture value={date} onChange={setDate} />
      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder={task.title ?? 'Optionnel'}
        maxLength={1000}
        multiline
      />

      <Button title="Noter comme fait" icon="checkmark" onPress={submit} loading={isPending} />
    </ScrollView>
  );
}
