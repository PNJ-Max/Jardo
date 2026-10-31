import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GardenTask, Id } from '@/api/types';
import { celebrateMs, doneFeedback, foldMs, TaskRow, useMarkDone, usePostponeToTomorrow, useWaterAll } from '@/components/tasks';
import { WeatherIcon } from '@/components/pictograms';
import { Group, SectionTitle } from '@/components/ui';
import { SkyScene } from '@/components/vignettes/sky-scene';
import { SpaceVignette } from '@/components/vignettes/space-vignette';
import { RainNote } from '@/components/weather';
import type { DateOnly } from '@/domain/dates';
import { formatDate, parseDateOnly } from '@/lib/dates';
import { targetHref, targetLabel } from '@/lib/garden';
import { dueWaterings, lateness, monthSummary, rhythm, type SpaceGroup, type WeekDay } from '@/lib/today';
import { describeWeather, rainNoteApplies, spokenWeather, type DayForecast } from '@/lib/weather';
import { createStyles, useTheme } from '@/theme';

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);

/** « Mercredi 28 octobre » */
export const longDay = (date: DateOnly) =>
  capitalize(parseDateOnly(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

const horizonHeight = 84;

type TodaySkyProps = { date: DateOnly; phrase: string; weather?: ReactNode; sunny?: boolean };

/** En-tête d'Aujourd'hui, à la place de la barre de navigation : la date, la phrase et le temps du jour sur le ciel. */
export function TodaySky({ date, phrase, weather, sunny }: TodaySkyProps) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // La phrase prend une ou deux lignes : le ciel se dessine à la hauteur mesurée.
  const [height, setHeight] = useState(0);

  return (
    <View style={{ paddingTop: insets.top + 20 }} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {height > 0 && (
        <View style={styles.skyScene}>
          <SkyScene width={width} height={height} horizonHeight={horizonHeight} sun={sunny} />
        </View>
      )}
      <View style={styles.skyText}>
        <Text style={styles.date} accessibilityRole="header">
          {longDay(date)}
        </Text>
        <Text style={styles.phrase}>{phrase}</Text>
        {weather}
      </View>
      <View style={{ height: horizonHeight }} />
    </View>
  );
}

const weekdayInitial = (date: DateOnly) =>
  capitalize(parseDateOnly(date).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));

/**
 * Les sept jours ; un point sous ceux qui ont quelque chose de prévu, rouge pour le retard. Avec
 * une prévision, le temps de chaque jour au-dessus, que l'onglet dit au lecteur d'écran.
 */
