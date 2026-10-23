import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSpaces, useZonesOf } from '@/api/queries';
import type { GardenMap, GardenMapSlot } from '@/api/types';
import { mappedVegetableGardens, offMapTargets } from '@/lib/garden-map';
import { spaceKinds } from '@/lib/garden';
import { SLOT_KEYS, type SlotKey } from '@/map/layouts';
import { sceneOf, type DrawnLayout } from '@/map/scenes';
import { createStyles, useTheme } from '@/theme';

import { MapViewport } from './map-viewport';

const isSlotKey = (key: string): key is SlotKey => (SLOT_KEYS as readonly string[]).includes(key);

/**
 * La carte du jardin : chaque emplacement occupé ouvre son espace ou sa zone, et la bande
 * « Hors carte » donne accès à ce qui n'a pas d'emplacement.
 */
export function GardenMapView({ map, layout }: { map: GardenMap; layout: DrawnLayout }) {
  const theme = useTheme();
  const styles = useStyles();
  const scene = useMemo(() => sceneOf(layout, theme.scheme), [layout, theme.scheme]);
  const [recenter, setRecenter] = useState(0);

  const { slots, labels, free } = useMemo(() => {
    const occupied = new Map<SlotKey, GardenMapSlot>();
    for (const slot of map.slots) if (isSlotKey(slot.slotKey)) occupied.set(slot.slotKey, slot);
    return {
      slots: occupied,
      labels: Object.fromEntries([...occupied].map(([key, slot]) => [key, slot.zoneName ?? slot.spaceName])),
      free: SLOT_KEYS.filter((key) => !occupied.has(key)),
    };
  }, [map.slots]);

  // Un emplacement libre, comme le décor, ne fait rien.
  const open = useCallback(
    (key: SlotKey | null) => {
      const slot = key && slots.get(key);
      if (slot) router.push(slot.zoneId !== null ? `/zone/${slot.zoneId}` : `/space/${slot.spaceId}`);
    },
    [slots],
  );

  return (
    <GestureHandlerRootView style={[styles.screen, { backgroundColor: scene.background }]}>
      <View style={styles.map}>
        <MapViewport scene={scene} labels={labels} free={free} selected={null} onSelect={open} recenter={recenter} />
        <Pressable
          onPress={() => setRecenter((n) => n + 1)}
          accessibilityRole="button"
          accessibilityLabel="Recentrer la carte"
          style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
          <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
      <OffMapBand map={map} />
    </GestureHandlerRootView>
  );
}

function OffMapBand({ map }: { map: GardenMap }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const spaces = useSpaces(true);
  const zones = useZonesOf(mappedVegetableGardens(map));
  const targets = spaces.data ? offMapTargets(map, spaces.data, zones) : [];

  if (targets.length === 0) return null;

  return (
    <View style={styles.band}>
      <Text style={styles.bandTitle}>Hors carte</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {targets.map((target) => (
          <Pressable
            key={target.key}
            onPress={() => router.push(target.href)}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir ${target.spaceName ? `${target.name}, ${target.spaceName}` : target.name}`}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
            <Ionicons name={spaceKinds[target.kind].icon} size={16} color={colors.primary} />
            <Text style={styles.chipText} numberOfLines={1}>
              {target.name}
              {target.spaceName && <Text style={styles.chipContext}> · {target.spaceName}</Text>}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  screen: { flex: 1 },
  map: { flex: 1 },
  round: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  band: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  bandTitle: {
    ...typography.caption,
    fontFamily: fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
  },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  chipContext: { fontFamily: fonts.body, color: colors.textMuted },
}));
