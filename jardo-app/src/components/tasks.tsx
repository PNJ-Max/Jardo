import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { useCompleteTask, useDeleteJournalEntry } from '@/api/queries';
import type { CompleteTaskInput, GardenTask, Id } from '@/api/types';
import { DoneIcon, KindIcon } from '@/components/pictograms';
import { useShowUndo } from '@/components/undo';
import { Badge } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { formatDate } from '@/lib/dates';
import { targetLabel, taskPhrase, taskTitle } from '@/lib/garden';
import { createStyles, useTheme } from '@/theme';

/** Les tâches dont le « Fait » vient d'être annulé : leur ligne revient en fondu. */
const returningTasks = new Set<Id>();

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
              returningTasks.add(task.id);
              setTimeout(() => returningTasks.delete(task.id), 1000);
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
const celebrateMs = 800;
const foldMs = 400;

/** Sur le web, rien : la vibration du navigateur serait un bourdonnement, pas un toucher. */
function doneFeedback() {
  if (Platform.OS === 'android') void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  else if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type TaskRowProps = {
  task: GardenTask;
  onPress: () => void;
  /**
   * Affiche le bouton « Fait ». Absent pour une tâche ponctuelle déjà faite. Un appui long ouvre
   * l'écran où préciser la date et une note.
   */
  onDone?: () => void;
  /**
   * Vrai quand « Fait » retire la tâche de la liste (Aujourd'hui) : la ligne se replie avant de
   * partir, et la tâche n'est notée qu'ensuite. Sinon, elle est notée aussitôt et la ligne reste.
   */
  leavesOnDone?: boolean;
  /** Faux quand l'écran nomme déjà la cible : la fiche de l'élément, ou le groupe d'une zone. */
  showTarget?: boolean;
};

/** Une ligne d'une surface groupée (`Group`) : pictogramme, intervention, voyant et cible, « Fait ». */
export function TaskRow({ task, onPress, onDone, leavesOnDone = false, showTarget = true }: TaskRowProps) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
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

  const markDone = () => {
    if (!onDone) return;
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

  return (
    <Animated.View
      entering={returning ? FadeIn.duration(300) : undefined}
      onLayout={(event) => {
        if (open.get() === 1) height.set(event.nativeEvent.layout.height);
      }}
      style={foldStyle}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <View style={styles.icon}>
          <KindIcon kind={task.kind} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.meta}>
            <DueBadge task={task} />
            {showTarget && (
              <Text style={styles.target} numberOfLines={1}>
                {targetLabel(task)}
              </Text>
            )}
          </View>
        </View>
        {onDone && !task.isCompleted && (
          <DoneButton
            done={done}
            onPress={markDone}
            onLongPress={() => router.push({ pathname: '/task/done', params: { id: String(task.id) } })}
            accessibilityLabel={`Fait : ${title}, ${targetLabel(task)}`}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

type DoneButtonProps = { done: boolean; onPress: () => void; onLongPress: () => void; accessibilityLabel: string };

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
        onLongPress={(event) => {
          event.stopPropagation();
          onLongPress();
        }}
        disabled={done}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Appui long pour préciser la date ou ajouter une note"
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
