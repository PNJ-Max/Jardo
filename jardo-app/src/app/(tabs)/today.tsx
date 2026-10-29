import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useDueTasks } from '@/api/queries';
import type { GardenTask } from '@/api/types';
import {
  longDay,
  MonthAhead,
  OverdueSection,
  SpaceGroups,
  TodaySky,
  useTaskRow,
  WeekStrip,
  type RenderTask,
  type Water,
} from '@/components/today';
import { Card, ErrorView, Loading, screenStyles, SectionTitle } from '@/components/ui';
import { addDays, type DateOnly } from '@/domain/dates';
import { today as currentDay } from '@/lib/dates';
import { usePullToRefresh } from '@/lib/refresh';
import { bySpace, comingThisMonth, overdueTasks, skyPhrase, tasksOn, weekDays } from '@/lib/today';
import { createStyles, useTheme } from '@/theme';

/**
 * Tout ce qui est à faire au jardin, toutes catégories, sur les trente prochains jours : le ciel du
 * jour, la semaine, les retards à part, le jour choisi par espace, puis le calendrier du mois.
 */
export default function TodayScreen() {
  const { data, error, isPending, refetch } = useDueTasks('Month');
  const refresh = usePullToRefresh(refetch);
  const { row, waterAll, watering } = useTaskRow();
  const styles = useStyles();
  const today = currentDay();
  const [selected, setSelected] = useState(today);

  if (isPending) return <Loading />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const overdue = overdueTasks(data);
  const coming = comingThisMonth(data, today);

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl {...refresh} />}>
      <TodaySky date={today} phrase={skyPhrase(data, today)} />
      <View style={styles.body}>
        <WeekStrip days={weekDays(data, today)} selected={selected} onSelect={setSelected} />
        {overdue.length > 0 && <OverdueSection tasks={overdue} row={row} />}
        {selected === today ? (
          <TodayTasks
            tasks={data}
            today={today}
            nothingLate={overdue.length === 0}
            row={row}
            water={{ due: data, onWaterAll: waterAll, busy: watering }}
          />
        ) : (
          <DayTasks tasks={tasksOn(data, selected)} date={selected} today={today} row={row} />
        )}
        {coming.length > 0 && <MonthAhead tasks={coming} row={row} />}
      </View>
    </ScrollView>
  );
}

type DayProps = { tasks: GardenTask[]; today: DateOnly; row: RenderTask };

/** Aujourd'hui, par espace ; rien à faire du tout : on le dit, puis ce qui vient demain. */
function TodayTasks({ tasks, today, nothingLate, row, water }: DayProps & { nothingLate: boolean; water: Water }) {
  const styles = useStyles();
  const due = tasksOn(tasks, today);
  const tomorrow = tasksOn(tasks, addDays(today, 1));

  if (due.length > 0) {
    return (
      <View style={styles.section}>
        <SectionTitle count={due.length}>Aujourd&apos;hui</SectionTitle>
        <SpaceGroups groups={bySpace(due)} row={row} water={water} />
      </View>
    );
  }
  if (!nothingLate) return null;

  return (
    <>
      <NothingToday />
      {tomorrow.length > 0 && (
        <View style={styles.section}>
          <SectionTitle count={tomorrow.length}>Demain</SectionTitle>
          <SpaceGroups groups={bySpace(tomorrow)} row={row} />
        </View>
      )}
    </>
  );
}

/** Un autre jour de la semaine : ce qui est prévu, à faire en avance si l'on veut. */
function DayTasks({ tasks, date, today, row }: DayProps & { date: DateOnly }) {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <SectionTitle count={tasks.length}>{date === addDays(today, 1) ? 'Demain' : longDay(date)}</SectionTitle>
      {tasks.length === 0 ? (
        <Text style={styles.hint}>Rien de prévu ce jour-là.</Text>
      ) : (
        <>
          <Text style={styles.hint}>Prévu ce jour-là, faisable dès maintenant.</Text>
          <SpaceGroups groups={bySpace(tasks)} row={row} />
        </>
      )}
    </View>
  );
}

function NothingToday() {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Card style={styles.nothingToday}>
      <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
      <Text style={styles.nothingTodayText}>Rien à faire aujourd&apos;hui</Text>
    </Card>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  content: { paddingBottom: 96 },
  body: { paddingHorizontal: spacing.md, gap: spacing.md },
  section: { gap: spacing.sm },
  hint: { ...typography.body, color: colors.textMuted },
  nothingToday: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nothingTodayText: { ...typography.subtitle, color: colors.text },
}));
