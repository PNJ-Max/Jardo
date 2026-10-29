import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, View } from 'react-native';

import { useJournal, useSpaces } from '@/api/queries';
import type { JournalEntry, JournalEntryKind } from '@/api/types';
import { JournalEntryRow } from '@/components/journal';
import { KindIcon } from '@/components/pictograms';
import { Button, ChipSelect, Empty, ErrorView, Loading, screenStyles, SectionTitle } from '@/components/ui';
import { formatDayHeading } from '@/lib/dates';
import { entryKinds } from '@/lib/garden';
import { usePullToRefresh } from '@/lib/refresh';
import { spacing } from '@/theme';

/** Regroupe par jour des entrées déjà triées du plus récent au plus ancien par le service. */
function byDay(entries: JournalEntry[]) {
  const days: { date: string; data: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last?.date === entry.date) last.data.push(entry);
    else days.push({ date: entry.date, data: [entry] });
  }
  return days;
}

const allSpaces = 'all';
const allKinds = 'all';

const kindOptions: { value: JournalEntryKind | typeof allKinds; label: string }[] = [
  { value: allKinds, label: 'Toutes' },
  ...(Object.keys(entryKinds) as JournalEntryKind[]).map((kind) => ({
    value: kind,
    label: entryKinds[kind].label,
    icon: <KindIcon kind={kind} size={24} />,
  })),
];

/** La chronologie de tout le jardin, la plus récente d'abord, filtrable par espace et par type. */
export default function JournalScreen() {
  const [spaceId, setSpaceId] = useState(allSpaces);
  const [kind, setKind] = useState<JournalEntryKind | typeof allKinds>(allKinds);
  // Les espaces archivés gardent leur journal : on peut encore le consulter.
  const spaces = useSpaces(true);
  const { data, error, isPending, refetch } = useJournal({
    spaceId: spaceId === allSpaces ? undefined : spaceId,
    kinds: kind === allKinds ? undefined : [kind],
  });
  const refresh = usePullToRefresh(refetch);
  const filtered = spaceId !== allSpaces || kind !== allKinds;

  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <SectionList
      style={screenStyles.screen}
      contentContainerStyle={[screenStyles.list, !data?.length && { flexGrow: 1 }]}
      sections={data ? byDay(data) : []}
      keyExtractor={(entry) => String(entry.id)}
      stickySectionHeadersEnabled={false}
      {...refresh}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <ChipSelect
            label="Espace"
            scrollable
            options={[
              { value: allSpaces, label: 'Tous' },
              ...(spaces.data ?? []).map((space) => ({ value: space.id, label: space.name })),
            ]}
            value={spaceId}
            onChange={setSpaceId}
          />
          <ChipSelect label="Intervention" scrollable options={kindOptions} value={kind} onChange={setKind} />
        </View>
      }
      renderSectionHeader={({ section }) => <SectionTitle>{formatDayHeading(section.date)}</SectionTitle>}
      renderItem={({ item }) => (
        <JournalEntryRow
          entry={item}
          onPress={() => router.push({ pathname: '/entry/form', params: { id: String(item.id) } })}
        />
      )}
      ListEmptyComponent={
        isPending ? (
          <Loading />
        ) : filtered ? (
          <Empty title="Rien de noté" hint="Aucune intervention ne correspond à ces filtres.">
            <Button
              title="Effacer les filtres"
              variant="secondary"
              onPress={() => {
                setSpaceId(allSpaces);
                setKind(allKinds);
              }}
            />
          </Empty>
        ) : (
          <Empty
            title="Le journal est vide"
            hint="Les interventions notées depuis la fiche d'un espace, et les tâches faites, s'afficheront ici.">
            <Button title="Ouvrir le jardin" variant="secondary" onPress={() => router.push('/')} />
          </Empty>
        )
      }
    />
  );
}
