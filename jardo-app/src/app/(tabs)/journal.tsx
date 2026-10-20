import { router } from 'expo-router';
import { SectionList } from 'react-native';

import { useJournal } from '@/api/queries';
import type { JournalEntry } from '@/api/types';
import { JournalEntryRow } from '@/components/journal';
import { Empty, ErrorView, Loading, screenStyles, SectionTitle } from '@/components/ui';
import { formatDayHeading } from '@/lib/dates';
import { usePullToRefresh } from '@/lib/refresh';

/** Regroupe par jour des entrées déjà triées du plus récent au plus ancien par l'API. */
function byDay(entries: JournalEntry[]) {
  const days: { date: string; data: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last?.date === entry.date) last.data.push(entry);
    else days.push({ date: entry.date, data: [entry] });
  }
  return days;
}

/** La chronologie de tout le jardin, la plus récente d'abord. */
export default function JournalScreen() {
  const { data, error, isPending, refetch } = useJournal();
  const refresh = usePullToRefresh(refetch);

  if (isPending) return <Loading />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <SectionList
      style={screenStyles.screen}
      contentContainerStyle={[screenStyles.list, data.length === 0 && { flex: 1 }]}
      sections={byDay(data)}
      keyExtractor={(entry) => String(entry.id)}
      stickySectionHeadersEnabled={false}
      {...refresh}
      renderSectionHeader={({ section }) => <SectionTitle>{formatDayHeading(section.date)}</SectionTitle>}
      renderItem={({ item }) => (
        <JournalEntryRow
          entry={item}
          onPress={() => router.push({ pathname: '/entry/form', params: { id: String(item.id) } })}
        />
      )}
      ListEmptyComponent={
        <Empty
          icon="journal-outline"
          title="Le journal est vide"
          hint="Les interventions notées au jardin, et les tâches faites, s'afficheront ici."
        />
      }
    />
  );
}
