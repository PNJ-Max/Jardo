import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJournal, type TargetFilter } from '@/api/queries';
import type { GardenTask } from '@/api/types';
import { KindIcon } from '@/components/pictograms';
import { Button, type IconName } from '@/components/ui';
import { formatDate, today } from '@/lib/dates';
import { formatQuantity, measureUnits, targetLabel, taskTitle } from '@/lib/garden';
import { lastHarvest, rhythm, sinceDone } from '@/lib/today';
import { createStyles, useTheme } from '@/theme';

type TaskSheetProps = {
  task: GardenTask;
  visible: boolean;
  onClose: () => void;
  /** « Fait aujourd'hui » : la ligne joue le même « Fait » que son bouton. */
  onDone: () => void;
  /** « Ouvrir la fiche » de la cible. */
  onOpen: () => void;
};

/**
 * La feuille d'une tâche d'Aujourd'hui, au toucher de sa ligne : son rythme, la dernière fois
 * qu'elle a été faite, puis ce qu'on peut en faire. C'est aussi l'alternative au glissement.
 */
export function TaskSheet({ task, visible, onClose, onDone, onOpen }: TaskSheetProps) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  const then = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <Animated.View
          entering={reduceMotion ? undefined : SlideInDown.duration(260)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.icon}>
              <KindIcon kind={task.kind} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} accessibilityRole="header">
                {taskTitle(task)}
              </Text>
              <Text style={styles.target}>{targetLabel(task)}</Text>
            </View>
          </View>
          <View style={styles.facts}>
            <Fact label="Rythme" value={capitalize(rhythm(task))} />
            <Fact
              label="Dernière fois"
              value={sinceDone(task.lastDoneOn, today())}
              detail={task.lastDoneOn ? formatDate(task.lastDoneOn) : undefined}
            />
            {task.kind === 'Harvest' && <LastHarvest task={task} />}
          </View>
          <View style={styles.actions}>
            <Button title="Fait aujourd'hui" icon="checkmark" onPress={then(onDone)} />
            {/* « Reporter à demain » viendra ici, entre les deux façons de faire et la fiche. */}
            <SheetAction
              icon="calendar-outline"
              label="Fait un autre jour, avec une note"
              onPress={then(() => router.push({ pathname: '/task/done', params: { id: String(task.id) } }))}
            />
            <SheetAction icon="open-outline" label="Ouvrir la fiche" onPress={then(onOpen)} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);

const targetFilter = (task: GardenTask): TargetFilter =>
  task.itemId ? { itemId: task.itemId } : task.zoneId ? { zoneId: task.zoneId } : { spaceId: task.spaceId };

/** Pour une récolte, la dernière quantité notée. Lue seulement quand la feuille s'ouvre. */
function LastHarvest({ task }: { task: GardenTask }) {
  const journal = useJournal({ ...targetFilter(task), kinds: ['Harvest'] });
  const entry = journal.data && lastHarvest(journal.data, task);
  if (!entry?.quantity || !entry.quantityUnit) return null;

  return (
    <Fact
      label="Dernière récolte"
      value={formatQuantity(entry.quantity, measureUnits[entry.quantityUnit])}
      detail={formatDate(entry.date)}
    />
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const styles = useStyles();

  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>
        {value}
        {detail && <Text style={styles.factDetail}>{`, ${detail}`}</Text>}
      </Text>
    </View>
  );
}

function SheetAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  // Le voile assombrit l'écran dans les deux thèmes, comme les ombres.
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tile,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.section, color: colors.text },
  target: { ...typography.body, color: colors.textMuted },
  facts: { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, paddingVertical: spacing.xs },
  fact: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, paddingVertical: 8, paddingHorizontal: 14 },
  factLabel: { ...typography.caption, color: colors.textMuted, width: 112 },
  factValue: { ...typography.body, fontFamily: fonts.bodyMedium, color: colors.text, flex: 1 },
  factDetail: { fontFamily: fonts.body, color: colors.textMuted },
  actions: { gap: spacing.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  actionPressed: { backgroundColor: colors.surfaceSunken },
  actionText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.primary },
}));
