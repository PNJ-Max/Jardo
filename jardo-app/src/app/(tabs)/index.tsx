import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useGarden, useGardenMap, useSpaces } from '@/api/queries';
import { GardenMapView } from '@/components/map/garden-map';
import { SpaceRow } from '@/components/spaces';
import { Button, Empty, ErrorView, Fab, Loading, screenStyles, type IconName } from '@/components/ui';
import { usePullToRefresh } from '@/lib/refresh';
import { isDrawn } from '@/map/scenes';
import { createStyles, useTheme } from '@/theme';

/**
 * L'accueil : la carte du jardin quand elle est configurée, sinon la liste des espaces. Un
 * bouton de l'en-tête passe de l'une à l'autre ; la liste reste la voie des lecteurs d'écran.
 */
export default function GardenScreen() {
  const styles = useStyles();
  const map = useGardenMap();
  const [listChosen, setListChosen] = useState(false);
  const layout = map.data?.layout ?? null;
  const drawn = isDrawn(layout);

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              {drawn && (
                <HeaderButton
                  icon={listChosen ? 'map-outline' : 'list-outline'}
                  label={listChosen ? 'Afficher la carte' : 'Afficher la liste des espaces'}
                  onPress={() => setListChosen(!listChosen)}
                />
              )}
              <HeaderButton icon="settings-outline" label="Réglages" onPress={() => router.push('/settings')} />
            </View>
          ),
        }}
      />
      {map.isPending ? (
        <Loading />
      ) : map.error ? (
        <ErrorView error={map.error} onRetry={map.refetch} />
      ) : drawn && !listChosen ? (
        <GardenMapView map={map.data} layout={layout} />
      ) : (
        <SpaceList />
      )}
    </>
  );
}

function HeaderButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={24} color={colors.primary} />
    </Pressable>
  );
}

function SpaceList() {
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
          <Empty title="Votre jardin est vide" hint="Ajoutez un premier espace : un potager, un verger, un tas de bois…">
            <Button title="Ajouter un espace" icon="add" onPress={() => router.push('/space/form')} />
          </Empty>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm },
  headerButton: { paddingHorizontal: spacing.sm },
}));
