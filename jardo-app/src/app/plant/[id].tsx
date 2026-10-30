import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useDeletePlant, usePlant, useSetPlantArchived } from '@/api/queries';
import type { Plant } from '@/api/types';
import { ArchivedBadge, plantQuantity } from '@/components/items';
import { DetailScreen, Fact, JournalSection, ManageSection, TasksSection, useDetailStyles } from '@/components/sections';
import { ErrorView, Loading } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { formatLongDate } from '@/lib/dates';
import { targetLabel } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

export default function PlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);

  if (plant.isPending) return <Loading />;
  if (plant.error) return <ErrorView error={plant.error} onRetry={plant.refetch} />;
  return <PlantDetail plant={plant.data} />;
}

function PlantDetail({ plant }: { plant: Plant }) {
  const styles = useDetailStyles();
  const archive = useSetPlantArchived();
  const remove = useDeletePlant();
  const target = {
    spaceId: plant.spaceId,
    zoneId: plant.zoneId,
    itemId: plant.id,
    itemKind: 'Plant' as const,
    label: targetLabel({ itemName: plant.name, zoneName: plant.zoneName, spaceName: plant.spaceName }),
  };

  const toggleArchive = () =>
    archive.mutate(
      { id: plant.id, archived: !plant.isArchived },
      { onError: (e) => notify("La plante n'a pas été modifiée", e.message) },
    );

  const deletePlant = async () => {
    const ok = await confirm(`Supprimer « ${plant.name} » ?`, 'Ses tâches et son journal seront supprimés.');
    if (ok) {
      remove.mutate(plant.id, { onSuccess: goBack, onError: (e) => notify("La plante n'a pas été supprimée", e.message) });
    }
  };

  const keyFacts = [plant.species, plant.variety, plantQuantity(plant)].filter(Boolean).join(' · ');

  return (
    <DetailScreen
      header={
        <>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">
              {plant.name}
            </Text>
            <Text style={styles.subtitle}>{[plant.zoneName, plant.spaceName].filter(Boolean).join(' · ')}</Text>
          </View>
          {keyFacts !== '' && <Text style={styles.fact}>{keyFacts}</Text>}
          {plant.isArchived && <ArchivedBadge />}
        </>
      }
      tabs={[
        { key: 'tasks', label: 'Tâches', render: () => <TasksSection target={target} /> },
        { key: 'journal', label: 'Journal', render: () => <JournalSection target={target} /> },
        {
          key: 'info',
          label: 'Infos',
          render: () => (
            <>
              <View style={styles.facts}>
                <Fact label="Espèce" value={plant.species} />
                <Fact label="Variété" value={plant.variety} />
                <Fact label="Quantité" value={plantQuantity(plant)} />
                <Fact label="Semis" value={plant.sownDate && formatLongDate(plant.sownDate)} />
                <Fact label="Plantation" value={plant.plantedDate && formatLongDate(plant.plantedDate)} />
              </View>
              <ManageSection
                onEdit={() => router.push({ pathname: '/plant/form', params: { id: String(plant.id) } })}
                archive={{ archived: plant.isArchived, onToggle: toggleArchive, loading: archive.isPending }}
                onDelete={deletePlant}
                deleting={remove.isPending}
              />
            </>
          ),
        },
      ]}
    />
  );
}
