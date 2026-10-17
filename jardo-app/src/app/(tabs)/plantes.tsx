import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Switch, Text, View } from 'react-native';

import { usePlants } from '@/api/queries';
import { PlantRow } from '@/components/plants';
import { Empty, ErrorView, Fab, Loading, screenStyles } from '@/components/ui';
import { createStyles, useTheme } from '@/theme';

export default function PlantsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
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

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  filterLabel: { ...typography.body, color: colors.text },
}));
