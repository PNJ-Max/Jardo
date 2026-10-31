import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useCompleteTask, useDeleteJournalEntry, usePostponeTask, useRestorePostponement, useWaterSpace } from '@/api/queries';
import type { CompleteTaskInput, GardenTask, Id } from '@/api/types';
import { DoneIcon, KindIcon } from '@/components/pictograms';
import { SwipeToDone } from '@/components/swipe-to-done';
import { TaskSheet } from '@/components/task-sheet';
import { useShowUndo } from '@/components/undo';
import { Badge } from '@/components/ui';
import { addDays } from '@/domain/dates';
import { notify } from '@/lib/confirm';
import { formatDate, today } from '@/lib/dates';
import { targetLabel, taskPhrase, taskTitle } from '@/lib/garden';
import { createStyles, useTheme } from '@/theme';

export { taskTitle } from '@/lib/garden';

/** Les tâches dont le « Fait » vient d'être annulé : leur ligne revient en fondu. */
const returningTasks = new Set<Id>();

export function markReturning(ids: readonly Id[]) {
  ids.forEach((id) => returningTasks.add(id));
  setTimeout(() => ids.forEach((id) => returningTasks.delete(id)), 1000);
}

/**
 * « Fait », puis quelques secondes pour l'annuler : l'annulation supprime l'entrée que « Fait » a
 * notée au journal, et la tâche revient à son échéance d'avant. Sans note, le message propose d'en
 * ajouter une, sur l'entrée qui vient d'être notée.
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
            message: `Noté au journal : ${taskPhrase(task)}`,
            onUndo: () => {
              markReturning([task.id]);
              removeEntry.mutate(entry.id, { onError: (e) => notify("Le « Fait » n'a pas été annulé", e.message) });
            },
            action: input?.note
              ? undefined
              : {
                  label: 'Ajouter une note',
                  onPress: () => router.push({ pathname: '/entry/form', params: { id: String(entry.id) } }),
                },
          });
        },
        onError: (e) => notify("La tâche n'a pas été notée", e.message),
      },
    );

  return { markDone, isPending: complete.isPending };
}

/**
 * « Tout arroser » un espace : un seul arrosage noté sur l'espace pour tous ses arrosages dus, puis
 * quelques secondes pour l'annuler, comme « Fait ». `onSettled` vient après l'écriture, réussie
 * ou refusée.
 */
export function useWaterAll() {
  const water = useWaterSpace();
  const removeEntry = useDeleteJournalEntry();
  const showUndo = useShowUndo();

  const waterAll = (space: { spaceId: Id; spaceName: string }, tasks: readonly GardenTask[], onSettled: () => void) =>
    water.mutate(
      { spaceId: space.spaceId, date: today() },
      {
        onSuccess: (entry) =>
          showUndo({
            message: `Noté au journal : arroser tout l'espace, ${space.spaceName}`,
            onUndo: () => {
              markReturning(tasks.map((task) => task.id));
              removeEntry.mutate(entry.id, { onError: (e) => notify("L'arrosage n'a pas été annulé", e.message) });
            },
            action: {
              label: 'Ajouter une note',
              onPress: () => router.push({ pathname: '/entry/form', params: { id: String(entry.id) } }),
            },
          }),
        onError: (e) => notify("L'arrosage n'a pas été noté", e.message),
        onSettled,
      },
    );

  return { waterAll };
}

/**
 * « Reporter à demain », puis quelques secondes pour l'annuler : l'annulation remet le report
 * d'avant, et la tâche revient à son échéance d'avant.
 */
export function usePostponeToTomorrow() {
  const postpone = usePostponeTask();
  const restore = useRestorePostponement();
  const showUndo = useShowUndo();

  const postponeToTomorrow = (task: GardenTask) =>
    postpone.mutate(
      { id: task.id, until: addDays(today(), 1) },
      {
        onSuccess: ({ previous }) =>
          showUndo({
            message: `Reporté à demain : ${taskPhrase(task)}`,
            onUndo: () => {
              markReturning([task.id]);
              restore.mutate(
                { id: task.id, previous },
                { onError: (e) => notify("Le report n'a pas été annulé", e.message) },
              );
            },
          }),
        onError: (e) => notify("La tâche n'a pas été reportée", e.message),
      },
    );

  return { postponeToTomorrow };
}

/**
 * Le voyant d'échéance. Il affiche tel quel ce que le domaine a calculé : l'écran ne refait
 * jamais le calcul, sinon les deux finiraient par diverger.
 */
