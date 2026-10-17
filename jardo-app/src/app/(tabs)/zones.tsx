import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Text, View } from 'react-native';

import { useZones } from '@/api/queries';
import type { Zone } from '@/api/types';
import { Card, Empty, ErrorView, Fab, Loading, screenStyles } from '@/components/ui';
import { createStyles, useTheme } from '@/theme';

export default function ZonesScreen() {
  const { data, error, isPending, refetch, isRefetching } = useZones();

  if (isPending) return <Loading />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <View style={screenStyles.screen}>
      <FlatList
        contentContainerStyle={[screenStyles.list, data.length === 0 && { flex: 1 }]}
        data={data}
        keyExtractor={(zone) => String(zone.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => <ZoneRow zone={item} />}
        ListEmptyComponent={<Empty icon="grid-outline" title="Aucune zone" hint="Créez votre premier carré de potager." />}
      />
      <Fab onPress={() => router.push('/zone/form')} />
    </View>
  );
}

function ZoneRow({ zone }: { zone: Zone }) {
  const { colors, watering } = useTheme();
  const styles = useStyles();
  const needsWater = zone.plantsNeedingWater > 0;

  return (
    <Card onPress={() => router.push(`/zone/${zone.id}`)} style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.name}>{zone.name}</Text>
        <Text style={styles.meta}>
          {zone.plantCount} plante{zone.plantCount > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Le voyant de zone : le compteur calculé par l'API, sans charger les plantes. */}
      {needsWater ? (
        <View style={styles.counter}>
          <Ionicons name="water" size={14} color={colors.primaryText} />
          <Text style={styles.counterText}>{zone.plantsNeedingWater}</Text>
        </View>
      ) : (
        <Ionicons name="checkmark-circle" size={24} color={watering.Ok.color} />
      )}
    </Card>
  );
}

const useStyles = createStyles(({ colors, watering, fonts, typography, spacing }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  name: { ...typography.subtitle, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: watering.Overdue.color,
  },
  counterText: { ...typography.caption, fontFamily: fonts.bodySemiBold, color: colors.primaryText },
}));
