import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { useDeleteZone, useSpace, useZone } from '@/api/queries';
import type { Space, Zone } from '@/api/types';
import { ItemsSection } from '@/components/items-section';
import { JournalSection, ManageSection, TasksSection, useDetailStyles } from '@/components/sections';
import { ErrorView, Loading } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { goBack } from '@/lib/navigation';

export default function ZoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useZone(Number(id));

  if (zone.isPending) return <Loading />;
  if (zone.error) return <ErrorView error={zone.error} onRetry={zone.refetch} />;
  return <ZoneInSpace zone={zone.data} />;
}

/** Le type de l'espace dit quels éléments la zone contient : on attend de le connaître. */
function ZoneInSpace({ zone }: { zone: Zone }) {
  const space = useSpace(zone.spaceId);

  if (space.isPending) return <Loading />;
  if (space.error) return <ErrorView error={space.error} onRetry={space.refetch} />;
  return <ZoneDetail zone={zone} space={space.data} />;
}

function ZoneDetail({ zone, space }: { zone: Zone; space: Space }) {
  const styles = useDetailStyles();
  const remove = useDeleteZone();
  const target = { spaceId: space.id, zoneId: zone.id, label: `${zone.name} · ${space.name}` };

  const deleteZone = async () => {
    const ok = await confirm(
      `Supprimer « ${zone.name} » ?`,
      'Ses tâches et son journal seront supprimés. Une zone qui contient encore des éléments ne peut pas être supprimée.',
    );
    if (ok) {
      remove.mutate(zone.id, { onSuccess: goBack, onError: (e) => notify("La zone n'a pas été supprimée", e.message) });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: zone.name }} />

      <View style={styles.header}>
        <Text style={styles.title}>{zone.name}</Text>
        <Text style={styles.subtitle}>Zone de {space.name}</Text>
        {zone.description && <Text style={styles.description}>{zone.description}</Text>}
      </View>

      <TasksSection target={target} />
      <ItemsSection scope={{ spaceId: space.id, spaceKind: space.kind, zoneId: zone.id }} />
      <JournalSection target={target} />

      <ManageSection
        onEdit={() => router.push({ pathname: '/zone/form', params: { id: String(zone.id) } })}
        onDelete={deleteZone}
        deleting={remove.isPending}
      />
    </ScrollView>
  );
}