export function DueBadge({ task }: { task: GardenTask }) {
  const { due } = useTheme();
  const { color, background } = due[task.status === 'DueSoon' && task.kind === 'Watering' ? 'Watering' : task.status];

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
        <Badge color={color} background={background} icon="sunny-outline" text="À faire aujourd'hui" />
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

/** Remplissage, coche → pousse et lueur ; puis, si la tâche quitte la liste, le repli de la ligne. */
export const celebrateMs = 800;
export const foldMs = 400;

/** Sur le web, rien : la vibration du navigateur serait un bourdonnement, pas un toucher. */
export function doneFeedback() {
  if (Platform.OS === 'android') void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  else if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Plus discret que « Fait » : un simple déclic. */
function postponeFeedback() {
  if (Platform.OS === 'android') void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick);
  else if (Platform.OS === 'ios') void Haptics.selectionAsync();
}

type TaskRowProps = {
  task: GardenTask;
  onPress: () => void;
  /**
   * Affiche le bouton « Fait ». Absent pour une tâche ponctuelle déjà faite. Sans `gestures`, un
   * appui long ouvre l'écran où préciser la date et une note.
   */
  onDone?: () => void;
  /**
   * Vrai quand « Fait » retire la tâche de la liste (Aujourd'hui) : la ligne se replie avant de
   * partir, et la tâche n'est notée qu'ensuite. Sinon, elle est notée aussitôt et la ligne reste.
   */
  leavesOnDone?: boolean;
  /** Faux quand l'écran nomme déjà la cible : la fiche de l'élément, ou le groupe d'une zone. */
  showTarget?: boolean;
  /** Remplace voyant et cible quand la section donne déjà l'échéance (Aujourd'hui). */
  detail?: ReactNode;
  /**
   * Aujourd'hui : toucher la ligne ouvre la feuille de la tâche, qui remplace l'appui long et
   * propose `onPress` sous « Ouvrir la fiche » ; glisser la ligne à droite la fait, à gauche la
   * reporte (`onPostpone`).
   */
  gestures?: boolean;
  /**
   * La tâche part avec d'autres (« Tout arroser ») : la ligne célèbre et se replie sans se noter,
   * l'écran note pour toutes. Repassé à faux (écriture refusée), elle se rouvre.
   */
  leaving?: boolean;
  /**
   * Avec `gestures`, « Reporter à demain » d'une tâche due : dans la feuille, ou en glissant la
   * ligne à gauche. La ligne se replie, puis la tâche est reportée.
   */
  onPostpone?: () => void;
};

/** Une ligne d'une surface groupée (`Group`) : pictogramme, intervention, voyant et cible, « Fait ». */
export function TaskRow({
  task,
  onPress,
  onDone,
  leavesOnDone = false,
  showTarget = true,
  detail,
  gestures = false,
  leaving = false,
  onPostpone,
}: TaskRowProps) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  const [postponing, setPostponing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const lastSwipe = useRef(0);
  const [returning] = useState(() => returningTasks.delete(task.id));
  const open = useSharedValue(1);
  const height = useSharedValue(0);
  const title = taskTitle(task);

  const foldStyle = useAnimatedStyle(() => {
    const progress = open.get();
    return progress === 1
      ? { height: 'auto', opacity: 1, overflow: 'visible' }
      : { height: height.get() * progress, opacity: progress, overflow: 'hidden' };
  });

  useEffect(() => {
    if (!leaving || reduceMotion) return;
    open.set(withDelay(celebrateMs, withTiming(0, { duration: foldMs, easing: Easing.inOut(Easing.quad) })));
    return () => open.set(withTiming(1, { duration: 300 }));
  }, [leaving, reduceMotion, open]);

  const celebrating = done || leaving;
  const canBeDone = onDone !== undefined && !task.isCompleted;

  const markDone = () => {
    if (!onDone || celebrating || postponing) return;
    setDone(true);
    doneFeedback();
    if (leavesOnDone && !reduceMotion) {
      open.set(withDelay(celebrateMs, withTiming(0, { duration: foldMs, easing: Easing.inOut(Easing.quad) })));
      // Pas annulé au démontage : la tâche doit être notée même si l'on quitte l'écran entre-temps.
      setTimeout(() => {
        onDone();
        // La ligne quitte d'ordinaire la liste. Si elle est encore là (l'écriture refusée a remis
        // la tâche avant que la liste ne l'ait retirée), elle se rouvre.
        setTimeout(() => {
          setDone(false);
          open.set(withTiming(1, { duration: 300 }));
        }, 500);
      }, celebrateMs + foldMs);
      return;
    }
    onDone();
    if (!leavesOnDone) setTimeout(() => setDone(false), celebrateMs + foldMs);
  };

  const canPostpone = canBeDone && task.status !== 'Ok' && onPostpone !== undefined;

  const postpone = () => {
    if (!onPostpone || celebrating || postponing) return;
    setPostponing(true);
    postponeFeedback();
    const write = () => {
      onPostpone();
      // Comme pour « Fait » : si la ligne est encore là, report refusé, elle se rouvre.
      setTimeout(() => {
        setPostponing(false);
        open.set(withTiming(1, { duration: 300 }));
      }, 500);
    };
    if (reduceMotion) return write();
    open.set(withTiming(0, { duration: foldMs, easing: Easing.inOut(Easing.quad) }));
    setTimeout(write, foldMs);
  };

  const row = (
    <Pressable
      onPress={
        gestures
          ? () => {
              if (Date.now() - lastSwipe.current > 300) setSheetOpen(true);
            }
          : onPress
      }
      accessibilityHint={gestures ? 'Ouvre la feuille de la tâche : rythme, dernière fois, et les façons de la noter' : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.icon}>
        <KindIcon kind={task.kind} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {detail !== undefined ? (
          <Text style={styles.detail} numberOfLines={2}>
            {detail}
          </Text>
        ) : (
          <View style={styles.meta}>
            <DueBadge task={task} />
            {showTarget && (
              <Text style={styles.target} numberOfLines={1}>
                {targetLabel(task)}
              </Text>
            )}
          </View>
        )}
      </View>
      {canBeDone && (
        <DoneButton
          done={celebrating}
          onPress={markDone}
          onLongPress={
            gestures ? undefined : () => router.push({ pathname: '/task/done', params: { id: String(task.id) } })
          }
          accessibilityLabel={`Fait : ${title}, ${targetLabel(task)}`}
        />
      )}
    </Pressable>
  );

  return (
    <Animated.View
      entering={returning ? FadeIn.duration(300) : undefined}
      onLayout={(event) => {
        if (open.get() === 1) height.set(event.nativeEvent.layout.height);
      }}
      style={foldStyle}>
      {gestures ? (
        <SwipeToDone
          testId={`swipe:${task.id}`}
          enabled={canBeDone && !celebrating && !postponing}
          onDone={markDone}
          onPostpone={canPostpone ? postpone : undefined}
          onSwiping={() => {
            lastSwipe.current = Date.now();
          }}>
          {row}
        </SwipeToDone>
      ) : (
        row
      )}
      {gestures && (
        <TaskSheet
          task={task}
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onDone={markDone}
          onPostpone={canPostpone ? postpone : undefined}
          onOpen={onPress}
        />
      )}
    </Animated.View>
  );
}

type DoneButtonProps = { done: boolean; onPress: () => void; onLongPress?: () => void; accessibilityLabel: string };

/** Pastille au contour `primary` ; une fois touchée, elle se remplit, sa coche devient une pousse et une lueur s'étend. */
function DoneButton({ done, onPress, onLongPress, accessibilityLabel }: DoneButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const tint = done ? colors.primaryText : colors.primary;

  useEffect(() => {
    if (!done) {
      progress.set(0);
      return;
    }
    progress.set(withTiming(1, { duration: celebrateMs, easing: Easing.out(Easing.quad) }));
    scale.set(withSequence(withTiming(1.08, { duration: 160 }), withTiming(1, { duration: 160 })));
  }, [done, progress, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const glowStyle = useAnimatedStyle(() => {
    const spread = interpolate(progress.get(), [0, 1], [0, 16]);
    return {
      top: -spread,
      bottom: -spread,
      left: -spread,
      right: -spread,
      borderRadius: 20 + spread,
      opacity: interpolate(progress.get(), [0, 0.1, 1], [0, 0.9, 0]),
    };
  });
  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.35], [1, 0], 'clamp'),
    transform: [{ scale: interpolate(progress.get(), [0, 0.35], [1, 0.2], 'clamp') }],
  }));
  const sproutStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.12, 0.47], [0, 1], 'clamp'),
    transform: [
      { translateY: interpolate(progress.get(), [0.12, 0.47], [6, 0], 'clamp') },
      { scale: interpolate(progress.get(), [0.12, 0.47], [0.3, 1], 'clamp') },
    ],
  }));

  return (
    <Animated.View style={popStyle}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Pressable
        onPress={(event) => {
          // Sans ça, sur le web, le clic remonte jusqu'à la ligne et ouvre la cible.
          event.stopPropagation();
          onPress();
        }}
        onLongPress={
          onLongPress &&
          ((event) => {
            event.stopPropagation();
            onLongPress();
          })
        }
        disabled={done}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={onLongPress && 'Appui long pour préciser la date ou ajouter une note'}
        hitSlop={8}
        style={({ pressed }) => [styles.done, done && styles.doneFilled, pressed && { opacity: 0.6 }]}>
        <View style={styles.glyph}>
          <Animated.View style={[styles.glyphLayer, checkStyle]}>
            <DoneIcon glyph="check" color={tint} size={18} />
          </Animated.View>
          <Animated.View style={[styles.glyphLayer, sproutStyle]}>
            <DoneIcon glyph="sprout" color={tint} size={18} />
          </Animated.View>
        </View>
        <Text style={[styles.doneText, { color: tint }]}>{done ? 'Noté' : 'Fait'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  rowPressed: { backgroundColor: colors.surfaceSunken },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tile,
  },
  body: { flex: 1, gap: spacing.xs },
  title: { ...typography.body, fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22, color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: 2 },
  target: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  detail: { ...typography.caption, color: colors.textMuted },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // 40 de haut, 56 au doigt avec le hitSlop : la ligne reste basse, la cible reste large.
    height: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  doneFilled: { backgroundColor: colors.primary },
  doneText: { ...typography.caption, fontFamily: fonts.heading, fontSize: 14, lineHeight: 19 },
  glow: { position: 'absolute', backgroundColor: colors.glow, pointerEvents: 'none' },
  glyph: { width: 18, height: 18 },
  glyphLayer: { position: 'absolute', top: 0, left: 0 },
}));
