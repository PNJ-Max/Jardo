import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useDeleteZone, useSpace, useZone } from '@/api/queries';
import type { Space, Zone } from '@/api/types';
import { ItemsSection } from '@/components/items-section';
import { DetailScreen, JournalSection, ManageSection, TasksSection, useDetailStyles } from '@/components/sections';
import { ErrorView, Loading } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { goBack } from '@/lib/navigation';

export default function ZoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useZone(id);

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
    <DetailScreen
      header={
        <View style={styles.headerText}>
          <Text style={styles.title}>{zone.name}</Text>
          <Text style={styles.subtitle}>
            Zone de {space.name} · {zone.itemCount} {zone.itemCount > 1 ? 'éléments' : 'élément'}
          </Text>
        </View>
      }
      tabs={[
        { key: 'tasks', label: 'Tâches', render: () => <TasksSection target={target} /> },
        {
          key: 'items',
          label: space.kind === 'Firewood' ? 'Tas de bois' : 'Plantes',
          render: () => <ItemsSection scope={{ spaceId: space.id, spaceKind: space.kind, zoneId: zone.id }} />,
        },
        { key: 'journal', label: 'Journal', render: () => <JournalSection target={target} /> },
        {
          key: 'info',
          label: 'Infos',
          render: () => (
            <>
              <Text style={zone.description ? styles.description : styles.subtitle}>
                {zone.description ?? 'Pas de description.'}
              </Text>
              <ManageSection
                onEdit={() => router.push({ pathname: '/zone/form', params: { id: String(zone.id) } })}
                onDelete={deleteZone}
                deleting={remove.isPending}
              />
            </>
          ),
        },
      ]}
    />
  );
}
