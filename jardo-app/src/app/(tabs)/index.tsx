import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { useGarden, useSpaces } from '@/api/queries';
import { SpaceRow } from '@/components/spaces';
import { Button, Empty, ErrorView, Fab, Loading, screenStyles } from '@/components/ui';
import { usePullToRefresh } from '@/lib/refresh';
import { createStyles } from '@/theme';

/** L'accueil : le jardin et ses espaces. La carte isométrique prendra sa place après le MVP. */
export default function GardenScreen() {
  const styles = useStyles();
  const garden = useGarden();
  const spaces = useSpaces(true);
  const [showArchived, setShowArchived] = useState(false);
  const refresh = usePullToRefresh(() => Promise.all([garden.refetch(), spaces.refetch()]));

  if (spaces.isPending) return <Loading />;
  if (spaces.error) return <ErrorView error={spaces.error} onRetry={spaces.refetch} />;

  const archivedCount = spaces.data.filter((space) => space.isArchived).length;
  const shown = showArchived ? spaces.data : spaces.data.filter((space) => !space.isArchived);

  return (
    <View style={screenStyles.screen}>
      <FlatList
        contentContainerStyle={[screenStyles.list, shown.length === 0 && { flexGrow: 1 }]}
        data={shown}
        keyExtractor={(space) => String(space.id)}
        {...refresh}
        ListHeaderComponent={garden.data ? <Text style={styles.gardenName}>{garden.data.name}</Text> : null}
        renderItem={({ item }) => <SpaceRow space={item} onPress={() => router.push(`/space/${item.id}`)} />}
        ListEmptyComponent={
          <Empty
            icon="leaf-outline"
            title="Votre jardin est vide"
            hint="Ajoutez un premier espace : un potager, un verger, un tas de bois…"
          />
        }
        ListFooterComponent={
          archivedCount > 0 ? (
            <Button
              title={showArchived ? 'Masquer les espaces archivés' : `Voir les espaces archivés (${archivedCount})`}
              icon="archive-outline"
              variant="secondary"
              onPress={() => setShowArchived(!showArchived)}
              style={styles.archivedToggle}
            />
          ) : null
        }
      />
      <Fab onPress={() => router.push('/space/form')} />
    </View>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  gardenName: { ...typography.title, color: colors.text, marginBottom: spacing.sm },
  archivedToggle: { marginTop: spacing.sm },
}));
