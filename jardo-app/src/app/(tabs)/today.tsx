import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useDueTasks } from '@/api/queries';
import { TaskRow, useMarkDone } from '@/components/tasks';
import { Card, Empty, ErrorView, Group, Loading, screenStyles, SectionTitle } from '@/components/ui';
import { targetHref } from '@/lib/garden';
import { usePullToRefresh } from '@/lib/refresh';
import { createStyles, useTheme } from '@/theme';

/**
 * Tout ce qui est à faire au jardin, toutes catégories. Le service renvoie les tâches de la semaine,
 * les plus en retard d'abord ; leur statut suffit à les ranger dans les trois sections.
 */
export default function TodayScreen() {
  const { data, error, isPending, refetch } = useDueTasks('Week');
  const { markDone } = useMarkDone();
  const refresh = usePullToRefresh(refetch);
  const styles = useStyles();

  if (isPending) return <Loading />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const sections = [
    { title: 'En retard', data: data.filter((task) => task.status === 'Overdue') },
    { title: "Aujourd'hui", data: data.filter((task) => task.status === 'DueSoon') },
    { title: 'Cette semaine', data: data.filter((task) => task.status === 'Ok') },
  ].filter((section) => section.data.length > 0);
  const nothingToday = !data.some((task) => task.status !== 'Ok');

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[screenStyles.list, data.length === 0 && { flex: 1 }]}
      refreshControl={<RefreshControl {...refresh} />}>
      {data.length === 0 ? (
        <Empty icon="checkmark-circle-outline" title="Rien à faire aujourd'hui 🌱" hint="Ni cette semaine, d'ailleurs." />
      ) : (
        nothingToday && <NothingToday />
      )}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionTitle>{section.title}</SectionTitle>
          <Group>
            {section.data.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                leavesOnDone
                onPress={() => router.push(targetHref(task))}
                onDone={() => markDone(task)}
              />
            ))}
          </Group>
        </View>
      ))}
    </ScrollView>
  );
}

/** Rien de dû, mais des tâches dans la semaine : on le dit avant de les montrer. */
function NothingToday() {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Card style={styles.nothingToday}>
      <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
      <Text style={styles.nothingTodayText}>Rien à faire aujourd&apos;hui 🌱</Text>
    </Card>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  section: { gap: spacing.sm },
  nothingToday: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nothingTodayText: { ...typography.subtitle, color: colors.text },
}));
