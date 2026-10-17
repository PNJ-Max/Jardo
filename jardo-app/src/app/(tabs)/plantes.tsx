import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';

import { usePlants } from '@/api/queries';
import { PlantRow } from '@/components/plants';
import { Empty, ErrorView, Fab, Loading, screenStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function PlantsScreen() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data, error, isPending, refetch, isRefetching } = usePlants({ includeArchived });

  return (
    <View style={screenStyles.screen}>
      <View style={styles.filter}>
        <Text style={styles.filterLabel}>Afficher les plantes archivées</Text>
        <Switch
          value={includeArchived}
          onValueChange={setIncludeArchived}
          trackColor={{ true: colors.primary }}
        />
      </View>

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <FlatList
          contentContainerStyle={[screenStyles.list, data.length === 0 && { flex: 1 }]}
          data={data}
          keyExtractor={(plant) => String(plant.id)}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <PlantRow plant={item} />}
          ListEmptyComponent={<Empty icon="leaf-outline" title="Aucune plante" hint="Ajoutez-en une avec le bouton +." />}
        />
      )}

      <Fab onPress={() => router.push('/plante/form')} />
    </View>
  );
}

const styles = StyleSheet.create({
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  filterLabel: { fontSize: 15, color: colors.text },
});
