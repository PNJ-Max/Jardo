import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { usePlants, useWoodPiles } from '@/api/queries';
import type { SpaceKind, Zone } from '@/api/types';
import { PlantRow, WoodPileRow } from '@/components/items';
import { Button, SectionTitle } from '@/components/ui';
import { createStyles, useTheme } from '@/theme';

type Scope = { spaceId: number; spaceKind: SpaceKind; zoneId?: number };

/**
 * Les éléments d'un espace, groupés par zone, ou ceux d'une zone. Le type d'espace dit lesquels :
 * des tas de bois au bois de chauffage, des plantes partout ailleurs.
 */
export function ItemsSection({ scope, zones }: { scope: Scope; zones?: Zone[] }) {
  return scope.spaceKind === 'Firewood' ? (
    <WoodPilesSection scope={scope} zones={zones} />
  ) : (
    <PlantsSection scope={scope} zones={zones} />
  );
}

type Groupable = { id: number; zoneId: number | null; isArchived: boolean };

/** Dans l'ordre des zones, puis les éléments sans zone. Sans zones, un seul groupe sans titre. */
function groupByZone<T extends Groupable>(items: T[], zones: Zone[] | undefined) {
  if (!zones?.length) return [{ title: null, items }];

  return [
    ...zones.map((zone) => ({ title: zone.name, items: items.filter((item) => item.zoneId === zone.id) })),
    { title: 'Sans zone', items: items.filter((item) => item.zoneId === null) },
  ].filter((group) => group.items.length > 0);
}

/** Archivés compris : la section les montre à la demande, et un espace archivé garde ses éléments. */
function itemFilter({ spaceId, zoneId }: Scope) {
  return zoneId ? { zoneId, includeArchived: true } : { spaceId, includeArchived: true };
}

function addParams({ spaceId, zoneId }: Scope) {
  return { spaceId: String(spaceId), ...(zoneId ? { zoneId: String(zoneId) } : {}) };
}

function PlantsSection({ scope, zones }: { scope: Scope; zones?: Zone[] }) {
  const plants = usePlants(itemFilter(scope));

  return (
    <Groups
      title="Plantes"
      query={plants}
      zones={zones}
      emptyText="Aucune plante pour l'instant."
      renderItem={(plant) => <PlantRow key={plant.id} plant={plant} onPress={() => router.push(`/plant/${plant.id}`)} />}
      addTitle="Ajouter une plante"
      onAdd={() => router.push({ pathname: '/plant/form', params: addParams(scope) })}
    />
  );
}

function WoodPilesSection({ scope, zones }: { scope: Scope; zones?: Zone[] }) {
  const piles = useWoodPiles(itemFilter(scope));

  return (
    <Groups
      title="Tas de bois"
      query={piles}
      zones={zones}
      emptyText="Aucun tas de bois pour l'instant."
      renderItem={(pile) => <WoodPileRow key={pile.id} pile={pile} onPress={() => router.push(`/wood-pile/${pile.id}`)} />}
      addTitle="Ajouter un tas de bois"
      onAdd={() => router.push({ pathname: '/wood-pile/form', params: addParams(scope) })}
    />
  );
}

type GroupsProps<T extends Groupable> = {
  title: string;
  query: { data: T[] | undefined; error: Error | null; isPending: boolean };
  zones?: Zone[];
  emptyText: string;
  renderItem: (item: T) => ReactNode;
  addTitle: string;
  onAdd: () => void;
};

function Groups<T extends Groupable>({ title, query, zones, emptyText, renderItem, addTitle, onAdd }: GroupsProps<T>) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = query.data?.filter((item) => item.isArchived).length ?? 0;
  const shown = showArchived ? query.data : query.data?.filter((item) => !item.isArchived);

  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {query.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : query.error ? (
        <Text style={styles.error}>{query.error.message}</Text>
      ) : !shown?.length ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        groupByZone(shown, zones).map((group) => (
          <View key={group.title ?? 'all'} style={styles.group}>
            {group.title && <Text style={styles.groupTitle}>{group.title}</Text>}
            {group.items.map(renderItem)}
          </View>
        ))
      )}
      {archivedCount > 0 && (
        <Button
          title={showArchived ? 'Masquer les archivés' : `Voir les archivés (${archivedCount})`}
          icon="archive-outline"
          variant="secondary"
          onPress={() => setShowArchived(!showArchived)}
        />
      )}
      <Button title={addTitle} icon="add" variant="secondary" onPress={onAdd} />
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  section: { gap: spacing.sm },
  group: { gap: spacing.sm },
  groupTitle: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  empty: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
}));
