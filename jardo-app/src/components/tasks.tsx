import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useCompleteTask, useDeleteJournalEntry } from '@/api/queries';
import type { CompleteTaskInput, GardenTask } from '@/api/types';
import { useShowUndo } from '@/components/undo';
import { Badge, Card } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { formatDate } from '@/lib/dates';
import { entryKinds, targetLabel } from '@/lib/garden';
import { createStyles, useTheme } from '@/theme';

export const taskTitle = (task: GardenTask) => task.title ?? entryKinds[task.kind].verb;

/**
 * « Fait », puis quelques secondes pour l'annuler : l'annulation supprime l'entrée que « Fait » a
 * notée au journal, et la tâche revient à son échéance d'avant.
 */
export function useMarkDone() {
  const complete = useCompleteTask();
  const removeEntry = useDeleteJournalEntry();
  const showUndo = useShowUndo();

  const markDone = (task: GardenTask, input?: CompleteTaskInput, onSuccess?: () => void) =>
    complete.mutate(
      { id: task.id, input },
      {
        onSuccess: ({ entry }) => {
          onSuccess?.();
          showUndo({
            message: `Noté : ${taskTitle(task)} · ${task.itemName ?? task.zoneName ?? task.spaceName}`,
            onUndo: () =>
              removeEntry.mutate(entry.id, { onError: (e) => notify("Le « Fait » n'a pas été annulé", e.message) }),
          });
        },
        onError: (e) => notify("La tâche n'a pas été notée", e.message),
      },
    );

  return { markDone, isPending: complete.isPending };
}

/**
 * Le voyant d'échéance. Il affiche tel quel ce que l'API a calculé : le front ne refait
 * jamais le calcul, sinon les deux finiraient par diverger.
 */
export function DueBadge({ task }: { task: GardenTask }) {
  const { due } = useTheme();
  const { color, background } = due[task.status];

  if (task.isCompleted) {
    return <Badge color={color} background={background} icon="checkmark-done-outline" text={`Faite le ${formatDate(task.lastDoneOn)}`} />;
  }

  switch (task.status) {
    case 'Overdue':
      return <Badge color={color} background={background} icon="warning-outline" text={`En retard de ${task.daysOverdue} j`} />;
    case 'DueSoon':
      return task.kind === 'Watering' ? (
        <Badge color={color} background={background} icon="water-outline" text="À arroser aujourd'hui" />
      ) : (
        <Badge color={color} background={background} icon="calendar-outline" text="À faire aujourd'hui" />
      );
    case 'Ok':
      return (
        <Badge
          color={color}
          background={background}
          icon="checkmark-circle-outline"
          text={`Prochain : ${formatDate(task.nextDueDate)}`}
        />
      );
  }
}

type TaskRowProps = {
  task: GardenTask;
  onPress: () => void;
  /**
   * Affiche le bouton « Fait ». Absent pour une tâche ponctuelle déjà faite. Un appui long ouvre
   * l'écran où préciser la date et une note.
   */
  onDone?: () => void;
};

export function TaskRow({ task, onPress, onDone }: TaskRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const title = taskTitle(task);

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name={entryKinds[task.kind].icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.target}>{targetLabel(task)}</Text>
        <DueBadge task={task} />
      </View>
      {onDone && !task.isCompleted && (
        <Pressable
          onPress={(event) => {
            // Sans ça, sur le web, le clic remonte jusqu'à la carte et ouvre la cible.
            event.stopPropagation();
            onDone();
          }}
          onLongPress={(event) => {
            event.stopPropagation();
            router.push({ pathname: '/task/done', params: { id: String(task.id) } });
          }}
          accessibilityRole="button"
          accessibilityLabel={`Fait : ${title}, ${targetLabel(task)}`}
          accessibilityHint="Appui long pour préciser la date ou ajouter une note"
          hitSlop={8}
          style={({ pressed }) => [styles.done, pressed && { opacity: 0.6 }]}>
          <Ionicons name="checkmark" size={18} color={colors.primaryText} />
          <Text style={styles.doneText}>Fait</Text>
        </Pressable>
      )}
    </Card>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successTint,
  },
  body: { flex: 1, gap: spacing.xs },
  title: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  target: { ...typography.caption, color: colors.textMuted },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  doneText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.primaryText },
}));
