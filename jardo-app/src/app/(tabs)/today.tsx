import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { SectionList, Text } from 'react-native';

import { useDueTasks } from '@/api/queries';
import { TaskRow, useMarkDone } from '@/components/tasks';
import { Card, Empty, ErrorView, Loading, screenStyles, SectionTitle } from '@/components/ui';
import { targetHref } from '@/lib/garden';
import { usePullToRefresh } from '@/lib/refresh';
import { createStyles, useTheme } from '@/theme';

/**
 * Tout ce qui est à faire au jardin, toutes catégories. L'API renvoie les tâches de la semaine,
 * les plus en retard d'abord ; leur statut suffit à les ranger dans les trois sections.
 */
export default function TodayScreen() {
  const { data, error, isPending, refetch } = useDueTasks('Week');
  const { markDone } = useMarkDone();
  const refresh = usePullToRefresh(refetch);

  if (isPending) return <Loading />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const sections = [
    { title: 'En retard', data: data.filter((task) => task.status === 'Overdue') },
    { title: "Aujourd'hui", data: data.filter((task) => task.status === 'DueSoon') },
    { title: 'Cette semaine', data: data.filter((task) => task.status === 'Ok') },
  ].filter((section) => section.data.length > 0);
  const nothingToday = !data.some((task) => task.status !== 'Ok');

  return (
    <SectionList
      style={screenStyles.screen}
      contentContainerStyle={[screenStyles.list, data.length === 0 && { flex: 1 }]}
      sections={sections}
      keyExtractor={(task) => String(task.id)}
      stickySectionHeadersEnabled={false}
      {...refresh}
      ListHeaderComponent={nothingToday && data.length > 0 ? <NothingToday /> : null}
      renderSectionHeader={({ section }) => <SectionTitle>{section.title}</SectionTitle>}
      renderItem={({ item }) => (
        <TaskRow task={item} onPress={() => router.push(targetHref(item))} onDone={() => markDone(item)} />
      )}
      ListEmptyComponent={
        <Empty icon="checkmark-circle-outline" title="Rien à faire aujourd'hui 🌱" hint="Ni cette semaine, d'ailleurs." />
      }
    />
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
  nothingToday: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nothingTodayText: { ...typography.subtitle, color: colors.text },
}));
