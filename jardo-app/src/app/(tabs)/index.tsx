import { FlatList } from 'react-native';

import { usePlantsNeedingWater, useWaterPlant } from '@/api/queries';
import { PlantRow } from '@/components/plants';
import { Empty, ErrorView, Loading, screenStyles } from '@/components/ui';
import { notify } from '@/lib/confirm';

/**
 * L'écran d'accueil, et la raison d'être de l'app : ce qu'il faut arroser maintenant.
 * L'API trie déjà par urgence, les plus en retard en premier.
 */
export default function ToWaterScreen() {
  const { data, error, isPending, refetch, isRefetching } = usePlantsNeedingWater();
  const water = useWaterPlant();

  if (isPending) return <Loading />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      style={screenStyles.screen}
      contentContainerStyle={[screenStyles.list, data.length === 0 && { flex: 1 }]}
      data={data}
      keyExtractor={(plant) => String(plant.id)}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => (
        <PlantRow
          plant={item}
          onWater={() =>
            water.mutate(
              { plantId: item.id },
              { onError: (e) => notify("L'arrosage n'a pas été enregistré", e.message) },
            )
          }
        />
      )}
      ListEmptyComponent={<Empty icon="checkmark-circle" title="Tout est arrosé 🌱" hint="Rien à faire pour aujourd'hui." />}
    />
  );
}
