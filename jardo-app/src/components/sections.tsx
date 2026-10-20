import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useJournal, useTasks } from '@/api/queries';
import type { GardenTask, ItemKind } from '@/api/types';
import { JournalEntryRow } from '@/components/journal';
import { TaskRow, useMarkDone } from '@/components/tasks';
import { Button, SectionTitle, Tabs } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { createStyles, useTheme } from '@/theme';

/** La cible des tâches et interventions d'un écran de détail. */
export type Target = {
  spaceId: number;
  zoneId?: number | null;
  itemId?: number | null;
  itemKind?: ItemKind;
  label: string;
};

/** Paramètres d'URL des formulaires de tâche et d'intervention pour cette cible. */
export function targetParams({ spaceId, zoneId, itemId, itemKind, label }: Target) {
  return {
    spaceId: String(spaceId),
    ...(zoneId ? { zoneId: String(zoneId) } : {}),
    ...(itemId ? { itemId: String(itemId) } : {}),
    ...(itemKind ? { itemKind } : {}),
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

/** « cette plante », « ce tas »… : ce que désigne la fiche, dans les libellés de ses tâches. */
function targetNoun({ itemId, itemKind, zoneId }: Target) {
  if (itemId) return itemKind === 'WoodPile' ? 'ce tas' : 'cette plante';
  return zoneId ? 'cette zone' : 'cet espace';
}

type TaskGroup = { key: string; name: string; kind?: string; tasks: GardenTask[]; showTarget: boolean };

/**
 * L'API renvoie avec les tâches d'une cible celles de ce qui la contient (un arrosage du carré vaut
 * pour ses plantes) et, pour un espace ou une zone, celles de ce qu'ils contiennent. La fiche sépare
 * ce qui appartient à la cible de ce qui vient d'ailleurs, rangé par provenance.
 */
function splitTasks(target: Target, tasks: GardenTask[]) {
  const sorted = [...tasks].sort(byUrgency);
  const onSpace = sorted.filter((task) => !task.zoneId && !task.itemId);
  const onZone = sorted.filter((task) => task.zoneId && !task.itemId);
  const onItems = sorted.filter((task) => task.itemId);
  const fromSpace = (name: string): TaskGroup => ({ key: 'space', name, kind: 'Espace', tasks: onSpace, showTarget: false });

  if (target.itemId) {
    return {
      own: onItems,
      contained: [],
      inherited: [
        { key: 'zone', name: onZone[0]?.zoneName ?? '', kind: 'Zone', tasks: onZone, showTarget: false },
        fromSpace(onSpace[0]?.spaceName ?? ''),
      ].filter((group) => group.tasks.length > 0),
    };
  }
  if (target.zoneId) {
    return {
      own: onZone,
      contained: [{ key: 'items', name: 'Tâches des éléments', tasks: onItems, showTarget: true }],
      inherited: [fromSpace(onSpace[0]?.spaceName ?? '')].filter((group) => group.tasks.length > 0),
    };
  }
  return {
    own: onSpace,
    contained: [{ key: 'contents', name: 'Tâches des zones et des éléments', tasks: [...onZone, ...onItems].sort(byUrgency), showTarget: true }],
    inherited: [],
  };
}

export function TasksSection({ target }: { target: Target }) {
  const styles = useStyles();
  const tasks = useTasks(filterFor(target));
  const { markDone } = useMarkDone();
  const noun = targetNoun(target);

  if (tasks.isPending) return <SectionLoading />;
  if (tasks.error) return <Text style={styles.error}>{tasks.error.message}</Text>;

  const { own, contained, inherited } = splitTasks(target, tasks.data);
  const renderTask = (task: GardenTask, showTarget: boolean) => (
    <TaskRow
      key={task.id}
      task={task}
      showTarget={showTarget}
      onPress={() => router.push({ pathname: '/task/form', params: { id: String(task.id) } })}
      onDone={() => markDone(task)}
    />
  );

  return (
    <View style={styles.section}>
      {own.length === 0 ? (
        <Text style={styles.empty}>Aucune tâche pour {noun}.</Text>
      ) : (
        own.map((task) => renderTask(task, false))
      )}
      <Button
        title={`Ajouter une tâche à ${noun}`}
        icon="add"
        variant="secondary"
        onPress={() => router.push({ pathname: '/task/form', params: targetParams(target) })}
      />
      {contained
        .filter((group) => group.tasks.length > 0)
        .map((group) => (
          <TaskGroupView key={group.key} group={group} renderTask={renderTask} />
        ))}
      {inherited.length > 0 && <Text style={styles.groupHeading}>Valent aussi pour {noun}</Text>}
      {inherited.map((group) => (
        <TaskGroupView key={group.key} group={group} renderTask={renderTask} />
      ))}
    </View>
  );
}

/** Un groupe de tâches replié : son en-tête dit combien il en compte et lesquelles pressent. */
function TaskGroupView({
  group,
  renderTask,
}: {
  group: TaskGroup;
  renderTask: (task: GardenTask, showTarget: boolean) => ReactNode;
}) {
  const { colors, due } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const pending = group.tasks.filter((task) => !task.isCompleted);
  const overdue = pending.filter((task) => task.status === 'Overdue').length;
  const dueToday = pending.filter((task) => task.status === 'DueSoon').length;
  const count = `${group.tasks.length} ${group.tasks.length > 1 ? 'tâches' : 'tâche'}`;

  return (
    <View style={styles.group}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.groupHeader, pressed && { opacity: 0.6 }]}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textMuted} />
        <View style={styles.groupText}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupSummary}>
            {[group.kind, count].filter(Boolean).join(' · ')}
            {overdue > 0 && <Text style={{ color: due.Overdue.color }}> · {overdue} en retard</Text>}
            {dueToday > 0 && <Text style={{ color: due.DueSoon.color }}> · {dueToday} aujourd&apos;hui</Text>}
          </Text>
        </View>
      </Pressable>
      {open && <View style={styles.groupTasks}>{group.tasks.map((task) => renderTask(task, group.showTarget))}</View>}
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

export type DetailTab = { key: string; label: string; render: () => ReactNode };

/**
 * Une fiche : l'en-tête et les onglets restent en place, seul le contenu de l'onglet défile. Un
 * onglet n'est rendu, et ses données chargées, qu'une fois ouvert.
 */
export function DetailScreen({ header, tabs }: { header: ReactNode; tabs: DetailTab[] }) {
  const styles = useDetailStyles();
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <View style={styles.frame}>
      <View style={styles.header}>{header}</View>
      <Tabs tabs={tabs} value={current.key} onChange={setActive} />
      {/* Une clé par onglet : chacun repart de son haut plutôt que de la position du précédent. */}
      <ScrollView key={current.key} contentContainerStyle={styles.screen}>
        {current.render()}
      </ScrollView>
    </View>
  );
}

/** En-tête des écrans de détail : nom, sous-titre, description, pastilles. */
export const useDetailStyles = createStyles(({ colors, typography, spacing }) => ({
  frame: { flex: 1 },
  screen: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.lg * 2 },
  header: { gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.sm },
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
  groupHeading: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.textMuted, marginTop: spacing.sm },
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  groupText: { flex: 1 },
  groupName: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  groupSummary: { ...typography.caption, color: colors.textMuted },
  // Le filet relie les tâches dépliées à l'en-tête du groupe : elles viennent d'ailleurs.
  groupTasks: { gap: spacing.sm, marginLeft: 8, paddingLeft: spacing.sm + 2, borderLeftWidth: 2, borderLeftColor: colors.border },
}));