export function WeekStrip({
  days,
  selected,
  onSelect,
  forecast,
}: {
  days: WeekDay[];
  selected: DateOnly;
  onSelect: (date: DateOnly) => void;
  forecast?: readonly DayForecast[];
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.week} accessibilityRole="tablist">
      {days.map((day, index) => {
        const isSelected = day.date === selected;
        const ink = isSelected ? colors.primaryText : colors.text;
        const planned = day.overdue ? 'du retard' : day.planned ? 'quelque chose de prévu' : 'rien de prévu';
        const weather = forecast?.find((forecastDay) => forecastDay.date === day.date);
        return (
          <View key={day.date} style={styles.weekDay}>
            {forecast &&
              (weather ? <WeatherIcon kind={describeWeather(weather.code).kind} size={24} /> : <View style={styles.noWeather} />)}
            <Pressable
              onPress={() => onSelect(day.date)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={[index === 0 ? "Aujourd'hui" : longDay(day.date), planned, weather && spokenWeather(weather).toLocaleLowerCase('fr')]
                .filter(Boolean)
                .join(', ')}
              style={({ pressed }) => [styles.dayPill, isSelected && styles.dayPillSelected, pressed && { opacity: 0.6 }]}>
              <Text style={[styles.dayName, { color: isSelected ? ink : colors.textMuted }]}>{weekdayInitial(day.date)}</Text>
              <Text style={[styles.dayNumber, { color: ink }]}>{parseDateOnly(day.date).getDate()}</Text>
            </Pressable>
            <View
              style={[
                styles.dot,
                day.planned && { backgroundColor: day.overdue ? colors.danger : colors.primary },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

export type RenderTask = (task: GardenTask, detail: ReactNode) => ReactNode;

/** « Tout arroser » un espace : ses arrosages dus partent ensemble. */
export type WaterAll = (group: SpaceGroup, tasks: readonly GardenTask[]) => void;

/**
 * Pour proposer « Tout arroser » sur un espace qui a au moins deux arrosages dus : les tâches dues
 * lues, retards compris.
 */
export type Water = { due: readonly GardenTask[]; onWaterAll: WaterAll; busy: boolean };

/**
 * Les lignes d'Aujourd'hui : « Fait », le glissement ou la feuille les retirent, avec annulation ;
 * « Tout arroser » retire d'un coup les arrosages dus d'un espace, où qu'ils soient affichés. À
 * appeler par l'écran, qui reste monté : une section dont la dernière ligne part se démonte, et
 * les rappels de l'écriture (le message « Noté au journal ») ne viendraient plus.
 */
export function useTaskRow(): { row: RenderTask; waterAll: WaterAll; watering: boolean } {
  const { markDone } = useMarkDone();
  const { postponeToTomorrow } = usePostponeToTomorrow();
  const { waterAll } = useWaterAll();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState<ReadonlySet<Id>>(new Set());

  const row: RenderTask = (task, detail) => (
    <TaskRow
      key={task.id}
      task={task}
      leavesOnDone
      gestures
      leaving={leaving.has(task.id)}
      detail={detail}
      onPress={() => router.push(targetHref(task))}
      onDone={() => markDone(task)}
      onPostpone={() => postponeToTomorrow(task)}
    />
  );

  // Comme « Fait » : les lignes célèbrent et se replient avant l'écriture, qui les retire des listes.
  const waterAllRows: WaterAll = (group, tasks) => {
    setLeaving(new Set(tasks.map((task) => task.id)));
    doneFeedback();
    const note = () => waterAll(group, tasks, () => setLeaving(new Set()));
    if (reduceMotion) note();
    else setTimeout(note, celebrateMs + foldMs);
  };

  return { row, waterAll: waterAllRows, watering: leaving.size > 0 };
}

/** « En retard », à part : bordée de danger, la ligne dit de combien. */
export function OverdueSection({ tasks, row }: { tasks: GardenTask[]; row: RenderTask }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <SectionTitle count={tasks.length} danger>
        En retard
      </SectionTitle>
      <Group style={{ borderColor: colors.danger }}>
        {tasks.map((task) =>
          row(
            task,
            <>
              {targetLabel(task)}, <Text style={styles.late}>{lateness(task.daysOverdue)}</Text>
            </>,
          ),
        )}
      </Group>
    </View>
  );
}

/** « Tomates · Carré 1, tous les 3 jours » : la cible dans l'espace, et le rythme. */
function withinSpace(task: GardenTask) {
  const target = [task.itemName, task.zoneName].filter(Boolean).join(' · ');
  return target ? `${target}, ${rhythm(task)}` : capitalize(rhythm(task));
}

type SpaceGroupsProps = { groups: SpaceGroup[]; row: RenderTask; water?: Water; rainNote?: string | null };

/** Une surface par espace, coiffée de sa vignette et de son nom ; la pluie notée sur ceux qu'on arrose dehors. */
export function SpaceGroups({ groups, row, water, rainNote }: SpaceGroupsProps) {
  const styles = useStyles();

  return groups.map((group) => {
    const waterings = water ? dueWaterings(water.due, group.spaceId) : [];
    return (
      <Group key={group.spaceId}>
        <View style={styles.spaceHeader}>
          <Pressable
            onPress={() => router.push(`/space/${group.spaceId}`)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.spaceLink, pressed && styles.pressed]}>
            <SpaceVignette kind={group.spaceKind} width={56} height={44} padding={2} />
            <Text style={styles.spaceName} numberOfLines={1}>
              {group.spaceName}
            </Text>
            <Text style={styles.spaceCount}>{group.tasks.length}</Text>
          </Pressable>
          {water && waterings.length >= 2 && (
            <WaterAllButton
              count={waterings.length}
              spaceName={group.spaceName}
              disabled={water.busy}
              onPress={() => water.onWaterAll(group, waterings)}
            />
          )}
        </View>
        {rainNote && rainNoteApplies(group) && <RainNote text={rainNote} />}
        {group.tasks.map((task) => row(task, withinSpace(task)))}
      </Group>
    );
  });
}

type WaterAllButtonProps = { count: number; spaceName: string; disabled: boolean; onPress: () => void };

/** Pastille de l'eau dans l'en-tête de l'espace. */
function WaterAllButton({ count, spaceName, disabled, onPress }: WaterAllButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Tout arroser : ${spaceName}, ${count} arrosages`}
      accessibilityHint="Note un seul arrosage sur l'espace, qui vaut pour ses zones et ses éléments"
      hitSlop={8}
      style={({ pressed }) => [styles.waterAll, (pressed || disabled) && { opacity: 0.6 }]}>
      <Ionicons name="water" size={16} color={colors.water} />
      <Text style={styles.waterAllText}>Tout arroser</Text>
    </Pressable>
  );
}

/** Le calendrier de saison : une ligne repliée qui nomme les tâches, et s'ouvre sur leur liste. */
export function MonthAhead({ tasks, row }: { tasks: GardenTask[]; row: RenderTask }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.section}>
      <SectionTitle count={tasks.length}>Dans le mois</SectionTitle>
      <Group>
        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.monthLine, pressed && styles.pressed]}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <Text style={styles.monthSummary} numberOfLines={open ? undefined : 2}>
            {monthSummary(tasks)}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {open && tasks.map((task) => row(task, `${targetLabel(task)}, ${formatDate(task.nextDueDate)}`))}
      </Group>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  skyScene: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  skyText: { paddingHorizontal: spacing.md, gap: spacing.xs, paddingBottom: spacing.sm },
  date: { ...typography.display, color: colors.text },
  phrase: { ...typography.body, fontFamily: fonts.bodyMedium, color: colors.textMuted },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { flex: 1, alignItems: 'center', gap: 6 },
  dayPill: { alignItems: 'center', minWidth: 44, paddingVertical: 6, borderRadius: radius.md },
  dayPillSelected: { backgroundColor: colors.primary },
  dayName: { ...typography.caption, fontFamily: fonts.bodyMedium },
  dayNumber: { ...typography.section, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  noWeather: { width: 24, height: 24 },
  section: { gap: spacing.sm },
  late: { color: colors.danger, fontFamily: fonts.bodyMedium },
  pressed: { backgroundColor: colors.surfaceSunken },
  spaceHeader: { flexDirection: 'row', alignItems: 'center' },
  spaceLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12 },
  spaceName: { ...typography.section, color: colors.text, flex: 1 },
  spaceCount: { ...typography.body, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  waterAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    marginRight: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.water,
    backgroundColor: colors.waterTint,
  },
  waterAllText: { ...typography.caption, fontFamily: fonts.heading, fontSize: 14, lineHeight: 19, color: colors.water },
  monthLine: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 14 },
  monthSummary: { ...typography.body, color: colors.text, flex: 1 },
}));
