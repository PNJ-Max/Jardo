import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useCompleteTask, useJournal, useTasks } from '@/api/queries';
import type { GardenTask } from '@/api/types';
import { JournalEntryRow } from '@/components/journal';
import { TaskRow } from '@/components/tasks';
import { Button, SectionTitle } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { formatDate } from '@/lib/dates';
import { createStyles, useTheme } from '@/theme';

/** La cible des tâches et interventions d'un écran de détail. */
export type Target = { spaceId: number; zoneId?: number | null; itemId?: number | null; label: string };

/** Paramètres d'URL des formulaires de tâche et d'intervention pour cette cible. */
export function targetParams({ spaceId, zoneId, itemId, label }: Target) {
  return {
    spaceId: String(spaceId),
    ...(zoneId ? { zoneId: String(zoneId) } : {}),
    ...(itemId ? { itemId: String(itemId) } : {}),
    label,
  };
}

const statusRank = (task: GardenTask) =>
  task.isCompleted ? 3 : task.status === 'Overdue' ? 0 : task.status === 'DueSoon' ? 1 : 2;

/** Les plus urgentes d'abord, puis par échéance ; les tâches ponctuelles faites en dernier. */
function byUrgency(a: GardenTask, b: GardenTask) {
  return statusRank(a) - statusRank(b) || (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '');
}

function filterFor(target: Target) {
  return target.itemId
    ? { itemId: target.itemId }
    : target.zoneId
      ? { zoneId: target.zoneId }
      : { spaceId: target.spaceId };
}

export function TasksSection({ target }: { target: Target }) {
  const styles = useStyles();
  const tasks = useTasks(filterFor(target));
  const complete = useCompleteTask();

  return (
    <View style={styles.section}>
      <SectionTitle>Tâches</SectionTitle>
      {tasks.isPending ? (
        <SectionLoading />
      ) : tasks.error ? (
        <Text style={styles.error}>{tasks.error.message}</Text>
      ) : tasks.data.length === 0 ? (
        <Text style={styles.empty}>Aucune tâche prévue.</Text>
      ) : (
        [...tasks.data].sort(byUrgency).map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onPress={() => router.push({ pathname: '/task/form', params: { id: String(task.id) } })}
            onDone={() =>
              complete.mutate(
                { id: task.id },
                { onError: (error) => notify("La tâche n'a pas été notée", error.message) },
              )
            }
          />
        ))
      )}
      <Button
        title="Ajouter une tâche"
        icon="add"
        variant="secondary"
        onPress={() => router.push({ pathname: '/task/form', params: targetParams(target) })}
      />
    </View>
  );
}

const journalPreview = 5;

export function JournalSection({ target }: { target: Target }) {
  const styles = useStyles();
  const journal = useJournal(filterFor(target));
  const [expanded, setExpanded] = useState(false);
  const entries = journal.data ?? [];
  const shown = expanded ? entries : entries.slice(0, journalPreview);

  return (
    <View style={styles.section}>
      <SectionTitle>Journal</SectionTitle>
      <Button
        title="Noter une intervention"
        icon="create-outline"
        onPress={() => router.push({ pathname: '/entry/form', params: targetParams(target) })}
      />
      {journal.isPending ? (
        <SectionLoading />
      ) : journal.error ? (
        <Text style={styles.error}>{journal.error.message}</Text>
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>Rien de noté pour l&apos;instant.</Text>
      ) : (
        shown.map((entry, index) => (
          <View key={entry.id} style={styles.entry}>
            {entry.date !== shown[index - 1]?.date && <Text style={styles.date}>{formatDate(entry.date)}</Text>}
            <JournalEntryRow
              entry={entry}
              onPress={() => router.push({ pathname: '/entry/form', params: { id: String(entry.id) } })}
            />
          </View>
        ))
      )}
      {!expanded && entries.length > journalPreview && (
        <Button
          title={`Voir tout le journal (${entries.length})`}
          variant="secondary"
          onPress={() => setExpanded(true)}
        />
      )}
    </View>
  );
}

type ManageSectionProps = {
  onEdit: () => void;
  /** Absent pour ce qui ne s'archive pas (une zone). */
  archive?: { archived: boolean; onToggle: () => void; loading: boolean };
  onDelete: () => void;
  deleting: boolean;
};

export function ManageSection({ onEdit, archive, onDelete, deleting }: ManageSectionProps) {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <SectionTitle>Gérer</SectionTitle>
      <Button title="Modifier" icon="pencil-outline" variant="secondary" onPress={onEdit} />
      {archive && (
        <Button
          title={archive.archived ? 'Désarchiver' : 'Archiver'}
          icon="archive-outline"
          variant="secondary"
          loading={archive.loading}
          onPress={archive.onToggle}
        />
      )}
      <Button title="Supprimer" icon="trash-outline" variant="danger" loading={deleting} onPress={onDelete} />
    </View>
  );
}

/** Une ligne « libellé : valeur » de fiche ; rien si la valeur manque. */
export function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  const styles = useDetailStyles();
  if (!value) return null;

  return (
    <Text style={styles.fact}>
      <Text style={styles.factLabel}>{label} : </Text>
      {value}
    </Text>
  );
}

function SectionLoading() {
  const { colors } = useTheme();
  return <ActivityIndicator color={colors.primary} />;
}

/** En-tête des écrans de détail : nom, sous-titre, description, pastilles. */
export const useDetailStyles = createStyles(({ colors, typography, spacing }) => ({
  screen: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.lg * 2 },
  header: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  description: { ...typography.body, color: colors.text },
  facts: { gap: spacing.xs },
  fact: { ...typography.body, color: colors.text },
  factLabel: { color: colors.textMuted },
}));

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  section: { gap: spacing.sm },
  empty: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
  entry: { gap: spacing.xs },
  date: { ...typography.caption, fontFamily: fonts.bodySemiBold, color: colors.textMuted },
}));
