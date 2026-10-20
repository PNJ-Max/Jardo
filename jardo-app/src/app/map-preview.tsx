import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MapViewport } from '@/components/map/map-viewport';
import { ChipSelect } from '@/components/ui';
import { countryHouseScene } from '@/map/country-house';
import type { MapScheme, Scene, SlotKey } from '@/map/layouts';
import { terracedLongScene } from '@/map/terraced-long';
import { createStyles, useTheme } from '@/theme';

type Engine = 'svg' | 'skia';
type Layout = 'terraced-long' | 'country-house';

const layouts: Record<Layout, (scheme: MapScheme) => Scene> = {
  'terraced-long': terracedLongScene,
  'country-house': countryHouseScene,
};

const layoutOptions: { value: Layout; label: string }[] = [
  { value: 'terraced-long', label: 'Mitoyenne' },
  { value: 'country-house', label: 'Campagne' },
];

// Dans la carte v1, ce seront les noms des espaces et des zones affectés aux emplacements.
const slotLabels: Record<SlotKey, string> = {
  orchard: 'Verger',
  'small-fruit': 'Petits fruits',
  vegetable: 'Potager',
  'bed-1': 'Carré 1',
  'bed-2': 'Carré 2',
  'bed-3': 'Carré 3',
  'bed-4': 'Carré 4',
  greenhouse: 'Serre',
  firewood: 'Bois de chauffage',
};

const engineOptions: { value: Engine; label: string }[] = [
  { value: 'svg', label: 'SVG' },
  { value: 'skia', label: 'Skia' },
];

/**
 * Aperçu de la carte du jardin, avant qu'elle ne remplace la liste de l'onglet Jardin : la
 * scène de chaque modèle, et le choix du moteur de rendu le temps de l'essai technique.
 */
export default function MapPreviewScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const [layout, setLayout] = useState<Layout>('terraced-long');
  const scene = layouts[layout](theme.scheme);
  const [engine, setEngine] = useState<Engine>('svg');
  const [selected, setSelected] = useState<SlotKey | null>(null);
  const [recenter, setRecenter] = useState(0);

  return (
    <GestureHandlerRootView style={[styles.screen, { backgroundColor: scene.background }]}>
      <View style={styles.toolbar}>
        <ChipSelect
          label="Modèle"
          options={layoutOptions}
          value={layout}
          onChange={(value) => {
            setLayout(value);
            setSelected(null);
          }}
        />
        <ChipSelect label="Rendu" options={engineOptions} value={engine} onChange={setEngine} />
      </View>
      <View style={styles.map}>
        <MapViewport
          scene={scene}
          labels={slotLabels}
          engine={engine}
          selected={selected}
          onSelect={setSelected}
          recenter={recenter}
        />
        <Pressable
          onPress={() => setRecenter((n) => n + 1)}
          accessibilityRole="button"
          accessibilityLabel="Recentrer la carte"
          style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
          <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
      <View style={styles.status} pointerEvents="none">
        <Text style={selected ? styles.key : styles.hint}>
          {selected ?? 'Touchez un emplacement. Pincez pour zoomer.'}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.sm,
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
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
  status: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    alignItems: 'center',
  },
  key: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.primaryText,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
}));
